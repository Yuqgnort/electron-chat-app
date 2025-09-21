export const socketConfig = {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  connectTimeout: 45000,
  // Reduce ping interval for better user status tracking
  pingInterval: 15000,
  pingTimeout: 5000,
  maxHttpBufferSize: 1e6,
  allowUpgrades: true,
  transports: ["websocket" as const, "polling" as const],
  // Enable compression for better performance with user status updates
  compression: true,
  // Connection state recovery for better reliability
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
};

export default socketConfig;
