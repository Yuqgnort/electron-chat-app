import { useChatWindowStore } from "@/ui/hooks/store/useChatWindow";
import { useSimpleTypingListener } from "../../hooks/useSimpleTypingListener";

export function SimpleTypingIndicator() {
  const { isAnyoneTyping } = useSimpleTypingListener();
  const {
    chatBoxState: { receiverUser },
  } = useChatWindowStore();

  if (!isAnyoneTyping) {
    return null;
  }

  return (
    <div className="left-0 -top-[18px] px-4 absolute inline text-xs text-gray-500 bg-white rounded-tr-sm border-t border-r border-b">
      <div className="flex items-end space-x-1">
        <span>
          {receiverUser ? receiverUser.displayName : "Someone"} is typing
        </span>
        <div className="flex space-x-1 pb-[2px]">
          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
          <div
            className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
      </div>
    </div>
  );
}
