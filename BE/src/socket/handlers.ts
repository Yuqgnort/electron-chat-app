import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { AuthSocket } from "../types/common";
import { ChatEvent } from "../types/events";
import { EventPayloads } from "../types/payloads";
import {
  addPendingMessage,
  addServerIdMapping,
  addUserSocket,
  clearPendingMessages,
  getPendingMessages,
  getUserSocketIds,
  isUserOnline,
  removeUserSocket,
  addTypingUser,
  removeTypingUser,
  getTypingUsers,
  getAllOnlineUsers,
} from "./state";
import { findSender, notifySender } from "./utils";

export function setupSocketHandlers(io: Server) {
  io.on("connection", (socket: AuthSocket) => {
    console.log("Connected:", socket.id);
    socket.on(ChatEvent.REGISTER, handleRegister(socket, io));
    socket.on(ChatEvent.MESSAGE_SEND, handleMessageSend(socket, io));
    socket.on(ChatEvent.MESSAGE_DELIVERED, handleMessageDelivered(io));
    socket.on(ChatEvent.MESSAGE_READ, handleMessageRead(io));
    socket.on(ChatEvent.TYPING_START, handleTypingStart(socket, io));
    socket.on(ChatEvent.TYPING_STOP, handleTypingStop(socket, io));
    socket.on(
      ChatEvent.ONLINE_STATUS_REQUEST,
      handleOnlineStatusRequest(socket, io)
    );
    socket.on("disconnect", handleDisconnect(socket, io));
  });
}

function handleRegister(socket: AuthSocket, io: Server) {
  return ({ userId }: EventPayloads[ChatEvent.REGISTER]) => {
    const wasOffline = !isUserOnline(userId);

    addUserSocket(userId, socket.id);
    socket.userId = userId;

    // Join user to their own room for easier targeting
    socket.join(userId);

    // If user was offline and now comes online, notify others
    if (wasOffline) {
      socket.broadcast.emit(ChatEvent.USER_ONLINE, { userId });
    }

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
    const { localId, receiverId, content, senderId } = params;
    const serverId = uuidv4();
    const fromUser = socket.userId;

    if (!fromUser) {
      console.error("User not registered on socket");
      return;
    }

    addServerIdMapping(serverId, fromUser);

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
          content,
          senderId: fromUser,
          receiverId: receiverId,
        });
      });
    } else {
      addPendingMessage(receiverId, {
        serverId,
        senderId,
        receiverId,
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

function handleDisconnect(socket: AuthSocket, io: Server) {
  return () => {
    const userId = socket.userId;
    if (userId) {
      removeUserSocket(userId, socket.id);
      console.log(`🔌 User ${userId} disconnected from socket ${socket.id}`);

      // Notify other users that this user went offline
      socket.broadcast.emit(ChatEvent.USER_OFFLINE, { userId });

      // Remove typing status for all conversations when user disconnects
      // This would require additional state tracking to know which conversations the user was typing in
    }
  };
}

function handleTypingStart(socket: AuthSocket, io: Server) {
  return ({
    userId,
    conversationId,
  }: EventPayloads[ChatEvent.TYPING_START]) => {
    if (!socket.userId || socket.userId !== userId) {
      console.error("Unauthorized typing start request");
      return;
    }

    addTypingUser(conversationId, userId, socket.id);

    // Notify other participants in the conversation
    socket.to(conversationId).emit(ChatEvent.TYPING_INDICATOR, {
      userId,
      conversationId,
      isTyping: true,
    });
  };
}

function handleTypingStop(socket: AuthSocket, io: Server) {
  return ({ userId, conversationId }: EventPayloads[ChatEvent.TYPING_STOP]) => {
    if (!socket.userId || socket.userId !== userId) {
      console.error("Unauthorized typing stop request");
      return;
    }

    removeTypingUser(conversationId, userId);

    // Notify other participants in the conversation
    socket.to(conversationId).emit(ChatEvent.TYPING_INDICATOR, {
      userId,
      conversationId,
      isTyping: false,
    });
  };
}

function handleOnlineStatusRequest(socket: AuthSocket, io: Server) {
  return ({ userIds }: EventPayloads[ChatEvent.ONLINE_STATUS_REQUEST]) => {
    const onlineUsers = userIds.filter((userId) => isUserOnline(userId));

    socket.emit(ChatEvent.ONLINE_STATUS_RESPONSE, {
      onlineUsers,
    });
  };
}
