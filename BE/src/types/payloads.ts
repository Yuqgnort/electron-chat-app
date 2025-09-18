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
}
