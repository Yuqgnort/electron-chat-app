import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { AuthSocket } from "../types/common";
import { ChatEvent } from "../types/events";
import { EventPayloads } from "../types/payloads";
import {
  addPendingMessage,
  addUserSocket,
  clearPendingMessages,
  getPendingMessages,
  getUserSocketIds,
  isUserOnline,
  removeUserSocket,
} from "./state";
import { findSender, notifySender } from "./utils";

export function setupSocketHandlers(io: Server) {
  io.on("connection", (socket: AuthSocket) => {
    console.log("Connected:", socket.id);
    socket.on(ChatEvent.REGISTER, handleRegister(socket, io));
    socket.on(ChatEvent.MESSAGE_SEND, handleMessageSend(socket, io));
    socket.on(ChatEvent.MESSAGE_DELIVERED, handleMessageDelivered(io));
    socket.on(ChatEvent.MESSAGE_READ, handleMessageRead(io));
    socket.on("disconnect", handleDisconnect(socket));
  });
}

function handleRegister(socket: AuthSocket, io: Server) {
  return ({ userId }: EventPayloads[ChatEvent.REGISTER]) => {
    addUserSocket(userId, socket.id);
    socket.userId = userId;
    console.log(`User ${userId} online`);
    // Replay pending messages
    const pending = getPendingMessages(userId);
    if (pending.length > 0) {
      pending.forEach((msg) => {
        io.to(socket.id).emit(ChatEvent.MESSAGE_INCOMING, msg);
      });
      clearPendingMessages(userId);
    }
  };
}

function handleMessageSend(socket: AuthSocket, io: Server) {
  return (params: EventPayloads[ChatEvent.MESSAGE_SEND]) => {
    const { localId, receiverId, content } = params;
    const serverId = uuidv4();
    const fromUser = socket.userId;

    socket.emit(ChatEvent.MESSAGE_ACK, {
      localId,
      serverId,
      status: "sent",
    });

    if (isUserOnline(receiverId)) {
      const socketIds = getUserSocketIds(receiverId);
      socketIds.forEach((sid) => {
        io.to(sid).emit(ChatEvent.MESSAGE_INCOMING, {
          serverId,
          from: fromUser,
          content,
        });
      });
    } else {
      addPendingMessage(receiverId, {
        serverId,
        from: fromUser,
        content,
      });
    }
  };
}

function handleMessageDelivered(io: Server) {
  return ({ serverId }: EventPayloads[ChatEvent.MESSAGE_DELIVERED]) => {
    const senderId = findSender(serverId);
    notifySender(io, senderId, serverId, "delivered");
  };
}

function handleMessageRead(io: Server) {
  return ({ serverId }: EventPayloads[ChatEvent.MESSAGE_READ]) => {
    const senderId = findSender(serverId);
    notifySender(io, senderId, serverId, "read");
  };
}

function handleDisconnect(socket: AuthSocket) {
  return () => {
    const userId = socket.userId;
    if (userId) {
      removeUserSocket(userId, socket.id);
      console.log(`🔌 User ${userId} disconnected from socket ${socket.id}`);
    }
  };
}
