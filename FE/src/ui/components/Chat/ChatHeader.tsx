import { IUserEntity } from "@/core/domain/user/entity";
import { useAppContext } from "@/ui/context";
import { IUserStatus, useUserStatus } from "@/ui/hooks";
import { cn } from "@/ui/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useEffect } from "react";
import { Button } from "../core/Button";

export function ChatHeader({
  receiverUser: user,
}: {
  receiverUser: IUserEntity;
}) {
  const { eventBus, socket } = useAppContext();
  const { isUserOnline, getUserStatus, ensureUserStatus, hasInitialData } =
    useUserStatus(socket, eventBus);

  const isOnline = isUserOnline(user.id);
  const userStatus = getUserStatus(user.id);

  const getStatusIndicatorClass = () => {
    if (!hasInitialData && !userStatus) {
      return "bg-gray-300";
    }
    return isOnline ? "bg-green-500" : "bg-gray-400";
  };

  const lastSeenToNow = (userStatus?: IUserStatus) => {
    if (!userStatus) return "Offline";
    if (isOnline) return "Online";
    return formatDistanceToNow(new Date(userStatus.lastSeen), {
      addSuffix: true,
    });
  };

  useEffect(() => {
    if (user.id) {
      ensureUserStatus(user.id);
    }
  }, [user.id, ensureUserStatus]);

  if (!user) return null;

  return (
    <div className="px-6 py-4 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {user.name.charAt(0).toUpperCase()}
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
            />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {user.displayName}
            </p>
            <span className="text-xs text-gray-500">
              {lastSeenToNow(userStatus)}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="size-8">
            <Search />
          </Button>
        </div>
      </div>
    </div>
  );
}
