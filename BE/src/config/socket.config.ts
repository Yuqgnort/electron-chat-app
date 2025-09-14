export const socketConfig = {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  connectTimeout: 45000,
  pingInterval: 25000,
  pingTimeout: 5000,
  maxHttpBufferSize: 1e6,
  allowUpgrades: true,
  transports: ["websocket" as const, "polling" as const],
};

export default socketConfig;
