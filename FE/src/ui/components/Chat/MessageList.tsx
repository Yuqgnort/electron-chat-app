import { IMsgEntity, TMsgDirection } from "@/core/domain/msg/entity";
import { useAppContext } from "@/ui/context";
import { mergeKSortedArrays } from "@/ui/helper";
import { useChatWindowStore } from "@/ui/hooks/store/useChatWindow";
import { useCurrentUserStore } from "@/ui/hooks/store/useCurrentUser";
import {
  GET_MESSAGE_BY_CONV_ID_QUERY_KEY,
  TGetMessagesByConvIdQueryData,
  useGetMessagesByConvId,
} from "@/ui/hooks/tanstack/msg";
import { useStickToBottomOnLoad } from "@/ui/hooks/useStickToBottomOnLoad";
import {
  useSubscribeEventBus,
  useSubscribeEventBusLayout,
} from "@/ui/hooks/useSubscribeEventBus";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef } from "react";
import { MessageItem } from "./MessageItem";
import { useScrollToBottom } from "@/ui/hooks/useScrollToBottom";

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

export function MessageList({ receiverUserId: userId }: TMessageListProps) {
  const queryClient = useQueryClient();
  const { service, eventBus } = useAppContext();

  const { currentUser } = useCurrentUserStore();
  const { chatBoxState } = useChatWindowStore();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetMessagesByConvId(service, chatBoxState.conversationId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const messages = mergeKSortedArrays<IMsgEntity>({
    arrays: data?.pages.map((page) => page?.data ?? []) || [],
    compareFn: (a, b) => a.createdAt - b.createdAt,
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  useSubscribeEventBus(eventBus, "MsgUpdated", (payload) => {
    updateMessageInCache(payload, queryClient, chatBoxState.conversationId);
  });

  useScrollToBottom({
    containerRef,
    dependencies: [messages],
  });

  useStickToBottomOnLoad({
    containerRef,
    deps: [chatBoxState.conversationId],
  });

  if (!messages || !currentUser) return null;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50"
      onScroll={handleScroll}
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">
            No messages yet. Start the conversation!
          </p>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <MessageItem
              message={message}
              key={message.localId}
              isCurrentUser={message.senderId === currentUser.id}
            />
          ))}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
