import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IConvEntity } from "@/core/domain/conv/entity";
import { IUserEntity } from "@/core/domain/user/entity";
import { IMsgEntity } from "@/core/domain/msg/entity";
import { getStatusIcon } from "@/ui/helper";
import { cn } from "@/ui/lib/utils";
import { useAppContext } from "@/ui/context";
import { useUserStatus } from "@/ui/hooks";

interface ConvItemProps {
  conversation: IConvEntity;
  otherParticipants: IUserEntity[];
  lastMessage?: IMsgEntity | null;
  isSelected?: boolean;
  isHaveNewMessage?: boolean;
  onClick: (
    conversation: IConvEntity,
    otherParticipants: IUserEntity[]
  ) => void;
}

export const ConvItem = memo(function ConvItem({
  conversation,
  otherParticipants,
  lastMessage,
  isSelected = false,
  isHaveNewMessage = true,
  onClick,
}: ConvItemProps) {
  const otherUser = otherParticipants[0];
  const { eventBus, socket } = useAppContext();
  const { isUserOnline, getUserStatus, ensureUserStatus, hasInitialData } =
    useUserStatus(socket, eventBus);

  const isOnline = isUserOnline(otherUser?.id || "");
  const userStatus = getUserStatus(otherUser?.id || "");

  const getStatusIndicatorClass = () => {
    if (!hasInitialData && !userStatus) {
      return "bg-gray-300";
    }
    return isOnline ? "bg-green-500" : "bg-gray-400";
  };

  useEffect(() => {
    if (otherUser?.id) {
      ensureUserStatus(otherUser.id);
    }
  }, [otherUser?.id, ensureUserStatus]);

  if (!otherUser) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick(conversation, otherParticipants)}
      className={cn(
        `px-4 py-3 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors`,
        isSelected && "bg-blue-50 border-l-4 border-l-blue-500"
      )}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">
              {otherUser.displayName.charAt(0).toUpperCase()}
            </span>
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full",
              getStatusIndicatorClass()
            )}
            title={
              !hasInitialData && !userStatus
                ? "Đang tải trạng thái..."
                : isOnline
                  ? "Đang online"
                  : "Offline"
            }
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-gray-900 truncate">
              {otherUser.displayName}
            </p>
            <div className="text-xs text-gray-400">
              {lastMessage
                ? new Date(lastMessage.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </div>
          </div>
          <div className="mt-1 mb-1"></div>
          <div className="flex gap-1 justify-between items-center">
            <p
              className={cn(
                "text-xs truncate",
                isHaveNewMessage
                  ? "font-semibold text-gray-900"
                  : "text-gray-500"
              )}
            >
              {lastMessage ? lastMessage.content : "No messages yet"}
            </p>
            <AnimatePresence mode="wait">
              {lastMessage && (
                <motion.div
                  key={lastMessage.status}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="text-gray-400"
                >
                  {getStatusIcon(lastMessage.status)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
