import { ESearchType, ISearchQuery } from "@/core/domain/search/entity";
import { useAppContext } from "@/ui/context";
import { useQuery } from "@tanstack/react-query";

export type TParams = {
  query: ISearchQuery;
  enabled?: boolean;
  staleTime?: number;
};

export const SEARCH_MESSAGES_QUERY_KEY = "messageSearch";
export const SEARCH_EXACT_PHRASE_QUERY_KEY = "messageSearchExactPhrase";

export function useSearchMessagesQuery({
  query,
  enabled = true,
  staleTime = 0,
}: TParams) {
  const { service } = useAppContext();
  const { conversationId, limit, currentUserId } = query;
  const isEnabled =
    enabled &&
    !!query.query.trim() &&
    !!query.currentUserId &&
    !!query.limit &&
    query.type === ESearchType.FULL_TEXT;
  return useQuery({
    queryKey: [
      SEARCH_MESSAGES_QUERY_KEY,
      query,
      conversationId,
      limit,
      currentUserId,
      query.type,
    ],
    enabled: isEnabled,
    staleTime,
    queryFn: async () => {
      const result = await service.search.prefixSearch(query);
      return result;
    },
  });
}

export function useSearchExactPhraseQuery({
  query,
  enabled = true,
  staleTime = 0,
}: TParams) {
  const { service } = useAppContext();
  const { conversationId, limit, currentUserId } = query;
  const isEnabled =
    enabled &&
    !!query.query.trim() &&
    !!query.currentUserId &&
    !!query.limit &&
    query.type === ESearchType.EXACT_PHRASE;

  return useQuery({
    queryKey: [
      SEARCH_EXACT_PHRASE_QUERY_KEY,
      query,
      conversationId,
      limit,
      currentUserId,
      query.type,
    ],
    enabled: isEnabled,
    staleTime,
    queryFn: async () => {
      const result = await service.search.searchExactPhrase(query);
      return result;
    },
  });
}
