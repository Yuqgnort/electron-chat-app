import { IUserEntity } from "@/core/domain/user/entity";
import { useAppContext } from "@/ui/context";
import { useChatWindowStore } from "@/ui/hooks/store/useChatWindow";
import { useCurrentUserStore } from "@/ui/hooks/store/useCurrentUser";
import { useGetConvByUserIds } from "@/ui/hooks/tanstack/conv";
import { useGetUsersWithIgnoreIds } from "@/ui/hooks/tanstack/user";
import { motion } from "framer-motion";
import UserListItem from "./UserListItem";

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
        highlightedMessageId: null,
        highlightedMessageText: null,
        cursor: null,
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
          <UserListItem
            key={user.id}
            handleSelectUser={handleSelectUser}
            user={user}
            receiverUserId={chatBoxState.receiverUser?.id}
          />
        ))}
      </div>
    </div>
  );
}
