import { IMsgEntity, TMsgDirection } from "@/core/domain/msg/entity";
import { useAppContext } from "@/ui/context";
import { useChatWindowStore } from "@/ui/hooks/store/useChatWindow";
import { useCurrentUserStore } from "@/ui/hooks/store/useCurrentUser";
import {
  GET_MESSAGE_BY_CONV_ID_QUERY_KEY,
  TGetMessagesByConvIdQueryData,
  useGetMessagesByConvId,
} from "@/ui/hooks/tanstack/msg";
import { useSubscribeEventBus } from "@/ui/hooks/useSubscribeEventBus";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import MessageList from "./MessageList";

type TMessageListProps = {
  receiverUserId: string;
};

const updateMessageInCache = (
  payload: IMsgEntity,
  queryClient: QueryClient,
  conversationId?: string | null,
  limit: number = 20,
  direction: TMsgDirection = "older"
) => {
  if (!conversationId) return;
  queryClient.setQueryData<TGetMessagesByConvIdQueryData>(
    [GET_MESSAGE_BY_CONV_ID_QUERY_KEY, conversationId, limit, direction],
    (oldData) => {
      if (!oldData || !oldData.pages) return oldData;
      const rs = {
        ...oldData,
        pages: oldData.pages.map((page) =>
          page
            ? {
                ...page,
                data: page.data.map((msg) =>
                  msg.localId === payload.localId
                    ? { ...msg, status: payload.status }
                    : msg
                ),
              }
            : page
        ),
      };
      return rs;
    }
  );
};

const addNewMessageToLastPageCache = (
  payload: IMsgEntity,
  queryClient: QueryClient,
  conversationId?: string | null,
  limit: number = 20,
  direction: TMsgDirection = "older"
) => {
  if (!conversationId) return;
  queryClient.setQueryData<TGetMessagesByConvIdQueryData>(
    [GET_MESSAGE_BY_CONV_ID_QUERY_KEY, conversationId, limit, direction],
    (oldData) => {
      if (!oldData || !oldData.pages || oldData.pages.length === 0) {
        return {
          pages: [
            {
              data: [payload],
              nextCursor: null,
              prevCursor: null,
            },
          ],
          pageParams: [0],
        };
      }

      const lastPageIndex = oldData.pages.length - 1;
      const lastPage = oldData.pages[lastPageIndex];

      const updatedLastPage = lastPage
        ? {
            ...lastPage,
            data: [...lastPage.data, payload],
          }
        : {
            data: [payload],
            nextCursor: null,
            prevCursor: null,
          };

      const updatedPages = [...oldData.pages];
      updatedPages[lastPageIndex] = updatedLastPage;

      return {
        ...oldData,
        pages: updatedPages,
      };
    }
  );
};

export function MessageListWrapper({
  receiverUserId: userId,
}: TMessageListProps) {
  const queryClient = useQueryClient();
  const { service, eventBus } = useAppContext();
  const { currentUser } = useCurrentUserStore();
  const { chatBoxState } = useChatWindowStore();

  const {
    data: messages = [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    hasPreviousPage,
    fetchPreviousPage,
  } = useGetMessagesByConvId(service, chatBoxState.conversationId);

  useSubscribeEventBus(eventBus, "MsgUpdated", (payload) => {
    updateMessageInCache(payload, queryClient, chatBoxState.conversationId);
  });

  useSubscribeEventBus(eventBus, "MsgCreated", (payload) => {
    if (payload.conversationId !== chatBoxState.conversationId) return;
    addNewMessageToLastPageCache(payload, queryClient, payload.conversationId);
  });

  if (!currentUser) return null;

  const handleLoadMoreTop = async () => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  };

  const handleLoadMoreBottom = async () => {
    if (hasPreviousPage && !isFetchingPreviousPage) {
      await fetchPreviousPage();
    }
  };

  const handleSearchMessage = async (messageId: number) => {
    console.log("Searching for message:", messageId);
    // TODO: Implement search logic to jump to specific message
  };

  const firstMessageId = messages.length > 0 ? 1 : 0;
  const lastMessageId = messages.length;
  const allMessagesCount = messages.length;

  return (
    <MessageList
      messages={messages}
      allMessagesCount={allMessagesCount}
      firstMessageId={firstMessageId}
      lastMessageId={lastMessageId}
      isLoadingTop={isFetchingNextPage}
      isLoadingBottom={isFetchingPreviousPage}
      highlightedMessageId={chatBoxState?.highlightedMessageId}
      highlightedMessageText={chatBoxState?.highlightedMessageText}
      currentUserId={currentUser.id}
      isCanLoadMoreBottom={hasPreviousPage}
      isCanLoadMoreTop={hasNextPage}
      onLoadMoreTop={handleLoadMoreTop}
      onLoadMoreBottom={handleLoadMoreBottom}
      onSearchMessage={handleSearchMessage}
    />
  );
}
