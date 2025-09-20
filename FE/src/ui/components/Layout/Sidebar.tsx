import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../core/Tabs";
import { ConvList } from "./ConvList";
import { CurrentUser } from "./CurrentUser";
import { UserList } from "./UserList";

export enum SidebarTab {
  CONVERSATIONS = "conversations",
  CONTACTS = "contacts",
}

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>(
    SidebarTab.CONVERSATIONS
  );

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Chat App</h1>
      </div>
      <CurrentUser />
      <div className="flex-1 overflow-hidden">
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
      </div>
    </div>
  );
}
