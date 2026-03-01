import { ChatEvent } from "./events";

export interface EventPayloads {
  [ChatEvent.REGISTER]: {
    userId: string;
  };

  [ChatEvent.MESSAGE_SEND]: {
    localId: string;
    conversationId: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: Date;
  };

  [ChatEvent.MESSAGE_ACK]: {
    localId: string;
    serverId: string;
    status: string;
  };

  [ChatEvent.MESSAGE_INCOMING]: {
    serverId: string;
    senderId: string;
    receiverId: string;
    content: string;
  };

  [ChatEvent.MESSAGE_DELIVERED]: {
    serverId: string;
  };

  [ChatEvent.MESSAGE_READ]: {
    serverId: string;
  };

  [ChatEvent.TYPING_START]: {
    userId: string;
    conversationId: string;
  };

  [ChatEvent.TYPING_STOP]: {
    userId: string;
    conversationId: string;
  };

  [ChatEvent.TYPING_INDICATOR]: {
    userId: string;
    conversationId: string;
    isTyping: boolean;
  };

  [ChatEvent.USER_ONLINE]: {
    userId: string;
  };

  [ChatEvent.USER_OFFLINE]: {
    userId: string;
  };

  [ChatEvent.ONLINE_STATUS_REQUEST]: {
    userIds: string[];
  };

  [ChatEvent.ONLINE_STATUS_RESPONSE]: {
    onlineUsers:
      | string[]
      | {
          userId: string;
          status: "online" | "offline";
          lastSeen: number;
        }[];
  };

  // New payload types for enhanced user status
  [ChatEvent.GET_ALL_ONLINE_USERS]: {};

  [ChatEvent.ALL_ONLINE_USERS_RESPONSE]: {
    onlineUsers: {
      userId: string;
      status: "online" | "offline";
      lastSeen: number;
    }[];
  };

  [ChatEvent.USER_STATUS_CHANGE]: {
    userId: string;
    status: "online" | "offline";
    lastSeen: number;
  };

  [ChatEvent.HEARTBEAT]: {
    userId: string;
    timestamp: number;
  };

  [ChatEvent.USER_LAST_SEEN_UPDATE]: {
    userId: string;
    lastSeen: number;
  };
}
