import { IEventBus } from "@/core/application/eventbus";
import { ICommunicationManager } from "@/core/application/services-facade";
import { io, Socket } from "socket.io-client";

export interface SocketClient extends ICommunicationManager {
  connect(): void;
  disconnect(): void;
}

export function createSocketClient(
  url: string,
  eventBus: IEventBus
): SocketClient {
  let socket: Socket | null = null;
  return {
    connect() {
      socket = io(url, {
        transports: ["websocket"],
        reconnection: true,
      });
      socket.on("connect", () => {});
      socket.on("disconnect", (rp) => {});
      socket.on("msg:ack", (rp) => {});
      socket.on("msg:delivered", (rp) => {});
      socket.on("msg:read", (rp) => {});
      socket.on("msg:incoming", (rp) => {});
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
