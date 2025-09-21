import { Server } from "socket.io";
import {
  userSockets,
  pendingMessages,
  getServerIdSender,
  getTypingUsers,
  cleanupExpiredTyping,
  getAllUserStatuses,
  getOnlineUsersWithDetails,
  cleanupOfflineUsers,
  updateUserHeartbeat,
} from "./state";
import { ChatEvent } from "../types/events";

export function findSender(serverId: string): string {
  // First try to find in the serverId mapping
  const sender = getServerIdSender(serverId);
  if (sender) {
    return sender;
  }

  // Fallback to searching pending messages (for backward compatibility)
  for (const user in pendingMessages) {
    for (const msg of pendingMessages[user]) {
      if (msg.serverId === serverId) return msg.from;
    }
  }
  return "";
}

export function notifySender(
  io: Server,
  senderId: string,
  serverId: string,
  status: "delivered" | "read"
) {
  (userSockets[senderId] || []).forEach((sid) => {
    if (status === "delivered") {
      io.to(sid).emit("msg:delivered", { serverId });
    } else {
      io.to(sid).emit("msg:read", { serverId });
    }
  });
}

export function broadcastToConversation(
  io: Server,
  conversationId: string,
  event: string,
  data: any,
  excludeSocketId?: string
) {
  if (excludeSocketId) {
    io.to(conversationId).except(excludeSocketId).emit(event, data);
  } else {
    io.to(conversationId).emit(event, data);
  }
}

export function notifyTypingStatus(
  io: Server,
  conversationId: string,
  excludeUserId: string
) {
  const typingUsers = getTypingUsers(conversationId);
  const filteredTypingUsers = typingUsers.filter(
    (userId) => userId !== excludeUserId
  );

  io.to(conversationId).emit(ChatEvent.TYPING_INDICATOR, {
    conversationId,
    typingUsers: filteredTypingUsers,
  });
}

export function startTypingCleanup(io: Server) {
  // Clean up expired typing indicators every 30 seconds
  setInterval(() => {
    cleanupExpiredTyping();
  }, 30000);
}

export function getUsersInConversation(conversationId: string): string[] {
  // This would typically come from database
  // For now, returning empty array as it needs conversation participants data
  return [];
}

export function notifyConversationParticipants(
  io: Server,
  conversationId: string,
  event: string,
  data: any,
  excludeUserId?: string
) {
  const participants = getUsersInConversation(conversationId);

  participants.forEach((userId) => {
    if (excludeUserId && userId === excludeUserId) return;

    const socketIds = userSockets[userId] || [];
    socketIds.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
  });
}

// User Status Utilities
export function broadcastUserStatusChange(
  io: Server,
  userId: string,
  status: "online" | "offline",
  excludeSocketId?: string
) {
  const event =
    status === "online" ? ChatEvent.USER_ONLINE : ChatEvent.USER_OFFLINE;
  const payload = { userId };

  if (excludeSocketId) {
    io.except(excludeSocketId).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
}

export function sendOnlineUsersList(io: Server, socketId: string) {
  const onlineUsers = getOnlineUsersWithDetails();
  io.to(socketId).emit(ChatEvent.ONLINE_STATUS_RESPONSE, {
    onlineUsers: onlineUsers.map((user) => ({
      userId: user.userId,
      status: user.status,
      lastSeen: user.lastSeen,
    })),
  });
}

export function sendUserStatusToAll(
  io: Server,
  userId: string,
  status: "online" | "offline"
) {
  broadcastUserStatusChange(io, userId, status);
}

export function handleUserHeartbeat(userId: string) {
  updateUserHeartbeat(userId);
}

export function startUserStatusCleanup(io: Server) {
  // Clean up offline users every 30 seconds
  setInterval(() => {
    cleanupOfflineUsers();
  }, 30000);
}
