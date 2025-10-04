import { IMsgEntity } from "@/core/domain/msg/entity";
import { Loader2 } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { MessageItem } from "./MessageItem";

type TMessageList2Props = {
  direction?: "around" | "latest";
  messages: IMsgEntity[];
  allMessagesCount: number;
  firstMessageId: number;
  lastMessageId: number;
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

const MessageList = ({
  messages,
  firstMessageId,
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

  // useEffect(() => {
  //   if (highlightedMessageId) {
  //     setTimeout(() => {
  //       const targetElement = document.getElementById(
  //         `msg-${highlightedMessageId}`
  //       );
  //       if (targetElement) {
  //         targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
  //       }
  //     }, 100);
  //   }
  // }, [highlightedMessageId]);

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    // Load more at top
    if (
      scrollTop < 100 &&
      scrollTop < lastScrollTop.current &&
      onLoadMoreTop &&
      !isLoadingTop &&
      firstMessageId
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
        {!isCanLoadMoreBottom && (
          <div className="text-center text-gray-500 text-sm py-2">
            📌 The oldest message
          </div>
        )}
        {messages.map((message) => {
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
        {isLoadingBottom && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}
        {!isCanLoadMoreTop && (
          <div className="text-center text-gray-500 text-sm py-2">
            📌 Latest Message
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageList;
