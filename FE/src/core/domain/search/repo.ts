import { TID } from "../type";
import {
  IMessageIndexData,
  ISearchIndexResult,
  ISearchQuery,
  TRankingColection,
} from "./entity";

export interface ISearchRepository {
  init(): Promise<void>;
  search(
    query: ISearchQuery,
    rank: TRankingColection
  ): Promise<ISearchIndexResult>;
  searchExactPhrase(
    query: ISearchQuery,
    rank: TRankingColection
  ): Promise<ISearchIndexResult>;

  // Index operations
  indexMessage(messageData: IMessageIndexData): Promise<void>;

  // Bulk operations
  bulkIndexMessages(messages: IMessageIndexData[]): Promise<void>;
  rebuildIndex(): Promise<void>;
  clearIndex(): Promise<void>;

  // Query operations
  isMessageIndexed(messageId: TID): Promise<boolean>;
  getIndexedMessageIds(): Promise<TID[]>;

  // User-related queries
  getIndexedUserIds(): Promise<TID[]>;
  getUserMessageCount(userId: TID): Promise<number>;

  // Maintenance operations
  optimizeIndex(): Promise<void>;
  validateIndex(): Promise<boolean>;
}
