import { IUserEntity } from "@/core/domain/user/entity";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TUserStore {
  currentUser: IUserEntity | null;
  setCurrentUser: (user: IUserEntity | null) => void;
}

export const useCurrentUserStore = create<TUserStore>()(
  persist<TUserStore>(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
    }),
    { name: "user-storage" }
  )
);
