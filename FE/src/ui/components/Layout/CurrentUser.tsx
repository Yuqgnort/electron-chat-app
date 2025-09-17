import { useChatWindowStore } from "@/ui/hooks/store/useChatWindow";
import { useCurrentUserStore } from "@/ui/hooks/store/useCurrentUser";
import { useAppContext } from "@/ui/context";
import { LogOut } from "lucide-react";

export function CurrentUser() {
  const { socket } = useAppContext();
  const { currentUser, setCurrentUser } = useCurrentUserStore();
  const { setChatBoxState } = useChatWindowStore();

  const logOut = () => {
    console.log("🔌 Disconnecting socket on user logout");
    socket.disconnect();
    setCurrentUser(null);
    setChatBoxState({ receiverUser: null, conversationId: null });
  };

  if (!currentUser) return null;

  return (
    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {currentUser.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {currentUser.displayName}
          </p>
          <p className="text-xs text-gray-500 truncate">
            @{currentUser.userName}
          </p>
        </div>

        <div className="relative">
          <button
            onClick={logOut}
            className="p-1 rounded-full cursor-pointer hover:bg-gray-200 transition-colors"
          >
            <LogOut className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
