import { useQueryClient } from "@tanstack/react-query";
import { ChatWindow } from "./components/Chat/ChatWindow";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/core/Select";
import { MainLayout } from "./components/Layout/MainLayout";
import { useAppContext } from "./context";
import { useChatWindowStore } from "./hooks/store/useChatWindow";
import { useCurrentUserStore } from "./hooks/store/useCurrentUser";
import { GET_CONV_WITH_OTHER_PARTICIPANTS_BY_USER_ID } from "./hooks/tanstack/conv";
import { GET_MESSAGE_BY_CONV_ID_QUERY_KEY } from "./hooks/tanstack/msg";
import { useGetUsers } from "./hooks/tanstack/user";
import { useConnectSocket } from "./hooks/useConnectSocket";
import { IUserEntity } from "@/core/domain/user/entity";
import { c } from "node_modules/framer-motion/dist/types.d-Cjd591yU";

////////////////////

export function App() {
  const queryClient = useQueryClient();
  const { service, socket } = useAppContext();

  const { chatBoxState, setChatBoxState } = useChatWindowStore();
  const { currentUser, setCurrentUser } = useCurrentUserStore();

  const { data: users } = useGetUsers(service);

  const ensureConversationId = async (): Promise<string> => {
    if (chatBoxState?.conversationId) {
      return chatBoxState.conversationId;
    }
    if (!chatBoxState?.receiverUser || !currentUser) {
      throw new Error("Receiver user or current user is not set");
    }
    const conv = await service.conv.createConvWithParticipants(
      { title: "New Conversation" },
      [currentUser.id, chatBoxState.receiverUser.id]
    );

    if (!conv) {
      throw new Error("Failed to create or get conversation");
    }

    setChatBoxState({
      ...chatBoxState,
      conversationId: conv.id,
    });

    return conv.id;
  };

  const handleSendMessage = async (content: string) => {
    if (
      !chatBoxState?.receiverUser ||
      !chatBoxState?.receiverUser?.id ||
      !currentUser
    )
      return;
    try {
      const conversationId = await ensureConversationId();
      await service.msg.sendMessage({
        content,
        senderId: currentUser.id,
        conversationId,
        receiverId: chatBoxState.receiverUser.id,
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_CONV_WITH_OTHER_PARTICIPANTS_BY_USER_ID],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_MESSAGE_BY_CONV_ID_QUERY_KEY, conversationId],
      });
    } catch (error) {
      throw error;
    }
  };

  const handleLogInAsUser = (userId: string, users: IUserEntity[]) => {
    if (!userId || !users) return;
    const selected = users.find((u) => u.id === userId);
    setCurrentUser(selected || null);
  };

  useConnectSocket(socket, currentUser?.id);

  if (!users) return null;

  if (!currentUser) {
    return (
      <div className="w-full h-screen flex flex-col gap-2 items-center justify-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Select Current User
        </h2>
        <Select onValueChange={(value) => handleLogInAsUser(value, users)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select a user" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id.toString()}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <MainLayout>
      <ChatWindow
        receiverUser={chatBoxState?.receiverUser}
        onSendMessage={handleSendMessage}
      />
    </MainLayout>
  );
}
