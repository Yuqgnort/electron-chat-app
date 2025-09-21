import { IConvPartRepo } from "../domain/conv-part/repo";
import { IConvRepo } from "../domain/conv/repo";
import { IMsgEntity, TMsgDirection } from "../domain/msg/entity";
import { IMsgRepo } from "../domain/msg/repo";
import { IPendingMsgRepo } from "../domain/pending-msg/repo";
import { IUserEntity } from "../domain/user/entity";
import { IUserRepo } from "../domain/user/repo";
import { withErrorHandling } from "./error";
import { TIntegrationSentEvent } from "./event";
import { IEventBus } from "./eventbus";
import {
  createConvWithParticipants,
  getConvsWithParticipantsByUserId,
  requestAllOnlineUsers,
  requestUsersStatus,
  sendHeartbeat,
  sendMsg,
  startTyping,
  stopTyping,
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
  requestAllOnlineUsers: MapEvent<"users:get_all_online">;
  requestUsersStatus: MapEvent<"status:request">;
  sendHeartbeat: MapEvent<"heartbeat">;
  startTyping: MapEvent<"typing:start">;
  stopTyping: MapEvent<"typing:stop">;
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
      getConvsWithParticipantsByUserId: withErrorHandling(
        async (userId: IUserEntity["id"]) =>
          await getConvsWithParticipantsByUserId(
            repos.msgRepo,
            repos.convRepo,
            repos.userRepo,
            repos.convPartRepo,
            userId
          ),
        "getConvsWithParticipantsByUserId"
      ),
      createConvWithParticipants: withErrorHandling(
        async (
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
        "createConvWithParticipants"
      ),
      getConvByUserIds: withErrorHandling(
        async (userIds: Parameters<typeof getConvByUserIds>[1]) =>
          await getConvByUserIds(repos.convRepo, userIds),
        "getConvByUserIds"
      ),
    },
    msg: {
      sendMessage: withErrorHandling(
        async (payload: Parameters<typeof sendMsg>[5]) =>
          await sendMsg(
            repos.msgRepo,
            repos.pendingMsgRepo,
            eventBus,
            communicationManager,
            transactionManager,
            payload
          ),
        "sendMessage"
      ),
      getMsgsByConvId: withErrorHandling(
        async (
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
        "getMsgsByConvId"
      ),
      getAllMsgs: withErrorHandling(
        async () => await getAllMsgs(repos.msgRepo),
        "getAllMsgs"
      ),
      getAllPendingMsgs: withErrorHandling(
        async () => await getAllPendingMsgs(repos.pendingMsgRepo),
        "getAllPendingMsgs"
      ),
      startTyping: withErrorHandling(
        async (userId: string, conversationId: string) =>
          await startTyping(communicationManager, userId, conversationId),
        "startTyping"
      ),
      stopTyping: withErrorHandling(
        async (userId: string, conversationId: string) =>
          await stopTyping(communicationManager, userId, conversationId),
        "stopTyping"
      ),
    },
    user: {
      getAllUsers: withErrorHandling(
        async () => await getAllUsers(repos.userRepo),
        "getAllUsers"
      ),
      getUserById: withErrorHandling(
        async (id: Parameters<typeof getUserById>[1]) =>
          await getUserById(repos.userRepo, id),
        "getUserById"
      ),
      getAllUsersIgnore: withErrorHandling(
        async (userId: Parameters<typeof getAllUsers>[1]) =>
          await getAllUsers(repos.userRepo, userId),
        "getAllUsersIgnore"
      ),
      requestAllOnlineUsers: withErrorHandling(
        async () => await requestAllOnlineUsers(communicationManager),
        "requestAllOnlineUsers"
      ),
      requestUsersStatus: withErrorHandling(
        async (userIds: string[]) =>
          await requestUsersStatus(communicationManager, userIds),
        "requestUsersStatus"
      ),
      sendHeartbeat: withErrorHandling(
        async (userId: string, timestamp: number) =>
          await sendHeartbeat(communicationManager, userId, timestamp),
        "sendHeartbeat"
      ),
    },
  };
}
