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
    console.log("🔌 Connected:", socket.id);
    socket.on(ChatEvent.REGISTER, handleRegister(socket, io));
    socket.on(ChatEvent.MESSAGE_NEW, handleMessageNew(socket, io));
    socket.on(ChatEvent.MESSAGE_DELIVERED, handleMessageDelivered(io));
    socket.on(ChatEvent.MESSAGE_READ, handleMessageRead(io));
    socket.on("disconnect", handleDisconnect(socket));
  });
}

function handleRegister(socket: Socket, io: Server) {
  return ({ userId }: EventPayloads[ChatEvent.REGISTER]) => {
    addUserSocket(userId, socket.id);
    (socket as any).userId = userId;

    console.log(`✅ User ${userId} online`);

    // Replay pending messages
    const pending = getPendingMessages(userId);
    if (pending.length > 0) {
      pending.forEach((msg) => {
        io.to(socket.id).emit(ChatEvent.MESSAGE_FORWARD, msg);
      });
      clearPendingMessages(userId);
    }
  };
}

function handleMessageNew(socket: Socket, io: Server) {
  return ({
    local_id,
    toUser,
    content,
  }: EventPayloads[ChatEvent.MESSAGE_NEW]) => {
    const serverId = uuidv4();
    const fromUser = (socket as any).userId;

    const msg: Message = {
      server_id: serverId,
      from: fromUser,
      to: toUser,
      content,
      status: "sent",
      created_at: new Date().toISOString(),
    };

    // ACK to sender
    socket.emit(ChatEvent.MESSAGE_ACK, {
      local_id,
      server_id: serverId,
      status: "sent",
    });

    // Forward to recipient
    if (isUserOnline(toUser)) {
      const socketIds = getUserSocketIds(toUser);
      socketIds.forEach((sid) => {
        io.to(sid).emit(ChatEvent.MESSAGE_FORWARD, msg);
      });
    } else {
      // User offline → save to pending
      addPendingMessage(toUser, msg);
    }
  };
}

function handleMessageDelivered(io: Server) {
  return ({ server_id }: EventPayloads[ChatEvent.MESSAGE_DELIVERED]) => {
    const senderId = findSender(server_id);
    notifySender(io, senderId, server_id, "delivered");
  };
}

function handleMessageRead(io: Server) {
  return ({ server_id }: EventPayloads[ChatEvent.MESSAGE_READ]) => {
    const senderId = findSender(server_id);
    notifySender(io, senderId, server_id, "read");
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
