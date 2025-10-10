import {
  ESearchType,
  ISearchQuery,
  ISearchRawResult,
} from "@/core/domain/search/entity";
import { useAppContext } from "@/ui/context";
import { useInfiniteQuery } from "@tanstack/react-query";

export type TInfiniteSearchParams = {
  query: ISearchQuery;
  enabled?: boolean;
  staleTime?: number;
};

export const INFINITE_SEARCH_QUERY_KEY = "infiniteMessageSearch";
export const INFINITE_SEARCH_EXACT_PHRASE_QUERY_KEY =
  "infiniteMessageSearchExactPhrase";

export function useInfiniteSearchQuery({
  query,
  enabled = true,
  staleTime = 0,
}: TInfiniteSearchParams) {
  const { service } = useAppContext();
  const { conversationId, limit, currentUserId } = query;

  const isEnabled =
    enabled &&
    !!query.query.trim() &&
    !!query.currentUserId &&
    !!query.limit &&
    query.type === ESearchType.FULL_TEXT;

  return useInfiniteQuery({
    queryKey: [
      INFINITE_SEARCH_QUERY_KEY,
      query.query,
      conversationId,
      limit,
      currentUserId,
      query.type,
      query.userId,
      query.startDate,
      query.endDate,
    ],
    enabled: isEnabled,
    staleTime,
    queryFn: async ({ pageParam }: { pageParam?: { rowid: number } }) => {
      const searchQuery: ISearchQuery = {
        ...query,
        cursor: pageParam,
      };
      const result = await service.search.prefixSearch(searchQuery);
      return result;
    },
    getNextPageParam: (lastPage: ISearchRawResult) => {
      if (!lastPage.hasMore || !lastPage.nextCursor) return undefined;
      return lastPage.nextCursor;
    },

    initialPageParam: undefined,
  });
}

export function useInfiniteSearchExactPhraseQuery({
  query,
  enabled = true,
  staleTime = 0,
}: TInfiniteSearchParams) {
  const { service } = useAppContext();
  const { conversationId, limit, currentUserId } = query;

  const isEnabled =
    enabled &&
    !!query.query.trim() &&
    !!query.currentUserId &&
    !!query.limit &&
    query.type === ESearchType.EXACT_PHRASE;

  return useInfiniteQuery({
    queryKey: [
      INFINITE_SEARCH_EXACT_PHRASE_QUERY_KEY,
      query.query,
      conversationId,
      limit,
      currentUserId,
      query.type,
      query.userId,
      query.startDate,
      query.endDate,
    ],
    enabled: isEnabled,
    staleTime,
    queryFn: async ({ pageParam }: { pageParam?: { rowid: number } }) => {
      const searchQuery: ISearchQuery = {
        ...query,
        cursor: pageParam,
      };
      const result = await service.search.searchExactPhrase(searchQuery);
      return result;
    },
    getNextPageParam: (lastPage: ISearchRawResult) => {
      if (!lastPage.hasMore || !lastPage.nextCursor) return undefined;
      return lastPage.nextCursor;
    },
    initialPageParam: undefined,
  });
}
