import { IUserEntity } from "@/core/domain/user/entity";
import { MessageCircleDashed } from "lucide-react";
import { ChatHeader } from "./ChatHeader";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";

interface ChatWindowProps {
  receiverUser?: IUserEntity;
  onSendMessage?: (content: string) => void;
}

export function ChatWindow({ receiverUser, onSendMessage }: ChatWindowProps) {
  if (!receiverUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <MessageCircleDashed />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Welcome to Chat App
          </h3>
          <p className="text-gray-500">Select a contact to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <ChatHeader receiverUser={receiverUser} />
      <MessageList receiverUserId={receiverUser.id} />
      <MessageInput
        onSendMessage={onSendMessage}
        receiverUserId={receiverUser.id}
      />
    </div>
  );
}
