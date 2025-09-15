import { IConvEntity } from "@/core/domain/conv/entity";
import { IUserEntity } from "@/core/domain/user/entity";
import { useAppContext } from "@/ui/context";
import { getStatusIcon } from "@/ui/helper";
import { useChatWindowStore } from "@/ui/hooks/store/useChatWindow";
import { useCurrentUserStore } from "@/ui/hooks/store/useCurrentUser";
import { useGetConvWithParticipantsByUserId } from "@/ui/hooks/tanstack/conv";
import { MessagesSquare } from "lucide-react";

export function ConvList() {
  const { service } = useAppContext();
  const { currentUser } = useCurrentUserStore();
  const { setChatBoxState } = useChatWindowStore();

  const { data: conversations } = useGetConvWithParticipantsByUserId(
    service,
    currentUser?.id
  );

  const onSelectConversation = (
    conversation: IConvEntity,
    otherParticipants: IUserEntity[]
  ) => {
    setChatBoxState({
      conversationId: conversation.id,
      receiverUser: otherParticipants.find(
        (user) => user.id !== currentUser?.id
      ),
    });
  };

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
        {conversations.map((conv) => {
          const otherUser = conv.otherParticipants[0];
          if (!otherUser) return null;
          return (
            <div
              key={conv.conversation.id}
              onClick={() =>
                onSelectConversation(conv.conversation, conv.otherParticipants)
              }
              className={`px-4 py-3 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                currentUser?.id === otherUser.id
                  ? "bg-blue-50 border-l-4 border-l-blue-500"
                  : ""
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {otherUser.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {otherUser.displayName}
                    </p>
                    <div className="text-xs text-gray-400">
                      {conv.lastMessage
                        ? new Date(
                            conv.lastMessage.createdAt
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </div>
                  </div>
                  <div className="mt-1 mb-1"></div>
                  <div className="flex gap-1 justify-between items-center">
                    <p className="text-xs text-gray-500 truncate">
                      {conv.lastMessage
                        ? conv.lastMessage.content
                        : "No messages yet"}
                    </p>
                    <div className=" text-gray-400">
                      {conv.lastMessage &&
                        getStatusIcon(conv.lastMessage.status)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
