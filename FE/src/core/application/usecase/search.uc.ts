import {
  ESearchScope,
  ESearchType,
  EUserFilter,
  IMessageIndexData,
  ISearchQuery,
  ISearchResult,
  createSearchQuery,
  isValidSearchQuery,
  normalizeSearchQuery,
} from "@/core/domain/search/entity";
import { ISearchRepository } from "@/core/domain/search/repo";
import { TID } from "@/core/domain/type";
import { assertExists, withErrorHandling } from "../error";

/////////////////////

export const performSearch = withErrorHandling(
  async (
    searchRepo: ISearchRepository,
    query: ISearchQuery,
    currentUserId?: string,
    currentUserName?: string
  ): Promise<ISearchResult> => {
    assertExists(searchRepo, "searchRepo is required");

    if (currentUserId) {
      query.excludeCurrentUserId = currentUserId;
    } else if (currentUserName) {
      query.excludeCurrentUserName = currentUserName;
    }

    if (!isValidSearchQuery(query)) {
      throw new Error("Invalid search query");
    }
    return searchRepo.search(normalizeSearchQuery(query));
  },
  "performSearch"
);

export const searchInConversation = withErrorHandling(
  async (
    searchRepo: ISearchRepository,
    query: string,
    conversationId: TID,
    currentUserId?: string,
    currentUserName?: string
  ): Promise<ISearchResult> => {
    assertExists(searchRepo, "searchRepo is required");
    assertExists(query, "query is required");
    assertExists(conversationId, "conversationId is required");

    const searchQuery = createSearchQuery(query, {
      type: ESearchType.FULL_TEXT,
      scope: ESearchScope.CURRENT_CONVERSATION,
      conversationId,
      excludeCurrentUserId: currentUserId,
      excludeCurrentUserName: currentUserName,
    });

    return searchRepo.search(normalizeSearchQuery(searchQuery));
  },
  "searchInConversation"
);

export const searchMessagesByUser = withErrorHandling(
  async (
    searchRepo: ISearchRepository,
    query: string,
    userId: TID,
    conversationId?: TID
  ): Promise<ISearchResult> => {
    assertExists(searchRepo, "searchRepo is required");
    assertExists(query, "query is required");
    assertExists(userId, "userId is required");

    const searchQuery = createSearchQuery(query, {
      type: ESearchType.FULL_TEXT,
      scope: conversationId
        ? ESearchScope.CURRENT_CONVERSATION
        : ESearchScope.ALL_CONVERSATIONS,
      conversationId,
      userFilter: EUserFilter.SPECIFIC_USER,
      userId,
    });

    return searchRepo.search(searchQuery);
  },
  "searchMessagesByUser"
);

export const searchMessagesExcludingUser = withErrorHandling(
  async (
    searchRepo: ISearchRepository,
    query: string,
    userId: TID,
    conversationId?: TID
  ): Promise<ISearchResult> => {
    assertExists(searchRepo, "searchRepo is required");
    assertExists(query, "query is required");
    assertExists(userId, "userId is required");

    const searchQuery = createSearchQuery(query, {
      type: ESearchType.FULL_TEXT,
      scope: conversationId
        ? ESearchScope.CURRENT_CONVERSATION
        : ESearchScope.ALL_CONVERSATIONS,
      conversationId,
      userFilter: EUserFilter.EXCLUDE_USER,
      userId,
    });

    return searchRepo.search(searchQuery);
  },
  "searchMessagesExcludingUser"
);

export const searchExactPhrase = withErrorHandling(
  async (
    searchRepo: ISearchRepository,
    phrase: string,
    conversationId?: TID,
    currentUserId?: string,
    currentUserName?: string
  ): Promise<ISearchResult> => {
    assertExists(searchRepo, "searchRepo is required");
    assertExists(phrase, "phrase is required");

    const searchQuery = createSearchQuery(phrase, {
      type: ESearchType.EXACT_PHRASE,
      scope: conversationId
        ? ESearchScope.CURRENT_CONVERSATION
        : ESearchScope.ALL_CONVERSATIONS,
      conversationId,
      excludeCurrentUserId: currentUserId,
      excludeCurrentUserName: currentUserName,
    });

    return searchRepo.search(searchQuery);
  },
  "searchExactPhrase"
);

// export const getSearchSuggestions = withErrorHandling(
//   async (
//     searchRepo: ISearchRepository,
//     partialQuery: string,
//     limit: number = 10
//   ): Promise<IAutocompleteSuggestion[]> => {
//     assertExists(searchRepo, "searchRepo is required");

//     if (!partialQuery.trim()) return [];

