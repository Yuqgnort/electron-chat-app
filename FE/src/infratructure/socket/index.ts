import {
  TIntegrationReceivedEvent,
  TIntegrationSentEvent,
} from "@/core/application/event";
import { IEventBus } from "@/core/application/eventbus";
import { ICommunicationManager } from "@/core/application/services-facade";
import { io, Socket } from "socket.io-client";

export interface ISocketClient extends ICommunicationManager {
  connect(): void;
  disconnect(): void;
}

type TExtractPayload<T, U extends Event["type"]> = T extends {
  type: U;
  payload: infer P;
}
  ? P
  : never;

type TReceivedEventSocketMap = {
  [K in TIntegrationReceivedEvent["type"]]: (
    payload: TExtractPayload<TIntegrationReceivedEvent, K>
  ) => void;
};

type TSentEventSocketMap = {
  [K in TIntegrationSentEvent["type"]]: (
    payload: TExtractPayload<TIntegrationSentEvent, K>
  ) => void;
};

export function createSocketClient(
  url: string,
  eventBus: IEventBus
): ISocketClient {
  let socket: Socket<TReceivedEventSocketMap, TSentEventSocketMap> | null =
    null;
  return {
    connect() {
      socket = io(url, {
        transports: ["websocket"],
        reconnection: true,
      });
      socket.on("connect", () => {});
      socket.on("disconnect", (rp) => {});
      socket.on("msg:ack", (rp) => {
        eventBus.publish({
          type: "msg:ack",
          payload: rp,
        });
      });
      socket.on("msg:delivered", (rp) => {
        eventBus.publish({ type: "msg:delivered", payload: rp });
      });
      socket.on("msg:read", (rp) => {
        eventBus.publish({ type: "msg:read", payload: rp });
      });
      socket.on("msg:incoming", (rp) => {
        eventBus.publish({ type: "msg:incoming", payload: rp });
      });
    },
    disconnect() {
      socket?.disconnect();
      socket = null;
    },
    async sendMessage(msg): Promise<void> {
      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }
      socket.emit("msg:send", {
        localId: msg.localId,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        createdAt: msg.createdAt,
      });
    },
  };
}
