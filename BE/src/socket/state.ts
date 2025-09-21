interface UserSockets {
  [userId: string]: string[];
}

interface TypingUser {
  userId: string;
  socketId: string;
  timestamp: number;
}

interface ConversationTyping {
  [conversationId: string]: TypingUser[];
}

interface UserStatus {
  userId: string;
  status: "online" | "offline";
  lastSeen: number;
  socketIds: string[];
}

interface UserStatusMap {
  [userId: string]: UserStatus;
}

export const userSockets: UserSockets = {};

export const pendingMessages: Record<string, any[]> = {};

export const serverIdToSenderId: Record<string, string> = {};

export const conversationTyping: ConversationTyping = {};

export const userStatuses: UserStatusMap = {};

export const TYPING_TIMEOUT = 3000;
export const USER_OFFLINE_THRESHOLD = 30000;

export function addUserSocket(userId: string, socketId: string) {
  if (!userSockets[userId]) userSockets[userId] = [];
  userSockets[userId].push(socketId);

  // Update user status
  updateUserStatus(userId, "online");
}

export function removeUserSocket(userId: string, socketId: string) {
  if (userSockets[userId]) {
    userSockets[userId] = userSockets[userId].filter((id) => id !== socketId);
    if (userSockets[userId].length === 0) {
      delete userSockets[userId];
      // Update user status to offline
      updateUserStatus(userId, "offline");
    }
  }
}

export function addPendingMessage(userId: string, message: any) {
  if (!pendingMessages[userId]) pendingMessages[userId] = [];
  pendingMessages[userId].push(message);
  console.log(pendingMessages);
}

export function getPendingMessages(userId: string): any[] {
  return pendingMessages[userId] || [];
}

export function clearPendingMessages(userId: string) {
  delete pendingMessages[userId];
}

export function isUserOnline(userId: string): boolean {
  return userSockets[userId] && userSockets[userId].length > 0;
}

export function getUserSocketIds(userId: string): string[] {
  return userSockets[userId] || [];
}

export function addServerIdMapping(serverId: string, senderId: string) {
  serverIdToSenderId[serverId] = senderId;
}

export function addTypingUser(
  conversationId: string,
  userId: string,
  socketId: string
) {
  if (!conversationTyping[conversationId]) {
    conversationTyping[conversationId] = [];
  }

  conversationTyping[conversationId] = conversationTyping[
    conversationId
  ].filter((typing) => typing.userId !== userId);

  conversationTyping[conversationId].push({
    userId,
    socketId,
    timestamp: Date.now(),
  });
}

export function removeTypingUser(conversationId: string, userId: string) {
  if (conversationTyping[conversationId]) {
    conversationTyping[conversationId] = conversationTyping[
      conversationId
    ].filter((typing) => typing.userId !== userId);

    // Clean up empty conversation
    if (conversationTyping[conversationId].length === 0) {
      delete conversationTyping[conversationId];
    }
  }
}

export function getTypingUsers(conversationId: string): string[] {
  if (!conversationTyping[conversationId]) return [];

  const now = Date.now();
  conversationTyping[conversationId] = conversationTyping[
    conversationId
  ].filter((typing) => now - typing.timestamp < TYPING_TIMEOUT);

  return conversationTyping[conversationId].map((typing) => typing.userId);
}

export function cleanupExpiredTyping() {
  const now = Date.now();

  for (const conversationId in conversationTyping) {
    conversationTyping[conversationId] = conversationTyping[
      conversationId
    ].filter((typing) => now - typing.timestamp < TYPING_TIMEOUT);

    if (conversationTyping[conversationId].length === 0) {
      delete conversationTyping[conversationId];
    }
  }
}

export function getAllOnlineUsers(): string[] {
  return Object.keys(userSockets);
}

export function getServerIdSender(serverId: string): string | undefined {
  return serverIdToSenderId[serverId];
}

export function removeServerIdMapping(serverId: string) {
  delete serverIdToSenderId[serverId];
}

// User Status Management Functions
export function updateUserStatus(userId: string, status: "online" | "offline") {
  const now = Date.now();

  if (!userStatuses[userId]) {
    userStatuses[userId] = {
      userId,
      status,
      lastSeen: now,
      socketIds: [],
    };
  } else {
    userStatuses[userId].status = status;
    userStatuses[userId].lastSeen = now;
  }

  if (status === "online") {
    userStatuses[userId].socketIds = userSockets[userId] || [];
  } else {
    userStatuses[userId].socketIds = [];
  }
}

export function getUserStatus(userId: string): UserStatus | null {
  return userStatuses[userId] || null;
}

export function getAllUserStatuses(): UserStatus[] {
  return Object.values(userStatuses);
}

export function getOnlineUsersWithDetails(): UserStatus[] {
  return Object.values(userStatuses).filter((user) => user.status === "online");
}

export function updateUserHeartbeat(userId: string) {
  if (userStatuses[userId]) {
    userStatuses[userId].lastSeen = Date.now();
  }
}

export function cleanupOfflineUsers() {
  const now = Date.now();

  for (const userId in userStatuses) {
    const userStatus = userStatuses[userId];
    if (
      userStatus.status === "online" &&
      now - userStatus.lastSeen > USER_OFFLINE_THRESHOLD &&
      (!userSockets[userId] || userSockets[userId].length === 0)
    ) {
      updateUserStatus(userId, "offline");
    }
  }
}

export function removeUserStatus(userId: string) {
  delete userStatuses[userId];
}
