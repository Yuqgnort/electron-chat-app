import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { AuthSocket } from "../types/common";
import { ChatEvent } from "../types/events";
import { EventPayloads } from "../types/payloads";
import {
  addPendingMessage,
  addServerIdMapping,
  addTypingUser,
  addUserSocket,
  clearPendingMessages,
  getOnlineUsersWithDetails,
  getPendingMessages,
  getUserSocketIds,
  isUserOnline,
  removeTypingUser,
  removeUserSocket,
} from "./state";
import {
  broadcastUserStatusChange,
  findSender,
  handleUserHeartbeat,
  notifySender,
  sendOnlineUsersList,
} from "./utils";

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
    socket.on(
      ChatEvent.GET_ALL_ONLINE_USERS,
      handleGetAllOnlineUsers(socket, io)
    );
    socket.on(ChatEvent.HEARTBEAT, handleHeartbeat(socket, io));
    socket.on("disconnect", handleDisconnect(socket, io));
  });
}

function handleRegister(socket: AuthSocket, io: Server) {
  return ({ userId }: EventPayloads[ChatEvent.REGISTER]) => {
    const wasOffline = !isUserOnline(userId);

    addUserSocket(userId, socket.id);
    socket.userId = userId;

    socket.join(userId);

    if (wasOffline) {
      broadcastUserStatusChange(io, userId, "online", socket.id);
    }

    const pending = getPendingMessages(userId);

    if (pending.length > 0) {
      pending.forEach((msg) => {
        io.to(socket.id).emit(ChatEvent.MESSAGE_INCOMING, msg);
      });
      clearPendingMessages(userId);
    }

    sendOnlineUsersList(io, socket.id);
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
      const wasOnline = isUserOnline(userId);
      removeUserSocket(userId, socket.id);
      console.log(`🔌 User ${userId} disconnected from socket ${socket.id}`);

      // Only notify if user went completely offline (no more sockets)
      if (wasOnline && !isUserOnline(userId)) {
        broadcastUserStatusChange(io, userId, "offline", socket.id);
      }

      // Remove typing status for all conversations when user disconnects
      // This would require additional state tracking to know which conversations the user was typing in
    }
  };
}

function handleTypingStart(socket: AuthSocket, io: Server) {
  return ({
    userId,
    conversationId, // Đây giờ là receiverId
  }: EventPayloads[ChatEvent.TYPING_START]) => {
    if (!socket.userId || socket.userId !== userId) {
      console.error("Unauthorized typing start request");
      return;
    }

    const receiverId = conversationId;

    if (isUserOnline(receiverId)) {
      const receiverSocketIds = getUserSocketIds(receiverId);
      receiverSocketIds.forEach((socketId) => {
        io.to(socketId).emit(ChatEvent.TYPING_INDICATOR, {
          userId,
          conversationId: receiverId,
          isTyping: true,
        });
      });
    } else {
      console.log("⚠️ Receiver offline:", receiverId);
    }
  };
}

function handleTypingStop(socket: AuthSocket, io: Server) {
  return ({ userId, conversationId }: EventPayloads[ChatEvent.TYPING_STOP]) => {
    if (!socket.userId || socket.userId !== userId) {
      console.error("Unauthorized typing stop request");
      return;
    }

    const receiverId = conversationId; // Sử dụng conversationId như receiverId
    console.log("🔥 Backend - User typing stop:", {
      from: userId,
      to: receiverId,
    });

    // Gửi trực tiếp đến receiver (không dùng room)
    if (isUserOnline(receiverId)) {
      const receiverSocketIds = getUserSocketIds(receiverId);
      receiverSocketIds.forEach((socketId) => {
        io.to(socketId).emit(ChatEvent.TYPING_INDICATOR, {
          userId,
          conversationId: receiverId,
          isTyping: false,
        });
      });
      console.log("✅ Sent typing stop to:", receiverId);
    } else {
      console.log("⚠️ Receiver offline:", receiverId);
    }
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

// New handlers for enhanced user status
function handleGetAllOnlineUsers(socket: AuthSocket, io: Server) {
  return () => {
    const onlineUsers = getOnlineUsersWithDetails();
    socket.emit(ChatEvent.ALL_ONLINE_USERS_RESPONSE, {
      onlineUsers: onlineUsers.map((user) => ({
        userId: user.userId,
        status: user.status,
        lastSeen: user.lastSeen,
      })),
    });
  };
}

function handleHeartbeat(socket: AuthSocket, io: Server) {
  return ({ userId, timestamp }: EventPayloads[ChatEvent.HEARTBEAT]) => {
    if (!socket.userId || socket.userId !== userId) {
      console.error("Unauthorized heartbeat request");
      return;
    }

    handleUserHeartbeat(userId);

    // Optionally send back confirmation
    socket.emit(ChatEvent.USER_LAST_SEEN_UPDATE, {
      userId,
      lastSeen: timestamp,
    });
  };
}
