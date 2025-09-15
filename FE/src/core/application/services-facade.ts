import { IConvPartRepo } from "../domain/conv-part/repo";
import { IConvEntity } from "../domain/conv/entity";
import { IConvRepo } from "../domain/conv/repo";
import { IMsgEntity } from "../domain/msg/entity";
import { IMsgRepo } from "../domain/msg/repo";
import { IUserEntity } from "../domain/user/entity";
import { IUserRepo } from "../domain/user/repo";
import { TIntegrationSentEvent } from "./event";
import { IEventBus } from "./eventbus";
import { createConvPart } from "./usecase/conv-part.uc";
import { createConv } from "./usecase/conv.uc";
import { createMsg, getAllMsgs } from "./usecase/msg.uc";
import { getAllUsers, getUserById } from "./usecase/user.uc";

type ExtractPayload<
  T extends { type: string },
  U extends T["type"],
> = T extends { type: U; payload: infer P } ? P : never;

type MapEvent<U extends TIntegrationSentEvent["type"]> = (
  payload: ExtractPayload<TIntegrationSentEvent, U>
) => Promise<void>;

export type TTransactionTable =
  | "conversations"
  | "conversationParts"
  | "messages"
  | "users";

export interface ITransactionManager {
  executeInTransaction<T>(
    tableNames: TTransactionTable[],
    callback: () => Promise<T>
  ): Promise<T>;
}

export interface ICommunicationManager {
  sendMessage: MapEvent<"msg:send">;
}

export function createAppService(
  repos: {
    msgRepo: IMsgRepo;
    convRepo: IConvRepo;
    userRepo: IUserRepo;
    convPartRepo: IConvPartRepo;
  },
  eventBus: IEventBus,
  transactionManager: ITransactionManager,
  communicationManager: ICommunicationManager
) {
  return {
    conv: {
      createConv: async (
        conv: Parameters<typeof createConv>[2],
        userIds: string[]
      ) => {
        await transactionManager.executeInTransaction(
          ["conversations", "conversationParts"],
          async () => {
            const newConv = await createConv(
              repos.convRepo,
              eventBus,
              conv,
              userIds
            );
            await Promise.all(
              userIds.map((userId) =>
                createConvPart(repos.convPartRepo, eventBus, {
                  conversationId: newConv.id,
                  userId,
                })
              )
            );
            return newConv;
          }
        );
      },
      getConvsWithParticipantsByUserId: async (
        userId: IUserEntity["id"]
      ): Promise<
        Array<{
          conversation: IConvEntity;
          otherParticipants: IUserEntity[];
          lastMessage?: IMsgEntity | null;
        }>
      > => {
        const userConvParts =
          await repos.convPartRepo.getConvPartsByUserId(userId);

        const convIds = userConvParts.map((cp) => cp.conversationId);
        if (convIds.length === 0) return [];
        const conversations = await Promise.all(
          convIds.map((convId) => repos.convRepo.getConvById(convId))
        );
        const validConversations = conversations.filter(
          (conv): conv is IConvEntity => conv !== null
        );
        const conversationsWithParticipants = await Promise.all(
          validConversations.map(async (conv) => {
            const convParts = await repos.convPartRepo.getConvPartsByConvId(
              conv.id
            );

            const otherConvParts = convParts.filter(
              (convPart) => convPart.userId !== userId
            );

            const otherParticipants = await Promise.all(
              otherConvParts.map(async (convPart) => {
                const user = await repos.userRepo.findById(convPart.userId);
                return user;
              })
            );

            const validOtherParticipants = otherParticipants.filter(
              (user): user is IUserEntity => user !== null
            );

            const lastMessage = conv.lastMessageId
              ? await repos.msgRepo.findById(conv.lastMessageId)
              : null;

            return {
              conversation: conv,
              otherParticipants: validOtherParticipants,
              lastMessage,
            };
          })
        ).then((res) =>
          res.sort(
            (a, b) =>
              b.conversation.updatedAt.getTime() -
              a.conversation.updatedAt.getTime()
          )
        );
        return conversationsWithParticipants;
      },
      createConvWithParticipants: async (
        conv: Omit<
          IConvEntity,
          "id" | "createdAt" | "updatedAt" | "lastMessageId" | "key"
        >,
        userIds: string[]
      ) => {
        return await transactionManager.executeInTransaction(
          ["conversations", "conversationParts"],
          async () => {
            const newConv = await createConv(
              repos.convRepo,
              eventBus,
              conv,
              userIds
            );
            await Promise.all(
              userIds.map((userId) =>
                createConvPart(repos.convPartRepo, eventBus, {
                  conversationId: newConv.id,
                  userId,
                })
              )
            );
            return newConv;
          }
        );
      },
      getConvByUserIds: async (userIds: IUserEntity["id"][]) =>
        await repos.convRepo.getConvByUserIds(userIds),
    },
    msg: {
      sendMessage: (payload: Parameters<typeof createMsg>[3]) =>
        createMsg(repos.msgRepo, eventBus, communicationManager, payload),
      getMsgsByConvId: async (conversationId: IMsgEntity["conversationId"]) =>
        repos.msgRepo.findAll(),
      getAllMsgs: async () => getAllMsgs(repos.msgRepo),
    },
    user: {
      getAllUsers: () => getAllUsers(repos.userRepo),
      getUserById: (id: IUserEntity["id"]) => getUserById(repos.userRepo, id),
      getAllUsersIgnore: async (userId: IUserEntity["id"][]) =>
        getAllUsers(repos.userRepo, userId),
    },
  };
}
