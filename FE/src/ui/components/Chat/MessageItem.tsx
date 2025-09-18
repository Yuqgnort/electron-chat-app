import { IMsgEntity } from "@/core/domain/msg/entity";
import { formatTime, getStatusIcon } from "@/ui/helper";
import { memo } from "react";
import { motion } from "framer-motion";

export type TMessageItemProps = {
  message: IMsgEntity;
  isCurrentUser: boolean;
};

export const MessageItem = memo(
  ({ message, isCurrentUser }: TMessageItemProps) => {
    return (
      <motion.div
        layout
        initial={{ opacity: 0.5, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
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
            <span className="text-xs">{formatTime(message.createdAt)}</span>
            {isCurrentUser && getStatusIcon(message.status)}
          </div>
        </div>
      </motion.div>
    );
  }
);
