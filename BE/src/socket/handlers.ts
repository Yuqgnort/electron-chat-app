import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { ChatEvent } from "../types/events";
import { EventPayloads } from "../types/payloads";
import { Message } from "../types/common";
import {
  addUserSocket,
  removeUserSocket,
  addPendingMessage,
  getPendingMessages,
  clearPendingMessages,
  isUserOnline,
  getUserSocketIds,
} from "./state";
import { findSender, notifySender } from "./utils";

export function setupSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("Connected:", socket.id);
    socket.on(ChatEvent.REGISTER, handleRegister(socket, io));
    socket.on(ChatEvent.MESSAGE_SEND, handleMessageSend(socket, io));
    socket.on(ChatEvent.MESSAGE_DELIVERED, handleMessageDelivered(io));
    socket.on(ChatEvent.MESSAGE_READ, handleMessageRead(io));
    socket.on("disconnect", handleDisconnect(socket));
  });
}

function handleRegister(socket: Socket, io: Server) {
  return ({ userId }: EventPayloads[ChatEvent.REGISTER]) => {
    addUserSocket(userId, socket.id);
    (socket as any).userId = userId;
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

function handleMessageSend(socket: Socket, io: Server) {
  return ({
    localId,
    conversationId,
    senderId,
    receiverId,
    content,
    createdAt,
  }: EventPayloads[ChatEvent.MESSAGE_SEND]) => {
    const serverId = uuidv4();
    const fromUser = (socket as any).userId;

    const msg: Message = {
      server_id: serverId,
      from: fromUser,
      to: receiverId,
      content,
      status: "sent",
      created_at: new Date().toISOString(),
    };

    // ACK to sender
    socket.emit(ChatEvent.MESSAGE_ACK, {
      localId,
      serverId,
      status: "sent",
    });

    // Forward to recipient
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
      // User offline → save to pending
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

function handleDisconnect(socket: Socket) {
  return () => {
    const userId = (socket as any).userId;
    if (userId) {
      removeUserSocket(userId, socket.id);
      console.log(`🔌 User ${userId} disconnected from socket ${socket.id}`);
    }
  };
}
