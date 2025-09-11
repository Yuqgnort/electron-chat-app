import { IConvPartRepo } from "../domain/conv-part/repo";
import { IConvRepo } from "../domain/conv/repo";
import { IMsgEntity } from "../domain/msg/entity";
import { IMsgRepo } from "../domain/msg/repo";
import { IUserEntity } from "../domain/user/entity";
import { IUserRepo } from "../domain/user/repo";
import { IEventBus } from "./eventbus";
import { createConvPart } from "./usecase/conv-part.uc";
import { createConv } from "./usecase/conv.uc";
import { createMsg } from "./usecase/msg.uc";
import { getAllUsers, getUserById } from "./usecase/user.uc";

export type TTransactionTable =
  | "conversations"
  | "convParts"
  | "messages"
  | "users";

export interface ITransactionManager {
  executeInTransaction<T>(
    tableNames: TTransactionTable[],
    callback: () => Promise<T>
  ): Promise<T>;
}

export interface ICommunicationManager {
  sendMessage(message: IMsgEntity): Promise<void>;
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
      createConv: async (userIds: string[]) => {
        await transactionManager.executeInTransaction(
          ["conversations", "convParts"],
          async () => {
            const newConv = await createConv(repos.convRepo, eventBus);
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
    },
    msg: {
      sendMessage: (payload: Parameters<typeof createMsg>[3]) =>
        createMsg(repos.msgRepo, eventBus, communicationManager, {
          content: payload.content,
          senderId: payload.senderId,
          conversationId: payload.conversationId,
        }),
    },
    user: {
      getAllUsers: () => getAllUsers(repos.userRepo),
      getUserById: (id: IUserEntity["id"]) => getUserById(repos.userRepo, id),
    },
  };
}
