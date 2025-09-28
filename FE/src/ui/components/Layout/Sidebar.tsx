import { useState, useCallback } from "react";
import { useAppContext } from "@/ui/context";
import { useChatWindowStore } from "@/ui/hooks/store/useChatWindow";
import { useCurrentUserStore } from "@/ui/hooks/store/useCurrentUser";
import { useGetUserById } from "@/ui/hooks/tanstack/user";
import { SearchResult } from "@/ui/hooks/useSearchMessages";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, RefreshCcw, Trash } from "lucide-react";
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

export enum SidebarTab {
  CONVERSATIONS = "conversations",
  CONTACTS = "contacts",
}

export function Sidebar() {
  const [activeTab, setActiveTab] = useState(SidebarTab.CONVERSATIONS);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { socket, service } = useAppContext();
  const queryClient = useQueryClient();
  const { currentUser, setCurrentUser } = useCurrentUserStore();
  const { setChatBoxState } = useChatWindowStore();
  const { mutateAsync } = useGetUserById(service);

  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  const logOut = useCallback(() => {
    socket.disconnect();
    setCurrentUser(null);
    setChatBoxState({ receiverUser: null, conversationId: null });
    queryClient.clear();
  }, [socket, setCurrentUser, setChatBoxState, queryClient]);

  const handleMessageClick = useCallback(
    async (result: SearchResult, temp: string) => {
      if (!result.conversation_id || !result.sender_id) return;
      try {
        const receiverUser = await mutateAsync(result.sender_id);
        setChatBoxState({
          receiverUser,
          conversationId: result.conversation_id,
          highlightedMessageId: result.id,
          highlightedMessageText: temp,
        });
        closeSearch();
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    },
    [mutateAsync, setChatBoxState, closeSearch]
  );

  if (!currentUser) return null;

  return (
    <div className="w-100 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
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

      {/* Current user + search */}
      <CurrentUser
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
      />

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isSearchOpen ? (
          <SearchBox
            isOpen={isSearchOpen}
            onClose={closeSearch}
            onMessageClick={handleMessageClick}
          />
        ) : (
          <Tabs
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
