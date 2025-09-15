import { useAppContext } from "@/ui/context";
import { getStatusIcon } from "@/ui/helper";
import { useChatWindowStore } from "@/ui/hooks/store/useChatWindow";
import { useCurrentUserStore } from "@/ui/hooks/store/useCurrentUser";
import { useGetMessagesByConvId } from "@/ui/hooks/tanstack/msg";
import { useEffect, useRef } from "react";

interface MessageListProps {
  receiverUserId: string;
}

export function MessageList({ receiverUserId: userId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useCurrentUserStore();
  const { chatBoxState } = useChatWindowStore();
  const { service } = useAppContext();
  const { data } = useGetMessagesByConvId(service, chatBoxState.conversationId);

  const messages = data || [];

  const currentUserId = currentUser?.id;

  const conversationMessages = messages?.filter(
    (msg) =>
      (msg.senderId === currentUserId && msg.receiverId === userId) ||
      (msg.senderId === userId && msg.receiverId === currentUserId)
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);

  const formatTime = (dateInput: string | Date) => {
    const date =
      typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
      {conversationMessages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">
            No messages yet. Start the conversation!
          </p>
        </div>
      ) : (
        <>
          {conversationMessages.map((message) => {
            const isCurrentUser = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isCurrentUser
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-900 border border-gray-200"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <div
                    className={`flex items-center justify-end mt-1 space-x-1 ${
                      isCurrentUser ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    <span className="text-xs">
                      {formatTime(message.createdAt)}
                    </span>
                    {isCurrentUser && getStatusIcon(message.status)}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
