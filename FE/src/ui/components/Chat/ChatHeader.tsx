import { IUserEntity } from "@/core/domain/user/entity";
import { Search } from "lucide-react";
import { Button } from "../core/Button";

export function ChatHeader({ receiverUser }: { receiverUser?: IUserEntity }) {
  if (!receiverUser) return null;

  return (
    <div className="px-6 py-4 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {receiverUser.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {receiverUser.displayName}
            </h2>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="size-8">
            <Search />
          </Button>
        </div>
      </div>
    </div>
  );
}
