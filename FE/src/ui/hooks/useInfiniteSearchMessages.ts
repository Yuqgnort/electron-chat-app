import { ESearchType, ISearchQuery } from "@/core/domain/search/entity";
import { useAppContext } from "@/ui/context";
import { useInfiniteQuery } from "@tanstack/react-query";

export type TInfiniteSearchParams = {
  query: ISearchQuery;
  enabled?: boolean;
  staleTime?: number;
};

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
      "infiniteMessageSearch",
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
    queryFn: async ({ pageParam = 0 }) => {
      const searchQuery = {
        ...query,
        offset: pageParam,
      };
      const result = await service.search.prefixSearch(searchQuery);
      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * (query.limit || 50);
    },
    initialPageParam: 0,
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
      "infiniteMessageSearchExactPhrase",
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
    queryFn: async ({ pageParam = 0 }) => {
      const searchQuery = {
        ...query,
        offset: pageParam,
      };
      const result = await service.search.searchExactPhrase(searchQuery);
      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * (query.limit || 50);
    },
    initialPageParam: 0,
  });
}
