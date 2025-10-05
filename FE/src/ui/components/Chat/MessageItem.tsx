import { IMsgEntity } from "@/core/domain/msg/entity";
import { formatTime, getStatusIcon } from "@/ui/helper";
import { memo, useEffect, useLayoutEffect, useState } from "react";
import { motion } from "framer-motion";
import Highlighter from "react-highlight-words";

export type TMessageItemProps = {
  message: IMsgEntity;
  isCurrentUser: boolean;
  hightLightId?: string | null;
  highLigthtText?: string | null;
};

export const MessageItem = memo(
  ({
    message,
    isCurrentUser,
    hightLightId,
    highLigthtText,
  }: TMessageItemProps) => {
    const [isHighlighted, setIsHighlighted] = useState(false);

    useLayoutEffect(() => {
      if (hightLightId === message.id || hightLightId === message.localId) {
        setIsHighlighted(true);
        const timer = setTimeout(() => setIsHighlighted(false), 3000);
        return () => clearTimeout(timer);
      }
    }, [hightLightId, message.id, message.localId]);

    return (
      <motion.div
        layout="position"
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.1 }}
        className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg transition-all ${
            isHighlighted
              ? "ring-1 ring-yellow-400 bg-yellow-50 text-gray-800"
              : isCurrentUser
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-900 border border-gray-200"
          }`}
        >
          <p className="text-sm">
            {highLigthtText && isHighlighted ? (
              <Highlighter
                highlightClassName="bg-yellow-200"
                searchWords={[highLigthtText]}
                autoEscape={true}
                textToHighlight={message.content}
              />
            ) : (
              message.content
            )}
          </p>
          <div
            className={`flex items-center justify-end mt-1 space-x-1 ${
              isHighlighted
                ? "text-gray-600"
                : isCurrentUser
                  ? "text-blue-100"
                  : "text-gray-500"
            }`}
          >
            <span className="text-xs">{formatTime(message.createdAt)}</span>
            {isCurrentUser && getStatusIcon(message.status)}
          </div>
        </div>
      </motion.div>
    );
  }
);
