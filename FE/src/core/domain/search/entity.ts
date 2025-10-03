import { IMsgEntity } from "../msg/entity";
import { TID, TTimeStamp } from "../type";

export enum ESearchType {
  FULL_TEXT = "full_text",
  EXACT_PHRASE = "exact_phrase",
}

export type TRankingColection = {
  recencyBoost: {
    weight?: number;
    calFunction?: (createdAt: TTimeStamp) => number;
  };
  conversationActivityBoost: {
    weight?: number;
    calFunction?: (lastMessagesUpdateAt: TTimeStamp) => number;
  };
};

export interface ISearchQuery {
  query: string;
  currentUserId: TID;
  userId?: TID;
  conversationId?: TID;
  limit: number;
  createdAt?: TTimeStamp;
  type: ESearchType;
}

export interface ISearchRawResultItem extends IMsgEntity {
  receiverName: string;
  senderName: string;
  rank?: number;
  highlight?: string;
}

export type ISearchRawResult = {
  items: ISearchRawResultItem[];
  totalFound: number;
  executionTime?: number;
  query: string;
  searchType: ESearchType;
};

export interface ISearchIndexItem {
  messageId: TID;
  content: string;
  senderId: TID;
  conversationId: TID;
  createdAt: TTimeStamp;
  rank?: number;
  highlight?: string;
  receiverId: TID;
}

export interface ISearchIndexResult {
  items: ISearchIndexItem[];
  query: string;
  totalFound: number;
  searchType: ESearchType;
  executionTime?: number;
}

export interface IMessageIndexData {
  messageId: TID;
  content: string;
  senderId: TID;
  conversationId: TID;
  createdAt: TTimeStamp;
  receiverId: TID;
}

export const createNormalizeSearchString = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

export const createSearchQuery = (options: ISearchQuery): ISearchQuery => {
  return {
    ...options,
    query: createNormalizeSearchString(options.query),
  };
};

export const createSearchRawItem = ({
  msg,
  receiverName,
  senderId,
  senderName,
  receiverId,
  rank,
  highlight,
}: {
  msg: IMsgEntity;
  receiverName: string;
  senderId: TID;
  senderName: string;
  receiverId: TID;
  rank?: number;
  highlight?: string;
}): ISearchRawResultItem => {
  return {
    ...msg,
    receiverName,
    rank,
    highlight,
    senderId,
    senderName,
    receiverId,
  };
};

export const createSearchRawResult = (
  items: ISearchRawResultItem[],
  query: string,
  searchType: ESearchType,
  executionTime?: number
): ISearchRawResult => {
  return {
    items,
    query,
    totalFound: items.length,
    searchType,
    executionTime,
  };
};

export const createSearchIndexResult = (
  items: ISearchIndexItem[],
  query: string,
  searchType: ESearchType,
  executionTime?: number
): ISearchIndexResult => {
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
  senderId: TID,
  conversationId: TID,
  createdAt: TTimeStamp,
  receiverId: TID
): IMessageIndexData => {
  return {
    messageId,
    content: createNormalizeSearchString(content),
    senderId,
    conversationId,
    createdAt,
    receiverId,
  };
};

export const isValidSearchQuery = (query: ISearchQuery): boolean => {
  const hasValidQuery = query.query.length > 0;
  const hasValidType = Object.values(ESearchType).includes(query.type);
  const hasValidLimit =
    query.limit === undefined ||
    (Number.isInteger(query.limit) && query.limit > 0);

  return hasValidQuery && hasValidType && hasValidLimit;
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

export const createRankingColection = (
  params?: TRankingColection
): TRankingColection => {
  const defaultRecencyCalFunction = (createdAt: TTimeStamp) => {
    const ageInHours = (Date.now() - createdAt) / (1000 * 60 * 60);
    return Math.max(0, 1 - ageInHours / 168);
  };

  const defaultConversationActivityCalFunction = (
    lastMessagesUpdateAt: TTimeStamp
  ) => {
    const ageInHours = (Date.now() - lastMessagesUpdateAt) / (1000 * 60 * 60);
    return Math.max(0, 1 - ageInHours / 168);
  };

  return {
    recencyBoost: {
      weight: params?.recencyBoost.weight || 0.7,
      calFunction:
        params?.recencyBoost.calFunction || defaultRecencyCalFunction,
    },
    conversationActivityBoost: {
      weight: params?.conversationActivityBoost.weight || 0.3,
      calFunction:
        params?.conversationActivityBoost.calFunction ||
        defaultConversationActivityCalFunction,
    },
  };
};
