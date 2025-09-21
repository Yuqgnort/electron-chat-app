import { IUserEntity } from "@/core/domain/user/entity";
import { useAppContext } from "@/ui/context";
import { useChatWindowStore } from "@/ui/hooks/store/useChatWindow";
import { useCurrentUserStore } from "@/ui/hooks/store/useCurrentUser";
import { useGetConvByUserIds } from "@/ui/hooks/tanstack/conv";
import { useGetUsersWithIgnoreIds } from "@/ui/hooks/tanstack/user";
import { motion } from "framer-motion";

export function UserList() {
  const { service } = useAppContext();
  const { currentUser } = useCurrentUserStore();
  const { chatBoxState, setChatBoxState } = useChatWindowStore();

  const { data: users } = useGetUsersWithIgnoreIds(
    service,
    currentUser ? [currentUser.id] : []
  );

  const { mutateAsync: fetchConversations } = useGetConvByUserIds(service);

  const handleSelectUser = async (user: IUserEntity) => {
    if (!currentUser) throw new Error("Current user is not set");
    try {
      const convs = await fetchConversations([currentUser.id, user.id]);
      setChatBoxState({
        receiverUser: user,
        conversationId: convs ? convs.id : null,
      });
    } catch (error) {
      throw error;
    }
  };

  if (!users) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {users.map((user) => (
          <div
            key={user.id}
            onClick={() => handleSelectUser(user)}
            className={`px-4 py-3 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors ${
              user.id === chatBoxState?.receiverUser?.id
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
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.displayName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  @{user.userName}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
