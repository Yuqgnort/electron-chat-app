import { IUserEntity } from "@/core/domain/user/entity";
import { useAppContext } from "@/ui/context";
import { useUserStatus } from "@/ui/hooks";
import { cn } from "@/ui/lib/utils";
import { motion } from "framer-motion";
import { useEffect } from "react";

type TUserListItemProps = {
  user: IUserEntity;
  handleSelectUser: (user: IUserEntity) => void;
  receiverUserId?: string | null;
};

const UserListItem = ({
  user,
  handleSelectUser,
  receiverUserId,
}: TUserListItemProps) => {
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

  useEffect(() => {
    if (user.id) {
      ensureUserStatus(user.id);
    }
  }, [user.id, ensureUserStatus]);

  return (
    <div
      key={user.id}
      onClick={() => handleSelectUser(user)}
      className={`px-4 py-3 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors ${
        user.id === receiverUserId
          ? "bg-blue-50 border-l-4 border-l-blue-500"
          : ""
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">
              {user.displayName.charAt(0).toUpperCase()}
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user.displayName}
          </p>
          <p className="text-xs text-gray-500 truncate">@{user.userName}</p>
        </div>
      </div>
    </div>
  );
};

export default UserListItem;
