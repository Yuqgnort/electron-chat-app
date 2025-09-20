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

export const userSockets: UserSockets = {};

export const pendingMessages: Record<string, any[]> = {};

// Map serverId to senderId to track message ownership
export const serverIdToSenderId: Record<string, string> = {};

// Track typing status per conversation
export const conversationTyping: ConversationTyping = {};

// Typing timeout duration (in milliseconds)
export const TYPING_TIMEOUT = 3000;

export function addUserSocket(userId: string, socketId: string) {
  if (!userSockets[userId]) userSockets[userId] = [];
  userSockets[userId].push(socketId);
}

export function removeUserSocket(userId: string, socketId: string) {
  if (userSockets[userId]) {
    userSockets[userId] = userSockets[userId].filter((id) => id !== socketId);
    if (userSockets[userId].length === 0) {
      delete userSockets[userId];
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

// Typing status functions
export function addTypingUser(
  conversationId: string,
  userId: string,
  socketId: string
) {
  if (!conversationTyping[conversationId]) {
    conversationTyping[conversationId] = [];
  }

  // Remove existing typing status for this user in this conversation
  conversationTyping[conversationId] = conversationTyping[
    conversationId
  ].filter((typing) => typing.userId !== userId);

  // Add new typing status
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
  // Filter out expired typing indicators
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
