import { EMsgStatus } from "@/core/domain/msg/entity";
import { IUserEntity } from "@/core/domain/user/entity";
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
import { useCheckIsOnNetwork } from "./hooks/useCheckIsOnline";
import { useConnectSocket } from "./hooks/useConnectSocket";
import {
  INFINITE_SEARCH_EXACT_PHRASE_QUERY_KEY,
  INFINITE_SEARCH_QUERY_KEY,
} from "./hooks/useInfiniteSearchMessages";

////////////////////

export function App() {
  const queryClient = useQueryClient();
  const { service, socket, test } = useAppContext();

  const { currentUser, setCurrentUser } = useCurrentUserStore();
  const { chatBoxState, setChatBoxState } = useChatWindowStore();

  const { data: users } = useGetUsers(service);

  const ensureConversationId = async (): Promise<string> => {
    if (chatBoxState?.conversationId) {
      return chatBoxState.conversationId;
    }
    if (!chatBoxState?.receiverUser || !currentUser) {
      throw new Error("Receiver user or current user is not set");
    }
    const rs = await service.conv.createConvWithParticipants(
      { title: "New Conversation" },
      [currentUser.id, chatBoxState.receiverUser.id]
    );

    if (!rs) {
      throw new Error("Failed to create or get conversation");
    }

    setChatBoxState({
      ...chatBoxState,
      conversationId: rs.conv.id,
    });

    return rs.conv.id;
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

      const oneMounthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const twoMounthAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
      const threeMounthAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
      // Simulate many messages for testing search performance
      // You can comment this out if not needed

      // await service.msg.sendMessage({
      //   content,
      //   conversationId,
      //   senderId: currentUser.id,
      //   receiverId: chatBoxState.receiverUser.id,
      //   serverId: null,
      //   status: EMsgStatus.PENDING,
      // });
      await test.insertCustomTestMessages(
        conversationId,
        currentUser.id,
        chatBoxState.receiverUser.id,
        100000,
        0
        // threeMounthAgo
      );
      await queryClient.invalidateQueries({
        queryKey: [GET_CONV_WITH_OTHER_PARTICIPANTS_BY_USER_ID, currentUser.id],
      });
      await queryClient.invalidateQueries({
        queryKey: [INFINITE_SEARCH_QUERY_KEY],
      });
      await queryClient.invalidateQueries({
        queryKey: [INFINITE_SEARCH_EXACT_PHRASE_QUERY_KEY],
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
  useCheckIsOnNetwork();

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
    <>
      <MainLayout>
        <ChatWindow
          onSendMessage={handleSendMessage}
          receiverUser={chatBoxState?.receiverUser}
        />
      </MainLayout>
    </>
  );
}
