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
import { useGetUsers } from "./hooks/tanstack/user";
import { GET_MESSAGE_BY_CONV_ID_QUERY_KEY } from "./hooks/tanstack/msg";

////////////////////

export function App() {
  const { service } = useAppContext();
  const queryClient = useQueryClient();

  const { chatBoxState, setChatBoxState } = useChatWindowStore();
  const { currentUser, setCurrentUser } = useCurrentUserStore();

  const { data: users } = useGetUsers(service);

  const ensureConversationId = async (): Promise<string> => {
    if (chatBoxState?.conversationId) {
      return chatBoxState.conversationId;
    }
    const conv = await service.conv.createConvWithParticipants(
      { title: "New Conversation" },
      [currentUser.id, chatBoxState.receiverUser.id]
    );

    setChatBoxState({
      ...chatBoxState,
      conversationId: conv.id,
    });

    return conv.id;
  };

  const handleSendMessage = async (content: string) => {
    try {
      const conversationId = await ensureConversationId();
      await service.msg.sendMessage({
        content,
        senderId: currentUser.id,
        conversationId,
        receiverId: chatBoxState?.receiverUser?.id,
      });
      queryClient.invalidateQueries({
        queryKey: [GET_CONV_WITH_OTHER_PARTICIPANTS_BY_USER_ID],
      });
      queryClient.invalidateQueries({
        queryKey: [GET_MESSAGE_BY_CONV_ID_QUERY_KEY],
      });
    } catch (error) {
      throw error;
    }
  };

  if (!users) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return (
      <div className="w-full h-screen flex flex-col gap-2 items-center justify-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Select Current User
        </h2>
        <Select
          onValueChange={(value) => {
            const selected = users.find((u) => u.id.toString() === value);
            if (selected) {
              setCurrentUser(selected);
            }
          }}
        >
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
