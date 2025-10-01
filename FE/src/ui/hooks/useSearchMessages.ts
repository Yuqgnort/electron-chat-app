import { ESearchType, ISearchQuery } from "@/core/domain/search/entity";
import { useAppContext } from "@/ui/context";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUserStore } from "./store/useCurrentUser";

export interface SearchResult {
  id: string;
  content: string;
  sender_name: string;
  sender_id?: string;
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
  const { currentUser } = useCurrentUserStore();

  const { conversationId, limit = 50 } = filters;
  const isEnabled = enabled && !!query.trim();

  return useQuery({
    queryKey: [
      "messageSearch",
      query,
      conversationId,
      limit,
      currentUser?.displayName,
    ],
    enabled: isEnabled,
    staleTime,
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error("User must be authenticated to search messages");
      }

      const searchQuery: ISearchQuery = {
        query,
        type: ESearchType.FULL_TEXT,
        conversationId,
        limit,
        currentUserId: currentUser.id,
      };

      const result = await service.search.prefixSearch(searchQuery);
      return result;
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
  const { currentUser } = useCurrentUserStore();

  const { conversationId, limit = 50 } = filters;
  const isEnabled = enabled && !!query.trim();

  return useQuery({
    queryKey: [
      "messageSearchExactPhrase",
      query,
      conversationId,
      limit,
      currentUser?.displayName,
    ],
    enabled: isEnabled,
    staleTime,
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error("User must be authenticated to search messages");
      }
      const searchQuery: ISearchQuery = {
        query,
        type: ESearchType.EXACT_PHRASE,
        conversationId,
        limit,
        currentUserId: currentUser.id,
      };
      const result = await service.search.searchExactPhrase(searchQuery);
      return result;
    },
  });
}
