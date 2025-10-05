import { useCallback, useEffect, useRef } from "react";
import { useAppContext } from "../context";

export interface IUseSimpleTypingParams {
  receiverUserId: string;
  typingTimeout?: number;
}

export interface IUseSimpleTypingReturn {
  handleInputChange: (value: string) => void;
}

export function useSimpleTyping({
  receiverUserId,
  typingTimeout = 3000,
}: IUseSimpleTypingParams): IUseSimpleTypingReturn {
  const { socket } = useAppContext();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const lastInputRef = useRef<string>("");

  const startTyping = useCallback(async () => {
    if (!isTypingRef.current && socket?.isConnected()) {
      try {
        socket.startTypingTo(receiverUserId);
        isTypingRef.current = true;
      } catch (error) {
        console.error("❌ Failed to start typing:", error);
      }
    }
  }, [socket, receiverUserId]);

  const stopTyping = useCallback(async () => {
    if (isTypingRef.current && socket?.isConnected()) {
      try {
        socket.stopTypingTo(receiverUserId);
        isTypingRef.current = false;
      } catch (error) {
        console.error("❌ Failed to stop typing:", error);
      }
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [socket, receiverUserId]);

  const handleInputChange = useCallback(
    (value: string) => {
      const trimmedValue = value.trim();
      const previousValue = lastInputRef.current.trim();

      lastInputRef.current = value;

      if (!trimmedValue && previousValue) {
        stopTyping();
        return;
      }

      if (trimmedValue) {
        startTyping();

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          stopTyping();
        }, typingTimeout);
      }
    },
    [startTyping, stopTyping, typingTimeout]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        stopTyping();
      }
    };
  }, [stopTyping]);

  return {
    handleInputChange,
  };
}
