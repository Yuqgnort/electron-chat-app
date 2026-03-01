import { EMsgStatus } from "../domain/msg/entity";
import { TTimeStamp } from "../domain/type";

export type TIntegrationReceivedEvent =
  | {
      type: "connect";
      payload: null;
    }
  | {
      type: "disconnect";
      payload: null;
    }
  | {
      type: "msg:ack";
      payload: { localId: string; serverId: string; status: EMsgStatus.SENT };
    }
  | {
      type: "msg:delivered";
      payload: { serverId: string; status: EMsgStatus.DELIVERED };
    }
  | {
      type: "msg:incoming";
      payload: {
        serverId: string;
        senderId: string;
        receiverId: string;
        content: string;
      };
    }
  | {
      type: "user:online";
      payload: {
        userId: string;
      };
    }
  | {
      type: "user:offline";
      payload: {
        userId: string;
      };
    }
  | {
      type: "users:all_online_response";
      payload: {
        onlineUsers: {
          userId: string;
          status: "online" | "offline";
          lastSeen: number;
        }[];
      };
    }
  | {
      type: "user:status_change";
      payload: {
        userId: string;
        status: "online" | "offline";
        lastSeen: number;
      };
    }
  | {
      type: "user:last_seen_update";
      payload: {
        userId: string;
        lastSeen: number;
      };
    }
  | {
      type: "typing:indicator";
      payload: {
        userId: string;
        conversationId: string;
        isTyping: boolean;
      };
    };

export type TIntegrationSentEvent =
  | {
      type: "register";
      payload: {
        userId: string;
      };
    }
  | {
      type: "msg:send";
      payload: {
        localId: string;
        conversationId: string;
        senderId: string;
        receiverId: string;
        content: string;
        createdAt: TTimeStamp;
      };
    }
  | {
      type: "msg:delivered";
      payload: { serverId: string };
    }
  | {
      type: "users:get_all_online";
      payload: {};
    }
  | {
      type: "status:request";
      payload: {
        userIds: string[];
      };
    }
  | {
      type: "heartbeat";
      payload: {
        userId: string;
        timestamp: number;
      };
    }
  | {
      type: "typing:start";
      payload: {
        userId: string;
        conversationId: string;
      };
    }
  | {
      type: "typing:stop";
      payload: {
        userId: string;
        conversationId: string;
      };
    };
