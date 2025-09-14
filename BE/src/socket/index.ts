import { Server } from "socket.io";
import { setupSocketHandlers } from "./handlers";

export function setupSocket(io: Server) {
  setupSocketHandlers(io);
}
