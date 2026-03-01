import { useEffect, useState } from "react";
import { useAppContext } from "../context";
import { useCurrentUserStore } from "./store/useCurrentUser";

export interface IUseSimpleTypingListenerReturn {
  typingUsers: string[];
  isAnyoneTyping: boolean;
}

export function useSimpleTypingListener(): IUseSimpleTypingListenerReturn {
  const { eventBus } = useAppContext();
  const { currentUser } = useCurrentUserStore();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!eventBus || !currentUser) return;
    const unsubscribe = eventBus.subscribe(
      "typing:indicator",
      (event: {
        type: "typing:indicator";
        payload: { userId: string; conversationId: string; isTyping: boolean };
      }) => {
        const { payload } = event;

        if (payload.conversationId === currentUser.id) {
          if (payload.isTyping) {
            setTypingUsers((prev) => {
              if (!prev.includes(payload.userId)) {
                return [...prev, payload.userId];
              }
              return prev;
            });
          } else {
            setTypingUsers((prev) =>
              prev.filter((id) => id !== payload.userId)
            );
          }
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [eventBus, currentUser]);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setTypingUsers([]);
    }, 10000);

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    typingUsers,
    isAnyoneTyping: typingUsers.length > 0,
  };
}
