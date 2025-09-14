import { EMsgStatus } from "../domain/msg/entity";

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
      payload: { serverId: string; from: string; content: string };
    };

export type TIntegrationSentEvent = {
  type: "msg:send";
  payload: {
    localId: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: Date;
  };
};
