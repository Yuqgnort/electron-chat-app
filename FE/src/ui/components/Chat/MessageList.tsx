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
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import { MessageItem } from "./MessageItem";

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

export function MessageList({ receiverUserId: userId }: TMessageListProps) {
  const queryClient = useQueryClient();
  const { service, eventBus } = useAppContext();
  const { currentUser } = useCurrentUserStore();
  const { chatBoxState } = useChatWindowStore();

  const {
    data: messages = [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetMessagesByConvId(service, chatBoxState.conversationId);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 5,
    getItemKey: (index) => messages[index]?.localId,
  });

  const measureElement = rowVirtualizer.measureElement;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  useSubscribeEventBus(eventBus, "MsgUpdated", (payload) => {
    updateMessageInCache(payload, queryClient, chatBoxState.conversationId);
  });

  useSubscribeEventBus(eventBus, "MsgCreated", (payload) => {
    addNewMessageToLastPageCache(payload, queryClient, payload.conversationId);
    requestAnimationFrame(() => {
      const totalSize = rowVirtualizer.getTotalSize();
      parentRef.current?.scrollTo({ top: totalSize + 16 });
    });
  });

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        const totalSize = rowVirtualizer.getTotalSize();
        parentRef.current?.scrollTo({ top: totalSize + 16 });
      });
    }
  }, [messages.length, rowVirtualizer]);

  if (!currentUser) return null;

  return (
    <div
      ref={parentRef}
      className="flex-1 h-full px-6 py-4 bg-gray-50 overflow-y-auto"
      onScroll={handleScroll}
    >
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const message = messages[virtualRow.index];
          return (
            <div
              key={message.localId}
              ref={(el) => {
                if (el) measureElement(el);
              }}
              data-index={virtualRow.index}
              className="absolute top-0 left-0 w-full py-0.5"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MessageItem
                message={message}
                isCurrentUser={message.senderId === currentUser.id}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
