import { TID, TTimeStamp } from "../type";
import { ISearchQuery, ISearchIndexResult, IMessageIndexData } from "./entity";

// Base search event
export interface ISearchEvent {
  type: string;
  timestamp: number;
  payload: any;
}

// Search operation events
export interface ISearchPerformedEvent extends ISearchEvent {
  type: "SEARCH_PERFORMED";
  payload: {
    query: ISearchQuery;
    resultCount: number;
    executionTime: number;
    hasUserFilter: boolean;
    filteredUserId?: TID;
  };
}

export interface ISearchFailedEvent extends ISearchEvent {
  type: "SEARCH_FAILED";
  payload: {
    query: ISearchQuery;
    error: string;
    errorCode?: string;
  };
}

// Index operation events
export interface IMessageIndexedEvent extends ISearchEvent {
  type: "MESSAGE_INDEXED";
  payload: {
    messageId: TID;
    conversationId: TID;
    contentLength: number;
  };
}

export interface IMessageUpdatedInIndexEvent extends ISearchEvent {
  type: "MESSAGE_UPDATED_IN_INDEX";
  payload: {
    messageId: TID;
    conversationId: TID;
    oldContentLength: number;
    newContentLength: number;
  };
}

export interface IMessageRemovedFromIndexEvent extends ISearchEvent {
  type: "MESSAGE_REMOVED_FROM_INDEX";
  payload: {
    messageId: TID;
    conversationId: TID;
  };
}

// Bulk operation events
export interface IBulkIndexStartedEvent extends ISearchEvent {
  type: "BULK_INDEX_STARTED";
  payload: {
    messageCount: number;
    estimatedTime?: number;
  };
}

export interface IBulkIndexProgressEvent extends ISearchEvent {
  type: "BULK_INDEX_PROGRESS";
  payload: {
    processedCount: number;
    totalCount: number;
    percentage: number;
  };
}

export interface IBulkIndexCompletedEvent extends ISearchEvent {
  type: "BULK_INDEX_COMPLETED";
  payload: {
    indexedCount: number;
    failedCount: number;
    executionTime: number;
  };
}

export interface IBulkIndexFailedEvent extends ISearchEvent {
  type: "BULK_INDEX_FAILED";
  payload: {
    processedCount: number;
    totalCount: number;
    error: string;
    failedMessages?: TID[];
  };
}

// Index maintenance events
export interface IIndexRebuiltEvent extends ISearchEvent {
  type: "INDEX_REBUILT";
  payload: {
    previousMessageCount: number;
    newMessageCount: number;
    executionTime: number;
  };
}

export interface IIndexClearedEvent extends ISearchEvent {
  type: "INDEX_CLEARED";
  payload: {
    clearedMessageCount: number;
  };
}

export interface IIndexOptimizedEvent extends ISearchEvent {
  type: "INDEX_OPTIMIZED";
  payload: {
    previousSize: number;
    newSize: number;
    compressionRatio: number;
  };
}

// Error events
export interface IIndexCorruptedEvent extends ISearchEvent {
  type: "INDEX_CORRUPTED";
  payload: {
    error: string;
    affectedMessages?: TID[];
    recoverable: boolean;
  };
}

export interface ISearchEngineErrorEvent extends ISearchEvent {
  type: "SEARCH_ENGINE_ERROR";
  payload: {
    operation: string;
    error: string;
    critical: boolean;
  };
}

// User-specific events
export interface IUserSearchPerformedEvent extends ISearchEvent {
  type: "USER_SEARCH_PERFORMED";
  payload: {
    userId: TID;
    query: string;
    resultCount: number;
    searchType: "include" | "exclude";
  };
}

export interface IUserActivityAnalyzedEvent extends ISearchEvent {
  type: "USER_ACTIVITY_ANALYZED";
  payload: {
    userId: TID;
    conversationId?: TID;
    messageCount: number;
    timeRange: {
      from: TTimeStamp;
      to: TTimeStamp;
    };
  };
}

export type TSearchEvent =
  | ISearchPerformedEvent
  | ISearchFailedEvent
  | IMessageIndexedEvent
  | IMessageUpdatedInIndexEvent
  | IMessageRemovedFromIndexEvent
  | IBulkIndexStartedEvent
  | IBulkIndexProgressEvent
  | IBulkIndexCompletedEvent
  | IBulkIndexFailedEvent
  | IIndexRebuiltEvent
  | IIndexClearedEvent
  | IIndexOptimizedEvent
  | IIndexCorruptedEvent
  | ISearchEngineErrorEvent
  | IUserSearchPerformedEvent
  | IUserActivityAnalyzedEvent;
