import { IConvPartRepo } from "../domain/conv-part/repo";
import { IConvRepo } from "../domain/conv/repo";
import { IMsgEntity, TMsgDirection } from "../domain/msg/entity";
import { IMsgRepo } from "../domain/msg/repo";
import { IPendingMsgRepo } from "../domain/pending-msg/repo";
import { IUserEntity } from "../domain/user/entity";
import { IUserRepo } from "../domain/user/repo";
import { TIntegrationSentEvent } from "./event";
import { IEventBus } from "./eventbus";
import {
  createConvWithParticipants,
  getConvsWithParticipantsByUserId,
  sendMsg,
} from "./services";
import { getConvByUserIds } from "./usecase/conv.uc";
import { getAllMsgs, getMsgsByConvId } from "./usecase/msg.uc";
import { getAllPendingMsgs } from "./usecase/pending-msg.uc";
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
  | "users"
  | "pendingMessages";

export interface ITransactionManager {
  executeInTransaction<T>(
    tableNames: TTransactionTable[],
    callback: () => Promise<T>
  ): Promise<T>;
}

export interface ICommunicationManager {
  sendMessage: MapEvent<"msg:send">;
  deliverMessage: MapEvent<"msg:delivered">;
}

export function createAppService(
  repos: {
    msgRepo: IMsgRepo;
    convRepo: IConvRepo;
    userRepo: IUserRepo;
    convPartRepo: IConvPartRepo;
    pendingMsgRepo: IPendingMsgRepo;
  },
  eventBus: IEventBus,
  transactionManager: ITransactionManager,
  communicationManager: ICommunicationManager
) {
  return {
    conv: {
      getConvsWithParticipantsByUserId: async (userId: IUserEntity["id"]) =>
        await getConvsWithParticipantsByUserId(
          repos.msgRepo,
          repos.convRepo,
          repos.userRepo,
          repos.convPartRepo,
          userId
        ),
      createConvWithParticipants: async (
        conv: Parameters<typeof createConvWithParticipants>[0],
        userIds: string[]
      ) =>
        await createConvWithParticipants(
          conv,
          userIds,
          repos.convRepo,
          repos.convPartRepo,
          eventBus,
          transactionManager
        ),
      getConvByUserIds: async (
        userIds: Parameters<typeof getConvByUserIds>[1]
      ) => await getConvByUserIds(repos.convRepo, userIds),
    },
    msg: {
      sendMessage: async (payload: Parameters<typeof sendMsg>[5]) =>
        await sendMsg(
          repos.msgRepo,
          repos.pendingMsgRepo,
          eventBus,
          communicationManager,
          transactionManager,
          payload
        ),
      getMsgsByConvId: async (
        conversationId: IMsgEntity["conversationId"],
        limit = 20,
        direction: TMsgDirection,
        cursor: number | null
      ) =>
        await getMsgsByConvId(
          repos.msgRepo,
          conversationId,
          limit,
          direction,
          cursor
        ),
      getAllMsgs: async () => await getAllMsgs(repos.msgRepo),
      getAllPendingMsgs: async () =>
        await getAllPendingMsgs(repos.pendingMsgRepo),
    },
    user: {
      getAllUsers: async () => await getAllUsers(repos.userRepo),
      getUserById: async (id: Parameters<typeof getUserById>[1]) =>
        await getUserById(repos.userRepo, id),
      getAllUsersIgnore: async (userId: Parameters<typeof getAllUsers>[1]) =>
        await getAllUsers(repos.userRepo, userId),
    },
  };
}
