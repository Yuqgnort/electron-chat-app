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
  register(userId: string): void;
  isConnected(): boolean;
  connectAndRegister(userId: string): void;
  // Simple typing methods
  startTypingTo(receiverUserId: string): void;
  stopTypingTo(receiverUserId: string): void;
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
  let currentUserId: string | null = null;

  return {
    connect() {
      socket = io(url, {
        transports: ["websocket"],
        reconnection: true,
      });
      socket.on("connect", () => {
        eventBus.publish({ type: "connect", payload: null });
      });
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
      socket.on("msg:incoming", (rp) => {
        eventBus.publish({ type: "msg:incoming", payload: rp });
      });
      socket.on("user:online", (rp) => {
        eventBus.publish({ type: "user:online", payload: rp });
      });
      socket.on("user:offline", (rp) => {
        eventBus.publish({ type: "user:offline", payload: rp });
      });
      socket.on("users:all_online_response", (rp) => {
        eventBus.publish({ type: "users:all_online_response", payload: rp });
      });
      socket.on("user:status_change", (rp) => {
        eventBus.publish({ type: "user:status_change", payload: rp });
      });
      socket.on("user:last_seen_update", (rp) => {
        eventBus.publish({ type: "user:last_seen_update", payload: rp });
      });
      socket.on("typing:indicator", (rp) => {
        eventBus.publish({ type: "typing:indicator", payload: rp });
      });
    },

    disconnect() {
      socket?.disconnect();
      socket = null;
    },

    isConnected() {
      return socket?.connected ?? false;
    },

    connectAndRegister(userId: string) {
      if (!socket) {
        this.connect();
      }
      const registerUser = () => {
        if (socket && socket.connected) {
          currentUserId = userId;
          socket.emit("register", { userId });
        }
      };

      if (socket?.connected) {
        registerUser();
      } else {
        socket?.on("connect", registerUser);
      }
    },

    register(userId) {
      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }
      currentUserId = userId;
      socket.emit("register", { userId });
    },

    async sendMessage(msg): Promise<void> {
      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }
      socket.emit("msg:send", {
        localId: msg.localId,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        createdAt: msg.createdAt,
      });
    },

    async deliverMessage(payload): Promise<void> {
      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }
      socket.emit("msg:delivered", payload);
    },

    async requestAllOnlineUsers(): Promise<void> {
      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }
      socket.emit("users:get_all_online", {});
    },

    async requestUsersStatus({ userIds }): Promise<void> {
      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }
      socket.emit("status:request", { userIds });
    },

    async sendHeartbeat({ userId, timestamp }): Promise<void> {
      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }
      socket.emit("heartbeat", {
        userId,
        timestamp,
      });
    },

    async startTyping({ userId, conversationId }): Promise<void> {
      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }
      socket.emit("typing:start", { userId, conversationId });
    },

    async stopTyping({ userId, conversationId }): Promise<void> {
      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }
      socket.emit("typing:stop", { userId, conversationId });
    },

    startTypingTo(receiverUserId: string): void {
      if (!socket || !socket.connected) {
        console.warn("Cannot start typing: Socket not connected");
        return;
      }
      socket.emit("typing:start", {
        userId: currentUserId || "",
        conversationId: receiverUserId,
      });
    },

    stopTypingTo(receiverUserId: string): void {
      if (!socket || !socket.connected) {
        console.warn("Cannot stop typing: Socket not connected");
        return;
      }

      socket.emit("typing:stop", {
        userId: currentUserId || "",
        conversationId: receiverUserId,
      });
    },
  };
}
