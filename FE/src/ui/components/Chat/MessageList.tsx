import { IMsgEntity } from "@/core/domain/msg/entity";
import { useAppContext } from "@/ui/context";
import { Loader2, MessageCircleMore } from "lucide-react";
import React, { useEffect, useMemo, useRef } from "react";
import { MessageItem } from "./MessageItem";

type TMessageList2Props = {
  direction?: "around" | "latest";
  messages: IMsgEntity[];
  allMessagesCount: number;
  firstMessageId: number;
  isLoadingTop?: boolean;
  isLoadingBottom?: boolean;
  highlightedMessageId?: string | null;
  highlightedMessageText?: string | null;
  currentUserId: string;
  isCanLoadMoreTop?: boolean;
  isCanLoadMoreBottom?: boolean;
  onLoadMoreTop?: () => Promise<void>;
  onLoadMoreBottom?: () => Promise<void>;
};

function groupMessagesByDate(messages: IMsgEntity[]) {
  const result: { date: string; messages: IMsgEntity[] }[] = [];

  let lastDate: string | null = null;
  messages.forEach((msg) => {
    const date = new Date(msg.createdAt).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    if (date !== lastDate) {
      result.push({ date, messages: [msg] });
      lastDate = date;
    } else {
      result[result.length - 1].messages.push(msg);
    }
  });

  return result;
}

const MessageList = ({
  messages,
  isLoadingTop = false,
  isLoadingBottom = false,
  highlightedMessageId,
  highlightedMessageText,
  currentUserId,
  isCanLoadMoreTop,
  isCanLoadMoreBottom,
  direction = "latest",
  onLoadMoreTop,
  onLoadMoreBottom,
}: TMessageList2Props) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const isInitialLoad = useRef(true);
  const previousScrollHeight = useRef(0);
  const shouldMaintainScroll = useRef(false);
  const hasScrolledRef = useRef(false);

  const groupedMessages = useMemo(
    () => groupMessagesByDate(messages),
    [messages]
  );

  useEffect(() => {
    if (
      isInitialLoad.current &&
      messages.length > 0 &&
      chatContainerRef.current &&
      direction === "latest"
    ) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
      isInitialLoad.current = false;
    }

    return () => {
      isInitialLoad.current = true;
    };
  }, [messages]);

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [highlightedMessageId]);

  useEffect(() => {
    if (highlightedMessageId && chatContainerRef.current) {
      if (!hasScrolledRef.current) {
        const el = document.getElementById(`msg-${highlightedMessageId}`);
        if (el) {
          el.scrollIntoView({
            behavior: "auto",
            block: "center",
          });
          hasScrolledRef.current = true; // Đánh dấu đã scroll
        }
      }
    }
  }, [highlightedMessageId, messages]);

  useEffect(() => {
    if (shouldMaintainScroll.current && chatContainerRef.current) {
      const currentScrollHeight = chatContainerRef.current.scrollHeight;
      const scrollDiff = currentScrollHeight - previousScrollHeight.current;
      if (scrollDiff > 0) {
        chatContainerRef.current.scrollTop = lastScrollTop.current + scrollDiff;
      }
      shouldMaintainScroll.current = false;
      previousScrollHeight.current = 0;
    }
  }, [messages]);

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    if (
      scrollTop < 100 &&
      scrollTop < lastScrollTop.current &&
      onLoadMoreTop &&
      !isLoadingTop &&
      isCanLoadMoreTop
    ) {
      shouldMaintainScroll.current = true;
      previousScrollHeight.current = scrollHeight;
      await onLoadMoreTop();
    }

    if (
      scrollHeight - scrollTop - clientHeight < 100 &&
      scrollTop > lastScrollTop.current &&
      onLoadMoreBottom &&
      !isLoadingBottom &&
      isCanLoadMoreBottom
    ) {
      await onLoadMoreBottom();
    }
    lastScrollTop.current = scrollTop;
  };

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100">
        <div
          ref={chatContainerRef}
          className="flex-1 flex-col gap-4 overflow-y-auto p-4 flex items-center justify-center"
        >
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <MessageCircleMore
              width={48}
              height={48}
              className="text-gray-400"
            />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-800">
                No messages yet
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Start the conversation and see your messages appear here
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {isLoadingTop && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}
        {!isCanLoadMoreTop && !isLoadingTop && messages.length > 0 && (
          <div className="text-center text-gray-500 text-sm py-2">
            📌 The oldest message
          </div>
        )}
        {groupedMessages.map((section) => (
          <div key={section.date}>
            <div className="sticky top-0 z-10 flex items-center justify-center my-4">
              <div className="flex items-center gap-3 px-3">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="px-3 py-1 bg-gray-200 text-xs font-medium text-gray-700 rounded-md">
                  {section.date}
                </span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
            </div>
            {section.messages.map((message) => {
              const isCurrentUser = message.senderId === currentUserId;
              return (
                <div
                  key={message.id + message.localId}
                  id={`msg-${message.id || message.localId}`}
                  className="mb-3"
                >
                  <MessageItem
                    message={message}
                    isCurrentUser={isCurrentUser}
                    hightLightId={highlightedMessageId}
                    highLigthtText={highlightedMessageText}
                  />
                </div>
              );
            })}
          </div>
        ))}
        {isLoadingBottom && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}
        {!isCanLoadMoreBottom && !isLoadingBottom && messages.length > 0 && (
          <div className="text-center text-gray-500 text-sm py-2">
            📌 Latest Message
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageList;
