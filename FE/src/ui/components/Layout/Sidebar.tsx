import { Tabs, TabsContent, TabsList, TabsTrigger } from "../core/Tabs";
import { ConvList } from "./ConvList";
import { CurrentUser } from "./CurrentUser";
import { UserList } from "./UserList";

export function Sidebar() {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Chat App</h1>
      </div>
      <CurrentUser />
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="conversations">
          <TabsList className="w-full rounded-none">
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
          </TabsList>
          <TabsContent value="conversations">
            <ConvList />
          </TabsContent>
          <TabsContent value="contacts">
            <UserList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
