import { useAppContext } from "@/ui/context";
import { useQuery } from "@tanstack/react-query";
import { ESearchType, ESearchScope } from "@/core/domain/search/entity";
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
    queryFn: async (): Promise<SearchResult[]> => {
      if (!currentUser?.id) {
        throw new Error("User must be authenticated to search messages");
      }

      const searchQuery = {
        query,
        type: ESearchType.FULL_TEXT,
        scope: conversationId
          ? ESearchScope.CURRENT_CONVERSATION
          : ESearchScope.ALL_CONVERSATIONS,
        conversationId,
        limit,
        excludeCurrentUserName: currentUser?.displayName,
      };

      const result = conversationId
        ? await service.search.searchInConversation(
            query,
            conversationId,
            currentUser.id,
            currentUser?.displayName
          )
        : await service.search.performSearch(
            searchQuery,
            currentUser.id,
            currentUser?.displayName
          );

      return result.items.map((item) => ({
        id: item.id,
        content: item.content,
        sender_name: item.senderName,
        sender_id: item.senderId,
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
    queryFn: async (): Promise<SearchResult[]> => {
      if (!currentUser?.id) {
        throw new Error("User must be authenticated to search messages");
      }
      const result = await service.search.searchExactPhrase(
        query,
        currentUser.id,
        conversationId,
        currentUser?.displayName
      );
      const results = result.items.map((item) => ({
        id: item.id,
        content: item.content,
        sender_name: item.senderName,
        sender_id: item.senderId,
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
