import express from "express";
import http from "http";
import { Server } from "socket.io";
import { setupSocket } from "./socket";
import socketConfig from "./config/socket.config";

const PORT = 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, socketConfig);

setupSocket(io);

app.get("/", (req, res) => {
  res.send("🚀 Socket Relay Server running...");
});

server.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
