import { TBootstrapReturn } from "@/bootstrap";
import { useEffect } from "react";

export const useConnectSocket = (
  socket: TBootstrapReturn["socket"],
  userId?: string
) => {
  useEffect(() => {
    if (socket && userId && !socket.isConnected()) {
      socket.connectAndRegister(userId);
    }
  }, [socket, userId]);
};
