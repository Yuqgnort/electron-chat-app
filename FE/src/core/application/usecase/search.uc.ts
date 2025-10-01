import {
  ESearchType,
  IMessageIndexData,
  ISearchQuery,
  ISearchIndexResult,
  createSearchQuery,
  isValidSearchQuery,
  TRankingColection,
  createRankingColection,
} from "@/core/domain/search/entity";
import { ISearchRepository } from "@/core/domain/search/repo";
import { TID } from "@/core/domain/type";
import { assertExists, withErrorHandling } from "../error";

/////////////////////

export const prefixSearch = withErrorHandling(
  async (
    searchRepo: ISearchRepository,
    query: ISearchQuery,
    rank?: TRankingColection
  ): Promise<ISearchIndexResult> => {
    assertExists(searchRepo, "searchRepo is required");
    assertExists(query, "query is required");
    if (!isValidSearchQuery(query)) {
      throw new Error("Invalid search query");
    }
    const searchRanking = createRankingColection(rank);
    const searchQuery = createSearchQuery(query);
    return searchRepo.search(searchQuery, searchRanking);
  },
  "performSearch"
);

export const searchExactPhrase = withErrorHandling(
  async (
    searchRepo: ISearchRepository,
    query: ISearchQuery,
    rank?: TRankingColection
  ): Promise<ISearchIndexResult> => {
    assertExists(searchRepo, "searchRepo is required");
    assertExists(query, "phrase is required");
    if (!isValidSearchQuery(query)) {
      throw new Error("Invalid search query");
    }
    const searchRanking = createRankingColection(rank);
    const searchQuery = createSearchQuery({
      ...query,
      type: ESearchType.EXACT_PHRASE,
    });
    return searchRepo.searchExactPhrase(searchQuery, searchRanking);
  },
  "searchExactPhrase"
);

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
