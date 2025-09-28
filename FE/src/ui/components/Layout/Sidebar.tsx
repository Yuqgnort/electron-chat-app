import { useAppContext } from "@/ui/context";
import { useChatWindowStore } from "@/ui/hooks/store/useChatWindow";
import { useCurrentUserStore } from "@/ui/hooks/store/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, RefreshCcw, Trash } from "lucide-react";
import { useState } from "react";
import { Button } from "../core/Button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "../core/ContextMenu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../core/Tabs";
import { SearchBox } from "../Search";
import { ConvList } from "./ConvList";
import { CurrentUser } from "./CurrentUser";
import { UserList } from "./UserList";
import { SearchResult } from "@/ui/hooks/useSearchMessages";

export enum SidebarTab {
  CONVERSATIONS = "conversations",
  CONTACTS = "contacts",
}

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>(
    SidebarTab.CONVERSATIONS
  );

  const { socket, service } = useAppContext();
  const queryClient = useQueryClient();
  const { currentUser, setCurrentUser } = useCurrentUserStore();
  const { setChatBoxState } = useChatWindowStore();

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const closeSearch = () => {
    setIsSearchOpen(false);
  };

  const logOut = () => {
    socket.disconnect();
    setCurrentUser(null);
    setChatBoxState({ receiverUser: null, conversationId: null });
    queryClient.clear();
  };

  const handleMessageClick = (result: SearchResult) => {
    // Navigate to the conversation and highlight the message
    console.log("Navigate to message:", result);

    // TODO: Implement navigation to specific message
    // This could involve:
    // 1. Opening the conversation
    // 2. Scrolling to the specific message
    // 3. Highlighting the message temporarily

    setChatBoxState({
      receiverUser: null, // Will be set when conversation loads
      conversationId: result.conversation_id,
    });
  };

  if (!currentUser) return null;

  return (
    <div className="w-100 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <ContextMenu>
          <ContextMenuTrigger>
            <h1 className="text-lg font-semibold text-gray-900">Chat App</h1>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-52">
            <ContextMenuItem
              inset
              onSelect={() =>
                service.resetChatDataKeepUsers(() => window.location.reload())
              }
            >
              Reset App
              <ContextMenuShortcut>
                <Trash />
              </ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem inset onSelect={() => window.location.reload()}>
              Reload
              <ContextMenuShortcut>
                <RefreshCcw />
              </ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <Button variant="ghost" size="icon" onClick={logOut}>
          <LogOut className="w-4 h-4 text-gray-600" />
        </Button>
      </div>
      <CurrentUser
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
      />
      <div className="flex-1 overflow-hidden">
        {isSearchOpen ? (
          <SearchBox
            isOpen={isSearchOpen}
            onClose={closeSearch}
            onMessageClick={handleMessageClick}
          />
        ) : (
          <Tabs
            defaultValue="conversations"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as SidebarTab)}
          >
            <TabsList className="w-full rounded-none">
              <TabsTrigger value={SidebarTab.CONVERSATIONS}>
                Conversations
              </TabsTrigger>
              <TabsTrigger value={SidebarTab.CONTACTS}>Contacts</TabsTrigger>
            </TabsList>
            <TabsContent value={SidebarTab.CONVERSATIONS}>
              <ConvList activeTab={activeTab} />
            </TabsContent>
            <TabsContent value={SidebarTab.CONTACTS}>
              <UserList />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
