import { Server } from "socket.io";
import { setupSocketHandlers } from "./handlers";
import { startTypingCleanup } from "./utils";

export function setupSocket(io: Server) {
  setupSocketHandlers(io);
  startTypingCleanup(io);
}
