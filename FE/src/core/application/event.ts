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
      type: "msg:read";
      payload: { serverId: string; status: EMsgStatus.READ };
    }
  | {
      type: "msg:incoming";
      payload: {
        serverId: string;
        senderId: string;
        receiverId: string;
        content: string;
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
    };
