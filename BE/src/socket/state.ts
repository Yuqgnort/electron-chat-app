interface UserSockets {
  [userId: string]: string[];
}

export const userSockets: UserSockets = {};

export const pendingMessages: Record<string, any[]> = {};

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
