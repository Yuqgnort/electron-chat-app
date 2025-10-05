import { TBootstrapReturn } from "@/bootstrap";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSubscribeEventBus } from "./useSubscribeEventBus";

export interface IUserStatus {
  userId: string;
  status: "online" | "offline";
  lastSeen: number;
}

export interface IUseUserStatusReturn {
  userStatuses: Map<string, IUserStatus>;
  getUserStatus: (userId: string) => IUserStatus | undefined;
  isUserOnline: (userId: string) => boolean;
  requestUserStatus: (userIds: string[]) => Promise<void>;
  requestAllOnlineUsers: () => Promise<void>;
  getUserLastSeen: (userId: string) => number | undefined;
  ensureUserStatus: (userId: string) => Promise<void>;
  isLoading: boolean;
  hasInitialData: boolean;
}

// Cache key cho localStorage
const USER_STATUS_CACHE_KEY = "userStatusCache";
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 phút

interface ICachedStatus extends IUserStatus {
  cachedAt: number;
}

export const useUserStatus = (
  socket: TBootstrapReturn["socket"],
  eventBus: TBootstrapReturn["eventBus"]
): IUseUserStatusReturn => {
  const [userStatuses, setUserStatuses] = useState<Map<string, IUserStatus>>(
    () => {
      // Load từ cache khi khởi tạo
      try {
        const cached = localStorage.getItem(USER_STATUS_CACHE_KEY);
        if (cached) {
          const parsedCache: Record<string, ICachedStatus> = JSON.parse(cached);
          const now = Date.now();
          const validCache = new Map<string, IUserStatus>();

          Object.entries(parsedCache).forEach(([userId, cachedStatus]) => {
            // Chỉ load cache còn valid (chưa hết hạn)
            if (now - cachedStatus.cachedAt < CACHE_EXPIRY_MS) {
              validCache.set(userId, {
                userId: cachedStatus.userId,
                status: cachedStatus.status,
                lastSeen: cachedStatus.lastSeen,
              });
            }
          });

          return validCache;
        }
      } catch (error) {
        console.error("Failed to load user status cache:", error);
      }
      return new Map();
    }
  );

  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);

  // Save to cache whenever userStatuses changes
  useEffect(() => {
    if (userStatuses.size > 0) {
      const cacheData: Record<string, ICachedStatus> = {};
      const now = Date.now();

      userStatuses.forEach((status, userId) => {
        cacheData[userId] = {
          ...status,
          cachedAt: now,
        };
      });

      try {
        localStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify(cacheData));
      } catch (error) {
        console.error("Failed to save user status cache:", error);
      }
    }
  }, [userStatuses]);

  // Lắng nghe sự kiện user online
  useSubscribeEventBus(
    eventBus,
    "user:online",
    useCallback((payload) => {
      setUserStatuses((prev) => {
        const newMap = new Map(prev);
        newMap.set(payload.userId, {
          userId: payload.userId,
          status: "online",
          lastSeen: Date.now(),
        });
        return newMap;
      });
    }, []),
    []
  );

  // Lắng nghe sự kiện user offline
  useSubscribeEventBus(
    eventBus,
    "user:offline",
    useCallback((payload) => {
      setUserStatuses((prev) => {
        const newMap = new Map(prev);
        const existingStatus = newMap.get(payload.userId);
        newMap.set(payload.userId, {
          userId: payload.userId,
          status: "offline",
          lastSeen: existingStatus?.lastSeen || Date.now(),
        });
        return newMap;
      });
    }, []),
    []
  );

  // Lắng nghe sự kiện thay đổi status
  useSubscribeEventBus(
    eventBus,
    "user:status_change",
    useCallback((payload) => {
      setUserStatuses((prev) => {
        const newMap = new Map(prev);
        newMap.set(payload.userId, {
          userId: payload.userId,
          status: payload.status,
          lastSeen: payload.lastSeen,
        });
        return newMap;
      });
    }, []),
    []
  );

  // Lắng nghe cập nhật last seen
  useSubscribeEventBus(
    eventBus,
    "user:last_seen_update",
    useCallback((payload) => {
      setUserStatuses((prev) => {
        const newMap = new Map(prev);
        const existingStatus = newMap.get(payload.userId);
        if (existingStatus) {
          newMap.set(payload.userId, {
            ...existingStatus,
            lastSeen: payload.lastSeen,
          });
        }
        return newMap;
      });
    }, []),
    []
  );

  // Lắng nghe response của tất cả users online
  useSubscribeEventBus(
    eventBus,
    "users:all_online_response",
    useCallback((payload) => {
      setUserStatuses((prev) => {
        const newMap = new Map(prev);
        payload.onlineUsers.forEach((user) => {
          newMap.set(user.userId, {
            userId: user.userId,
            status: user.status,
            lastSeen: user.lastSeen,
          });
        });
        return newMap;
      });
      setHasInitialData(true);
      setIsLoading(false);
    }, []),
    []
  );

  // Lấy status của một user cụ thể
  const getUserStatus = useCallback(
    (userId: string): IUserStatus | undefined => {
      return userStatuses.get(userId);
    },
    [userStatuses]
  );

  // Kiểm tra user có online không
  const isUserOnline = useCallback(
    (userId: string): boolean => {
      if (!userId) return false;
      const status = userStatuses.get(userId);
      return status?.status === "online";
    },
    [userStatuses]
  );

  // Request status của các users
  const requestUserStatus = useCallback(
    async (userIds: string[]): Promise<void> => {
      if (!socket || userIds.length === 0) return;

      setIsLoading(true);
      try {
        await socket.requestUsersStatus({ userIds });
      } catch (error) {
        console.error("Failed to request user status:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [socket]
  );

  // Request tất cả users online
  const requestAllOnlineUsers = useCallback(async (): Promise<void> => {
    if (!socket) return;

    setIsLoading(true);
    try {
      await socket.requestAllOnlineUsers({});
    } catch (error) {
      console.error("Failed to request all online users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [socket]);

  // Lấy last seen của user
  const getUserLastSeen = useCallback(
    (userId: string): number | undefined => {
      return userStatuses.get(userId)?.lastSeen;
    },
    [userStatuses]
  );

  // Method để ensure có status data cho user
  const ensureUserStatus = useCallback(
    async (userId: string): Promise<void> => {
      if (!userId || userStatuses.has(userId) || !socket?.isConnected()) {
        return;
      }

      try {
        await socket.requestUsersStatus({ userIds: [userId] });
      } catch (error) {
        console.error("Failed to ensure user status:", error);
      }
    },
    [userStatuses, socket]
  );

  // Auto request all online users khi socket connected (chỉ nếu chưa có initial data)
  useSubscribeEventBus(
    eventBus,
    "connect",
    useCallback(() => {
      if (!hasInitialData) {
        requestAllOnlineUsers();
      }
    }, [requestAllOnlineUsers, hasInitialData]),
    []
  );

  // Memoized return value
  const returnValue = useMemo(
    () => ({
      userStatuses,
      getUserStatus,
      isUserOnline,
      requestUserStatus,
      requestAllOnlineUsers,
      getUserLastSeen,
      ensureUserStatus,
      isLoading,
      hasInitialData,
    }),
    [
      userStatuses,
      getUserStatus,
      isUserOnline,
      requestUserStatus,
      requestAllOnlineUsers,
      getUserLastSeen,
      ensureUserStatus,
      isLoading,
      hasInitialData,
    ]
  );

  return returnValue;
};
