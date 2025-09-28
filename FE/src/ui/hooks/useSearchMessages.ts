import { useAppContext } from "@/ui/context";
import { useQuery } from "@tanstack/react-query";

export interface SearchResult {
  id: string;
  content: string;
  sender_name: string;
  conversation_id: string;
  created_at: string;
  rank: number;
}

export interface SearchFilters {
  conversationId?: string;
  limit?: number;
}

export interface ExactPhraseFilters {
  conversationId?: string;
  limit?: number;
}

type Params = {
  query: string;
  filters?: SearchFilters;
  enabled?: boolean;
  staleTime?: number;
};

export function useSearchMessagesQuery({
  query,
  filters = {},
  enabled = true,
  staleTime = 0,
}: Params) {
  const { service } = useAppContext();
  const sqliteService = service.search;

  const { conversationId, limit = 50 } = filters;
  const isEnabled = enabled && !!query.trim();

  return useQuery({
    queryKey: ["messageSearch", query, conversationId, limit],
    enabled: isEnabled,
    staleTime,
    queryFn: async (): Promise<SearchResult[]> => {
      let res = (await sqliteService.searchMessages(
        query,
        conversationId
      )) as SearchResult[];
      return limit && res.length > limit ? res.slice(0, limit) : res;
    },
  });
}

export function useSearchExactPhraseQuery({
  query,
  filters = {},
  enabled = true,
  staleTime = 0,
}: Params) {
  const { service } = useAppContext();
  const sqliteService = service.search;

  const { conversationId, limit = 50 } = filters;
  const isEnabled = enabled && !!query.trim();

  return useQuery({
    queryKey: ["messageSearchExactPhrase", query, conversationId, limit],
    enabled: isEnabled,
    staleTime,
    queryFn: async (): Promise<SearchResult[]> => {
      let res = (await sqliteService.searchExactPhrase(
        query,
        conversationId
      )) as SearchResult[];
      return limit && res.length > limit ? res.slice(0, limit) : res;
    },
  });
}
