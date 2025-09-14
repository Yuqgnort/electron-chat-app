import { Server } from "socket.io";
import { userSockets, pendingMessages } from "./state";

export function findSender(serverId: string): string {
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
