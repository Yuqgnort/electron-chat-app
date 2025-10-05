import { SendHorizontal } from "lucide-react";
import { ChangeEvent, KeyboardEvent, useState } from "react";
import { Textarea } from "../core/Textarea";
import { Button } from "../core/Button";
import { useSimpleTyping } from "@/ui/hooks/useSimpleTyping";
import { useChatWindowStore } from "@/ui/hooks/store/useChatWindow";
import { useCurrentUserStore } from "@/ui/hooks/store/useCurrentUser";
import { SimpleTypingIndicator } from "./SimpleTypingIndicator";

///////////////////////

interface MessageInputProps {
  receiverUserId: string;
  onSendMessage?: (content: string) => void;
}

///////////////////////

export function MessageInput({
  receiverUserId: userId,
  onSendMessage,
}: MessageInputProps) {
  const [message, setMessage] = useState("");

  const { chatBoxState } = useChatWindowStore();
  const { currentUser } = useCurrentUserStore();

  const { handleInputChange } = useSimpleTyping({
    receiverUserId: userId,
    typingTimeout: 2000,
  });

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage?.(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputOnChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    handleInputChange(value);
  };

  return (
    <div className="relative border-t border-gray-200 bg-white px-6 py-4">
      <div className="flex items-start space-x-1">
        <div className="flex-1 relative">
          <Textarea
            placeholder="Type a message..."
            value={message}
            onChange={handleInputOnChange}
            onKeyDown={handleKeyPress}
          />
        </div>
        <Button onClick={handleSend} disabled={!message.trim()}>
          <SendHorizontal />
        </Button>
      </div>
      <SimpleTypingIndicator />
    </div>
  );
}
