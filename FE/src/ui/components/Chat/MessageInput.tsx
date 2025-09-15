import { SendHorizontal } from "lucide-react";
import { ChangeEvent, KeyboardEvent, useState } from "react";
import { Textarea } from "../core/Textarea";
import { Button } from "../core/Button";

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

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  return (
    <div className="border-t border-gray-200 bg-white px-6 py-4">
      <div className="flex items-start space-x-1">
        <div className="flex-1 relative">
          <Textarea
            placeholder="Type a message..."
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
          />
        </div>
        <Button onClick={handleSend} disabled={!message.trim()}>
          <SendHorizontal />
        </Button>
      </div>
    </div>
  );
}
