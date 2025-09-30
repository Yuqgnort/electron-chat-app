import { IConvPartRepo } from "../domain/conv-part/repo";
import { IConvRepo } from "../domain/conv/repo";
import { IMsgEntity, TMsgDirection } from "../domain/msg/entity";
import { IMsgRepo } from "../domain/msg/repo";
import { IPendingMsgRepo } from "../domain/pending-msg/repo";
import { ISearchRepository } from "../domain/search/repo";
import { IUserEntity } from "../domain/user/entity";
import { IUserRepo } from "../domain/user/repo";
import { withErrorHandling } from "./error";
import { TIntegrationSentEvent } from "./event";
import { IEventBus } from "./eventbus";
import {
  createConvWithParticipants,
  getConvsWithParticipantsByUserId,
  performEnhancedSearch,
  requestAllOnlineUsers,
  requestUsersStatus,
  searchExactPhraseEnhanced,
  searchInConversationEnhanced,
  searchMessagesByUserEnhanced,
  searchMessagesExcludingUserEnhanced,
  sendHeartbeat,
  sendMsg,
  startTyping,
  stopTyping,
} from "./services";
import { getConvByUserIds } from "./usecase/conv.uc";
import { getAllMsgs, getMsgsByConvId } from "./usecase/msg.uc";
import { getAllPendingMsgs } from "./usecase/pending-msg.uc";
import {
  bulkIndexMessages,
  getUserMessageCount,
  indexMessage,
  isMessageIndexed,
  removeMessageFromIndex,
  updateMessageInIndex,
} from "./usecase/search.uc";
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
      performSearch: withErrorHandling(
        async (
          query: Parameters<typeof performEnhancedSearch>[4],
          currentUserId: string,
          currentUserName?: string
        ) => {
          // Add excludeCurrentUserId/excludeCurrentUserName to query if provided
          if (currentUserId) {
            query.excludeCurrentUserId = currentUserId;
          } else if (currentUserName) {
            query.excludeCurrentUserName = currentUserName;
          }

          return await performEnhancedSearch(
            repos.searchRepo,
            repos.msgRepo,
            repos.userRepo,
            repos.convPartRepo,
            query,
            currentUserId
          );
        },
        "performSearch"
      ),
      searchInConversation: withErrorHandling(
        async (
          query: string,
          conversationId: string,
          currentUserId: string,
          currentUserName?: string
        ) =>
          await searchInConversationEnhanced(
            repos.searchRepo,
            repos.msgRepo,
            repos.userRepo,
            repos.convPartRepo,
            query,
            conversationId,
            currentUserId,
            currentUserName
          ),
        "searchInConversation"
      ),
      searchMessagesByUser: withErrorHandling(
        async (
          query: string,
          userId: string,
          currentUserId: string,
          conversationId?: string
        ) =>
          await searchMessagesByUserEnhanced(
            repos.searchRepo,
            repos.msgRepo,
            repos.userRepo,
            repos.convPartRepo,
            query,
            userId,
            currentUserId,
            conversationId
          ),
        "searchMessagesByUser"
      ),
      searchMessagesExcludingUser: withErrorHandling(
        async (
          query: string,
          userId: string,
          currentUserId: string,
          conversationId?: string
        ) =>
          await searchMessagesExcludingUserEnhanced(
            repos.searchRepo,
            repos.msgRepo,
            repos.userRepo,
            repos.convPartRepo,
            query,
            userId,
            currentUserId,
            conversationId
          ),
        "searchMessagesExcludingUser"
      ),
      searchExactPhrase: withErrorHandling(
        async (
          phrase: string,
          currentUserId: string,
          conversationId?: string,
          currentUserName?: string
        ) =>
          await searchExactPhraseEnhanced(
            repos.searchRepo,
            repos.msgRepo,
            repos.userRepo,
            repos.convPartRepo,
            phrase,
            currentUserId,
            conversationId,
            currentUserName
          ),
        "searchExactPhrase"
      ),
      // getSearchSuggestions: withErrorHandling(
      //   async (
      //     query: Parameters<typeof getSearchSuggestions>[1],
      //     limit?: Parameters<typeof getSearchSuggestions>[2]
      //   ) => await getSearchSuggestions(repos.searchRepo, query, limit),
      //   "getSearchSuggestions"
      // ),
      // getUserMessages: withErrorHandling(
      //   async (
      //     userId: Parameters<typeof getUserMessages>[1],
      //     conversationId?: Parameters<typeof getUserMessages>[2],
      //     limit?: Parameters<typeof getUserMessages>[3]
      //   ) =>
      //     await getUserMessages(
      //       repos.searchRepo,
      //       userId,
      //       conversationId,
      //       limit
      //     ),
      //   "getUserMessages"
      // ),
      // getActiveUsers: withErrorHandling(
      //   async (conversationId?: Parameters<typeof getActiveUsers>[1]) =>
      //     await getActiveUsers(repos.searchRepo, conversationId),
      //   "getActiveUsers"
      // ),
      indexMessage: withErrorHandling(
        async (messageData: Parameters<typeof indexMessage>[1]) =>
          await indexMessage(repos.searchRepo, messageData),
        "indexMessage"
      ),
      updateMessageInIndex: withErrorHandling(
        async (
          messageId: Parameters<typeof updateMessageInIndex>[1],
          content: Parameters<typeof updateMessageInIndex>[2],
          senderName: Parameters<typeof updateMessageInIndex>[3],
          senderId?: Parameters<typeof updateMessageInIndex>[4]
        ) =>
          await updateMessageInIndex(
            repos.searchRepo,
            messageId,
            content,
            senderName,
            senderId
          ),
        "updateMessageInIndex"
      ),
      removeMessageFromIndex: withErrorHandling(
        async (messageId: Parameters<typeof removeMessageFromIndex>[1]) =>
          await removeMessageFromIndex(repos.searchRepo, messageId),
        "removeMessageFromIndex"
      ),
      bulkIndexMessages: withErrorHandling(
        async (messages: Parameters<typeof bulkIndexMessages>[1]) =>
          await bulkIndexMessages(repos.searchRepo, messages),
        "bulkIndexMessages"
      ),
      // getSearchStats: withErrorHandling(
      //   async () => await getSearchStats(repos.searchRepo),
      //   "getSearchStats"
      // ),
      isMessageIndexed: withErrorHandling(
        async (messageId: Parameters<typeof isMessageIndexed>[1]) =>
          await isMessageIndexed(repos.searchRepo, messageId),
        "isMessageIndexed"
      ),
      getUserMessageCount: withErrorHandling(
        async (userId: Parameters<typeof getUserMessageCount>[1]) =>
          await getUserMessageCount(repos.searchRepo, userId),
        "getUserMessageCount"
      ),
      // performAdvancedSearch: withErrorHandling(
      //   async (
      //     baseQuery: Parameters<typeof performAdvancedSearch>[1],
      //     options: Parameters<typeof performAdvancedSearch>[2]
      //   ) => await performAdvancedSearch(repos.searchRepo, baseQuery, options),
      //   "performAdvancedSearch"
      // ),
    },
  };
}
