import { IConvEntity } from "@/core/domain/conv/entity";
import { IUserEntity } from "@/core/domain/user/entity";
import { useAppContext } from "@/ui/context";
import { useChatWindowStore } from "@/ui/hooks/store/useChatWindow";
import { useCurrentUserStore } from "@/ui/hooks/store/useCurrentUser";
import { useGetConvWithParticipantsByUserId } from "@/ui/hooks/tanstack/conv";
import { useSubscribeEventBus } from "@/ui/hooks/useSubscribeEventBus";
import { MessagesSquare } from "lucide-react";
import { useState } from "react";
import { ConvItem } from "./ConvItem";
import { SidebarTab } from "./Sidebar";

export function ConvList({ activeTab }: { activeTab: SidebarTab }) {
  const { service, eventBus } = useAppContext();
  const { currentUser } = useCurrentUserStore();
  const { setChatBoxState, chatBoxState } = useChatWindowStore();
  const [isHaveNewMessage, setIsHaveNewMessage] = useState(false);

  const { data: conversations, refetch } = useGetConvWithParticipantsByUserId(
    service,
    currentUser?.id,
    activeTab === SidebarTab.CONVERSATIONS
  );

  const conversationsSorted = conversations
    ? [...conversations].sort((a, b) => {
        const aTime = a.lastMessage ? a.lastMessage.createdAt : 0;
        const bTime = b.lastMessage ? b.lastMessage.createdAt : 0;
        return bTime - aTime;
      })
    : [];

  const onSelectConversation = (
    conversation: IConvEntity,
    otherParticipants: IUserEntity[]
  ) => {
    setChatBoxState({
      conversationId: conversation.id,
      receiverUser:
        otherParticipants.find((user) => user.id !== currentUser?.id) || null,
      highlightedMessageId: null,
      highlightedMessageText: null,
      cursor: null,
    });
    setIsHaveNewMessage(false);
  };

  useSubscribeEventBus(eventBus, "ConvCreated", async () => {
    await refetch();
  });

  useSubscribeEventBus(eventBus, "MsgCreated", async () => {
    await refetch();
  });

  useSubscribeEventBus(eventBus, "MsgUpdated", async () => {
    await refetch();
  });

  if (!currentUser || !conversations || conversations.length === 0) {
    return (
      <div className="flex pt-6 flex-col items-center justify-center h-full">
        <MessagesSquare className="w-16 h-16 text-gray-200" />
        <div className="text-center mt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            No conversations yet
          </h3>
          <p className="text-xs text-gray-500">
            Start a conversation to see it here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {conversationsSorted.map((conv) => {
          const otherUser = conv.otherParticipants[0];
          if (!otherUser) return null;
          return (
            <ConvItem
              key={conv.conversation.id}
              conversation={conv.conversation}
              otherParticipants={conv.otherParticipants}
              lastMessage={conv.lastMessage}
              isSelected={conv.conversation.id === chatBoxState.conversationId}
              onClick={onSelectConversation}
              isHaveNewMessage={isHaveNewMessage}
            />
          );
        })}
      </div>
    </div>
  );
}