//     return searchRepo.getAutocompleteSuggestions(partialQuery, limit);
//   },
//   "getSearchSuggestions"
// );

// export const getUserMessages = withErrorHandling(
//   async (
//     searchRepo: ISearchRepository,
//     userId: TID,
//     conversationId?: TID,
//     limit: number = 50
//   ) => {
//     assertExists(searchRepo, "searchRepo is required");
//     assertExists(userId, "userId is required");

//     return searchRepo.getUserMessages(userId, conversationId, limit);
//   },
//   "getUserMessages"
// );

// export const getActiveUsers = withErrorHandling(
//   async (searchRepo: ISearchRepository, conversationId?: TID) => {
//     assertExists(searchRepo, "searchRepo is required");

//     return searchRepo.getActiveUsers(conversationId);
//   },
//   "getActiveUsers"
// );

export const indexMessage = withErrorHandling(
  async (
    searchRepo: ISearchRepository,
    messageData: IMessageIndexData
  ): Promise<void> => {
    assertExists(searchRepo, "searchRepo is required");
    assertExists(messageData, "messageData is required");

    return searchRepo.indexMessage(messageData);
  },
  "indexMessage"
);

export const updateMessageInIndex = withErrorHandling(
  async (
    searchRepo: ISearchRepository,
    messageId: TID,
    content: string,
    senderName: string,
    senderId?: TID
  ): Promise<void> => {
    assertExists(searchRepo, "searchRepo is required");
    assertExists(messageId, "messageId is required");
    assertExists(content, "content is required");
    assertExists(senderName, "senderName is required");

    return searchRepo.updateMessageInIndex(
      messageId,
      content,
      senderName,
      senderId
    );
  },
  "updateMessageInIndex"
);

export const removeMessageFromIndex = withErrorHandling(
  async (searchRepo: ISearchRepository, messageId: TID): Promise<void> => {
    assertExists(searchRepo, "searchRepo is required");
    assertExists(messageId, "messageId is required");

    return searchRepo.removeMessageFromIndex(messageId);
  },
  "removeMessageFromIndex"
);

export const bulkIndexMessages = withErrorHandling(
  async (
    searchRepo: ISearchRepository,
    messages: IMessageIndexData[]
  ): Promise<void> => {
    assertExists(searchRepo, "searchRepo is required");
    assertExists(messages, "messages is required");

    return searchRepo.bulkIndexMessages(messages);
  },
  "bulkIndexMessages"
);

// export const getSearchStats = withErrorHandling(
//   async (searchRepo: ISearchRepository): Promise<IIndexStats> => {
//     assertExists(searchRepo, "searchRepo is required");
//     return searchRepo.getIndexStats();
//   },
//   "getSearchStats"
// );

export const isMessageIndexed = withErrorHandling(
  async (searchRepo: ISearchRepository, messageId: TID): Promise<boolean> => {
    assertExists(searchRepo, "searchRepo is required");
    assertExists(messageId, "messageId is required");

    return searchRepo.isMessageIndexed(messageId);
  },
  "isMessageIndexed"
);

export const getUserMessageCount = withErrorHandling(
  async (searchRepo: ISearchRepository, userId: TID): Promise<number> => {
    assertExists(searchRepo, "searchRepo is required");
    assertExists(userId, "userId is required");
    return searchRepo.getUserMessageCount(userId);
  },
  "getUserMessageCount"
);

// export const performAdvancedSearch = withErrorHandling(
//   async (
//     searchRepo: ISearchRepository,
//     baseQuery: string,
//     options: {
//       exactPhrase?: boolean;
//       userFilter?: EUserFilter;
//       userId?: TID;
//       senderName?: string;
//       conversationId?: TID;
//       limit?: number;
//       currentUserName?: string;
//     }
//   ): Promise<ISearchResult> => {
//     assertExists(searchRepo, "searchRepo is required");
//     assertExists(baseQuery, "baseQuery is required");

//     const searchQuery = createSearchQuery(baseQuery, {
//       type: options.exactPhrase
//         ? ESearchType.EXACT_PHRASE
//         : ESearchType.FULL_TEXT,
//       scope: options.conversationId
//         ? ESearchScope.CURRENT_CONVERSATION
//         : ESearchScope.ALL_CONVERSATIONS,
//       conversationId: options.conversationId,
//       userFilter: options.userFilter,
//       userId: options.userId,
//       senderName: options.senderName,
//       limit: options.limit,
//       excludeCurrentUserName: options.currentUserName,
//     });

//     return searchRepo.search(searchQuery);
//   },
//   "performAdvancedSearch"
// );
