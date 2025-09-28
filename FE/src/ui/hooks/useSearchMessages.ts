import { useAppContext } from "@/ui/context";
import { useQuery } from "@tanstack/react-query";
import { ESearchType, ESearchScope } from "@/core/domain/search/entity";

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

export type Params = {
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

  const { conversationId, limit = 50 } = filters;
  const isEnabled = enabled && !!query.trim();

  return useQuery({
    queryKey: ["messageSearch", query, conversationId, limit],
    enabled: isEnabled,
    staleTime,
    queryFn: async (): Promise<SearchResult[]> => {
      const searchQuery = {
        query,
        type: ESearchType.FULL_TEXT,
        scope: conversationId
          ? ESearchScope.CURRENT_CONVERSATION
          : ESearchScope.ALL_CONVERSATIONS,
        conversationId,
        limit,
      };

      const result = conversationId
        ? await service.search.searchInConversation(query, conversationId)
        : await service.search.performSearch(searchQuery);

      return result.items.map((item) => ({
        id: item.id,
        content: item.content,
        sender_name: item.senderName,
        conversation_id: item.conversationId,
        created_at: new Date(item.createdAt).toISOString(),
        rank: item.rank || 0,
      }));
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

  const { conversationId, limit = 50 } = filters;
  const isEnabled = enabled && !!query.trim();

  return useQuery({
    queryKey: ["messageSearchExactPhrase", query, conversationId, limit],
    enabled: isEnabled,
    staleTime,
    queryFn: async (): Promise<SearchResult[]> => {
      const result = await service.search.searchExactPhrase(
        query,
        conversationId
      );
      const results = result.items.map((item) => ({
        id: item.id,
        content: item.content,
        sender_name: item.senderName,
        conversation_id: item.conversationId,
        created_at: new Date(item.createdAt).toISOString(),
        rank: item.rank || 0,
      }));
      return limit && results.length > limit
        ? results.slice(0, limit)
        : results;
    },
  });
}
