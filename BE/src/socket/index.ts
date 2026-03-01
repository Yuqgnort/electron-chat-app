import { Server } from "socket.io";
import { setupSocketHandlers } from "./handlers";
import { startTypingCleanup, startUserStatusCleanup } from "./utils";

export function setupSocket(io: Server) {
  setupSocketHandlers(io);
  startTypingCleanup(io);
  startUserStatusCleanup(io);
}
