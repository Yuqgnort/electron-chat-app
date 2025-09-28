import {
  ISearchQuery,
  ISearchResult,
  IAutocompleteSuggestion,
  IIndexStats,
  IMessageIndexData,
  ISearchResultItem,
} from "./entity";
import { TID } from "../type";

export interface ISearchRepository {
  // Khởi tạo search engine
  init(): Promise<void>;

  // Search operations
  search(query: ISearchQuery): Promise<ISearchResult>;
  searchExactPhrase(
    phrase: string,
    conversationId?: TID
  ): Promise<ISearchResultItem[]>;
  getAutocompleteSuggestions(
    query: string,
    limit?: number
  ): Promise<IAutocompleteSuggestion[]>;

  // User-specific search operations
  searchByUser(
    query: string,
    userId: TID,
    conversationId?: TID
  ): Promise<ISearchResultItem[]>;
  searchExcludingUser(
    query: string,
    userId: TID,
    conversationId?: TID
  ): Promise<ISearchResultItem[]>;
  getUserMessages(
    userId: TID,
    conversationId?: TID,
    limit?: number
  ): Promise<ISearchResultItem[]>;

  // Index operations
  indexMessage(messageData: IMessageIndexData): Promise<void>;
  updateMessageInIndex(
    messageId: TID,
    content: string,
    senderName: string,
    senderId?: TID
  ): Promise<void>;
  removeMessageFromIndex(messageId: TID): Promise<void>;

  // Bulk operations
  bulkIndexMessages(messages: IMessageIndexData[]): Promise<void>;
  rebuildIndex(): Promise<void>;
  clearIndex(): Promise<void>;

  // Query operations
  isMessageIndexed(messageId: TID): Promise<boolean>;
  getIndexedMessageIds(): Promise<TID[]>;
  getIndexStats(): Promise<IIndexStats>;

  // User-related queries
  getIndexedUserIds(): Promise<TID[]>;
  getUserMessageCount(userId: TID): Promise<number>;
  getActiveUsers(
    conversationId?: TID
  ): Promise<Array<{ userId: TID; senderName: string; messageCount: number }>>;

  // Maintenance operations
  optimizeIndex(): Promise<void>;
  validateIndex(): Promise<boolean>;

  // Migration operations
  migrateSenderIds(userRepo: any): Promise<void>;

  // Raw SQL access (for advanced operations)
  executeQuery(sql: string): Promise<any>;
  selectQuery(sql: string): Promise<any[]>;
}

// Interface cho search service (use case layer)
export interface ISearchService {
  // High-level search operations
  performSearch(query: ISearchQuery): Promise<ISearchResult>;
  searchInConversation(
    query: string,
    conversationId: TID
  ): Promise<ISearchResult>;
  getSearchSuggestions(
    partialQuery: string
  ): Promise<IAutocompleteSuggestion[]>;

  // User-specific search operations
  searchMessagesByUser(
    query: string,
    userId: TID,
    conversationId?: TID
  ): Promise<ISearchResult>;
  searchMessagesExcludingUser(
    query: string,
    userId: TID,
    conversationId?: TID
  ): Promise<ISearchResult>;
  getUserActivity(userId: TID, conversationId?: TID): Promise<ISearchResult>;

  // Index management
  addMessageToIndex(messageData: IMessageIndexData): Promise<void>;
  updateMessageInIndex(
    messageId: TID,
    content: string,
    senderName: string,
    senderId?: TID
  ): Promise<void>;
  removeMessageFromIndex(messageId: TID): Promise<void>;

  // Batch operations
  syncMessagesToIndex(messages: IMessageIndexData[]): Promise<void>;
  refreshIndex(): Promise<void>;

  // Statistics and health
  getSearchStats(): Promise<IIndexStats>;
  isSearchAvailable(): Promise<boolean>;

  // User analytics
  getActiveUsers(
    conversationId?: TID
  ): Promise<Array<{ userId: TID; senderName: string; messageCount: number }>>;
  getUserSearchHistory(userId: TID): Promise<ISearchQuery[]>;
}

// Interface cho search event handlers
export interface ISearchEventHandler {
  onMessageIndexed(messageId: TID): void;
  onMessageRemovedFromIndex(messageId: TID): void;
  onIndexRebuilt(): void;
  onSearchPerformed(query: ISearchQuery, resultCount: number): void;
  onIndexError(error: Error): void;
}
