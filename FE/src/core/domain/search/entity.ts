import { TID, TTimeStamp } from "../type";

// Enums cho search
export enum ESearchType {
  FULL_TEXT = "full_text",
  EXACT_PHRASE = "exact_phrase",
  AUTOCOMPLETE = "autocomplete",
}

export enum ESearchScope {
  ALL_CONVERSATIONS = "all_conversations",
  CURRENT_CONVERSATION = "current_conversation",
}

export enum EUserFilter {
  ALL_USERS = "all_users",
  SPECIFIC_USER = "specific_user",
  EXCLUDE_USER = "exclude_user",
}

// Interfaces chính
export interface ISearchQuery {
  query: string;
  type: ESearchType;
  scope: ESearchScope;
  conversationId?: TID;
  limit?: number;
  // User filtering options
  userFilter?: EUserFilter;
  userId?: TID; // For SPECIFIC_USER or EXCLUDE_USER
  senderName?: string; // Alternative to userId, search by name
  excludeCurrentUserName?: string; // Exclude messages from current user (fallback)
  excludeCurrentUserId?: TID; // Exclude messages from current user (preferred)
}

export interface ISearchResultItem {
  id: TID;
  content: string;
  senderName: string;
  senderId?: TID; // ID của người gửi
  conversationId: TID;
  createdAt: TTimeStamp;
  rank?: number;
  highlight?: string; // Content với highlighted query
}

export interface ISearchResult {
  items: ISearchResultItem[];
  query: string;
  totalFound: number;
  searchType: ESearchType;
  executionTime?: number; // ms
}

export interface IAutocompleteSuggestion {
  suggestion: string;
  frequency: number;
}

export interface IIndexStats {
  totalMessages: number;
  totalConversations: number;
  totalSenders: number;
  lastIndexedAt?: TTimeStamp;
  indexSize?: number; // bytes
}

export interface IMessageIndexData {
  messageId: TID;
  content: string;
  senderName: string;
  senderId: TID; // ID của người gửi để filter
  conversationId: TID;
  createdAt: TTimeStamp;
}

// Factory functions
export const createSearchQuery = (
  query: string,
  options: Partial<Omit<ISearchQuery, "query">> = {}
): ISearchQuery => {
  return {
    query: query.trim(),
    type: options.type || ESearchType.FULL_TEXT,
    scope: options.scope || ESearchScope.ALL_CONVERSATIONS,
    conversationId: options.conversationId,
    limit: options.limit || 50,
    userFilter: options.userFilter || EUserFilter.ALL_USERS,
    userId: options.userId,
    senderName: options.senderName,
    excludeCurrentUserName: options.excludeCurrentUserName,
    excludeCurrentUserId: options.excludeCurrentUserId,
  };
};

export const createSearchResult = (
  items: ISearchResultItem[],
  query: string,
  searchType: ESearchType,
  executionTime?: number
): ISearchResult => {
  return {
    items,
    query,
    totalFound: items.length,
    searchType,
    executionTime,
  };
};

export const createMessageIndexData = (
  messageId: TID,
  content: string,
  senderName: string,
  senderId: TID,
  conversationId: TID,
  createdAt: TTimeStamp
): IMessageIndexData => {
  return {
    messageId,
    content: content.trim(),
    senderName: senderName.trim(),
    senderId,
    conversationId,
    createdAt,
  };
};

// Utility functions
export const isValidSearchQuery = (query: ISearchQuery): boolean => {
  const hasValidQuery = query.query.length > 0;
  const hasValidType = Object.values(ESearchType).includes(query.type);
  const hasValidScope = Object.values(ESearchScope).includes(query.scope);
  const hasValidLimit = query.limit === undefined || query.limit > 0;
  const hasValidUserFilter =
    query.userFilter === undefined ||
    Object.values(EUserFilter).includes(query.userFilter);

  // Nếu userFilter là SPECIFIC_USER hoặc EXCLUDE_USER thì phải có userId hoặc senderName
  const hasValidUserParams =
    !query.userFilter ||
    query.userFilter === EUserFilter.ALL_USERS ||
    (query.userFilter === EUserFilter.SPECIFIC_USER &&
      !!(query.userId || query.senderName)) ||
    (query.userFilter === EUserFilter.EXCLUDE_USER &&
      !!(query.userId || query.senderName));

  return (
    hasValidQuery &&
    hasValidType &&
    hasValidScope &&
    hasValidLimit &&
    hasValidUserFilter &&
    hasValidUserParams
  );
};

export const shouldIncludeConversationFilter = (
  query: ISearchQuery
): boolean => {
  return (
    query.scope === ESearchScope.CURRENT_CONVERSATION && !!query.conversationId
  );
};

export const highlightSearchResult = (
  content: string,
  searchQuery: string,
  maxLength: number = 200
): string => {
  const query = searchQuery.toLowerCase();
  const contentLower = content.toLowerCase();
  const index = contentLower.indexOf(query);

  if (index === -1) return content.substring(0, maxLength);

  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + query.length + 50);
  const snippet = content.substring(start, end);

  return snippet.replace(
    new RegExp(`(${searchQuery})`, "gi"),
    "<mark>$1</mark>"
  );
};

// Helper functions cho user filtering
export const shouldFilterByUser = (query: ISearchQuery): boolean => {
  return !!(
    query.userFilter &&
    query.userFilter !== EUserFilter.ALL_USERS &&
    (query.userId || query.senderName)
  );
};

export const shouldIncludeUser = (query: ISearchQuery): boolean => {
  return query.userFilter === EUserFilter.SPECIFIC_USER;
};

export const shouldExcludeUser = (query: ISearchQuery): boolean => {
  return query.userFilter === EUserFilter.EXCLUDE_USER;
};

export const createUserFilterQuery = (
  baseQuery: string,
  userId?: TID,
  senderName?: string,
  include: boolean = true
): ISearchQuery => {
  return createSearchQuery(baseQuery, {
    userFilter: include ? EUserFilter.SPECIFIC_USER : EUserFilter.EXCLUDE_USER,
    userId,
    senderName,
  });
};

// Factory function để tạo search query với user filter
export const createSearchQueryWithUserFilter = (
  query: string,
  userFilter: EUserFilter,
  userIdentifier?: { userId?: TID; senderName?: string },
  otherOptions?: Partial<
    Omit<ISearchQuery, "query" | "userFilter" | "userId" | "senderName">
  >
): ISearchQuery => {
  return createSearchQuery(query, {
    ...otherOptions,
    userFilter,
    userId: userIdentifier?.userId,
    senderName: userIdentifier?.senderName,
  });
};
