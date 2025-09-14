import { ChatEvent } from "./events";

export interface EventPayloads {
  [ChatEvent.REGISTER]: {
    userId: string;
  };

  [ChatEvent.MESSAGE_NEW]: {
    local_id: string;
    toUser: string;
    content: string;
  };

  [ChatEvent.MESSAGE_ACK]: {
    local_id: string;
    server_id: string;
    status: string;
  };

  [ChatEvent.MESSAGE_FORWARD]: {
    server_id: string;
    from: string;
    content: string;
  };

  [ChatEvent.MESSAGE_DELIVERED]: {
    server_id: string;
  };

  [ChatEvent.MESSAGE_READ]: {
    server_id: string;
  };

  [ChatEvent.MESSAGE_STATUS]: {
    server_id: string;
    status: "delivered" | "read";
  };
}
