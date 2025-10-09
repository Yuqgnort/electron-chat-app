import { IConvPartRepo } from "../domain/conv-part/repo";
import { IConvRepo } from "../domain/conv/repo";
import { IMsgEntity, TMsgDirection } from "../domain/msg/entity";
import { IMsgRepo } from "../domain/msg/repo";
import { IPendingMsgRepo } from "../domain/pending-msg/repo";
import { TRankingColection } from "../domain/search/entity";
import { ISearchRepository } from "../domain/search/repo";
import { IUserEntity } from "../domain/user/entity";
import { IUserRepo } from "../domain/user/repo";
import {
  createHealthCheckResult,
  createHealthCheckAlert,
  IHealthCheckResult,
  IHealthCheckAlert,
} from "../domain/health-check/entity";
import { withErrorHandling } from "./error";
import { TIntegrationSentEvent } from "./event";
import { IEventBus } from "./eventbus";
import {
  createConvWithParticipants,
  exactPhraseSearchAndGetRawData,
  getConvsWithParticipantsByUserId,
  prefixSearchAndGetRawData,
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
    searchRepo: ISearchRepository;
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
    search: {
      prefixSearch: withErrorHandling(
        async (
          query: Parameters<typeof prefixSearchAndGetRawData>[4],
          rank?: TRankingColection
        ) => {
          return await prefixSearchAndGetRawData(
            repos.searchRepo,
            repos.msgRepo,
            repos.userRepo,
            transactionManager,
            query,
            rank
          );
        },
        "prefixSearch"
      ),
      searchExactPhrase: withErrorHandling(
        async (
          query: Parameters<typeof prefixSearchAndGetRawData>[4],
          rank?: TRankingColection
        ) =>
          await exactPhraseSearchAndGetRawData(
            repos.searchRepo,
            repos.msgRepo,
            repos.userRepo,
            transactionManager,
            query,
            rank
          ),
        "searchExactPhrase"
      ),
    },
    healthCheck: {
      performHealthCheck: withErrorHandling(
        async (): Promise<IHealthCheckResult> => {
          // Get message count from messages table (IndexedDB)
          const messagesCount = (await repos.msgRepo.countAll()) || 0;

          // Get FTS table count using direct count method
          const ftsCount = await repos.searchRepo.getIndexedMessageCount();

          const result = createHealthCheckResult(messagesCount, ftsCount);

          // Log result
          console.log("=== Health Check Result ===");
          console.log(`Timestamp: ${new Date(result.timestamp).toISOString()}`);
          console.log(`Messages Table Count: ${result.messagesTableCount}`);
          console.log(`FTS Table Count: ${result.ftsTableCount}`);
          console.log(`Has Mismatch: ${result.hasMismatch}`);

          if (result.hasMismatch && result.mismatchDetails) {
            console.warn(`⚠️  MISMATCH DETECTED: ${result.mismatchDetails}`);
          } else {
            console.log("✅ Tables are in sync");
          }
          console.log("===========================");

          return result;
        },
        "performHealthCheck"
      ),

      checkForMismatch: withErrorHandling(
        async (): Promise<IHealthCheckAlert | null> => {
          const messagesCount = (await repos.msgRepo.countAll()) || 0;
          const ftsCount = await repos.searchRepo.getIndexedMessageCount();

          const healthResult = createHealthCheckResult(messagesCount, ftsCount);
          const alert = createHealthCheckAlert(healthResult);

          if (alert) {
            console.warn("=== Health Check Alert ===");
            console.warn(
              `Timestamp: ${new Date(alert.timestamp).toISOString()}`
            );
            console.warn(`Alert Type: ${alert.alertType}`);
            console.warn(`Message: ${alert.message}`);
            console.warn(`Messages Table: ${alert.details.messagesTableCount}`);
            console.warn(`FTS Table: ${alert.details.ftsTableCount}`);
            console.warn(`Difference: ${alert.details.difference}`);
            console.warn("===========================");
          }

          return alert;
        },
        "checkForMismatch"
      ),

      getDetailedComparison: withErrorHandling(async () => {
        const messagesCount = (await repos.msgRepo.countAll()) || 0;
        const ftsCount = await repos.searchRepo.getIndexedMessageCount();

        const difference = Math.abs(messagesCount - ftsCount);
        const hasMismatch = messagesCount !== ftsCount;

        // Test table accessibility
        const tablesHealth = {
          messagesTableHealthy: true,
          ftsTableHealthy: true,
          errors: [] as string[],
        };

        try {
          await repos.msgRepo.getAll();
        } catch (error) {
          tablesHealth.messagesTableHealthy = false;
          tablesHealth.errors.push(`Messages table error: ${error}`);
        }

        try {
          await repos.searchRepo.validateIndex();
        } catch (error) {
          tablesHealth.ftsTableHealthy = false;
          tablesHealth.errors.push(`FTS table error: ${error}`);
        }

        return {
          messagesTableCount: messagesCount,
          ftsTableCount: ftsCount,
          difference,
          hasMismatch,
          tablesHealth,
        };
      }, "getDetailedComparison"),

      checkConversationHealth: withErrorHandling(
        async (conversationId: string) => {
          // Get messages count for conversation from messages table
          const allMessages = (await repos.msgRepo.getAll()) || [];
          const conversationMessages = allMessages.filter(
            (msg) => msg.conversationId === conversationId
          );
          const messagesCount = conversationMessages.length;

          // Get FTS count for conversation using search
          const ftsUserCount =
            await repos.searchRepo.getUserMessageCount(conversationId);
          const ftsCount = ftsUserCount; // This is approximate, ideally we'd have a better method

          const difference = Math.abs(messagesCount - ftsCount);
          const hasMismatch = messagesCount !== ftsCount;

          return {
            conversationId,
            messagesTableCount: messagesCount,
            ftsTableCount: ftsCount,
            hasMismatch,
            difference,
          };
        },
        "checkConversationHealth"
      ),

      validateTablesHealth: withErrorHandling(async () => {
        const errors: string[] = [];
        let messagesTableHealthy = true;
        let ftsTableHealthy = true;

        // Test messages table
        try {
          await repos.msgRepo.getAll();
        } catch (error) {
          messagesTableHealthy = false;
          errors.push(`Messages table error: ${error}`);
        }

        // Test FTS table
        try {
          await repos.searchRepo.validateIndex();
        } catch (error) {
          ftsTableHealthy = false;
          errors.push(`FTS table error: ${error}`);
        }

        return {
          messagesTableHealthy,
          ftsTableHealthy,
          errors,
        };
      }, "validateTablesHealth"),
    },
  };
}
