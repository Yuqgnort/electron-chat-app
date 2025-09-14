import { Server } from "socket.io";
import { userSockets, pendingMessages } from "./state";

export function findSender(server_id: string): string {
  for (const user in pendingMessages) {
    for (const msg of pendingMessages[user]) {
      if (msg.server_id === server_id) return msg.from;
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
    io.to(sid).emit("chat:message:status", {
      server_id: serverId,
      status,
    });
  });
}
