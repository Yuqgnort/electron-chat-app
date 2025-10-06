import { IMsgEntity } from "@/core/domain/msg/entity";
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
import { Button } from "../core/Button";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useMemo } from "react";

const updateMessageInCache = (
  payload: IMsgEntity,
  queryClient: QueryClient,
  conversationId?: string | null,
  limit: number = 50,
  initialCursor: number | null = null
) => {
  if (!conversationId) return;
  queryClient.setQueryData<TGetMessagesByConvIdQueryData>(
    [GET_MESSAGE_BY_CONV_ID_QUERY_KEY, conversationId, limit, initialCursor],
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
  limit: number = 50,
  initialCursor: number | null = null
) => {
  if (!conversationId) return;
  queryClient.setQueryData<TGetMessagesByConvIdQueryData>(
    [GET_MESSAGE_BY_CONV_ID_QUERY_KEY, conversationId, limit, initialCursor],
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

export function MessageListWrapper() {
  const queryClient = useQueryClient();
  const { service, eventBus } = useAppContext();
  const { currentUser } = useCurrentUserStore();
  const { chatBoxState, setChatBoxState } = useChatWindowStore();

  const {
    data: messages = [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    hasPreviousPage,
    fetchPreviousPage,
  } = useGetMessagesByConvId(
    service,
    chatBoxState.conversationId,
    20,
    chatBoxState?.cursor
  );

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

  const handleJumpToNewest = () => {
    setChatBoxState({
      ...chatBoxState,
      cursor: null,
      highlightedMessageId: null,
      highlightedMessageText: null,
    });
  };

  const firstMessageId = messages.length > 0 ? 1 : 0;
  const allMessagesCount = messages.length;

  useSubscribeEventBus(eventBus, "MsgUpdated", (payload) => {
    updateMessageInCache(
      payload,
      queryClient,
      chatBoxState.conversationId,
      20,
      chatBoxState?.cursor
    );
  });

  useSubscribeEventBus(eventBus, "MsgCreated", (payload) => {
    console.log("MsgCreated event received:", payload);

    if (payload.conversationId !== chatBoxState.conversationId) return;
    addNewMessageToLastPageCache(
      payload,
      queryClient,
      payload.conversationId,
      20,
      chatBoxState?.cursor
    );
  });

  useSubscribeEventBus(eventBus, "ConvCreated", async (payload) => {
    if (!chatBoxState.conversationId && chatBoxState.receiverUser) {
      const convKey = [currentUser?.id, chatBoxState.receiverUser.id]
        .sort()
        .join(":");
      if (payload.key === convKey) {
        setChatBoxState({
          ...chatBoxState,
          conversationId: payload.id,
        });
      }
    }
  });

  if (!currentUser) return null;

  return (
    <div className="relative h-full flex flex-col">
      <MessageList
        direction={chatBoxState.cursor ? "around" : "latest"}
        messages={messages}
        allMessagesCount={allMessagesCount}
        firstMessageId={firstMessageId}
        isLoadingTop={isFetchingNextPage}
        isLoadingBottom={isFetchingPreviousPage}
        highlightedMessageId={chatBoxState?.highlightedMessageId}
        highlightedMessageText={chatBoxState?.highlightedMessageText}
        currentUserId={currentUser.id}
        isCanLoadMoreBottom={hasPreviousPage}
        isCanLoadMoreTop={hasNextPage}
        onLoadMoreTop={handleLoadMoreTop}
        onLoadMoreBottom={handleLoadMoreBottom}
      />
      {chatBoxState.cursor && hasPreviousPage && (
        <Button
          variant="outline"
          size="icon"
          className="absolute bottom-4 right-4 "
          onClick={handleJumpToNewest}
        >
          <ArrowDownIcon />
        </Button>
      )}
    </div>
  );
}
