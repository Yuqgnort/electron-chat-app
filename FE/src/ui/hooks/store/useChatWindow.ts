import { IUserEntity } from "@/core/domain/user/entity";
import { create } from "zustand";

export type TChatWindowStore = {
  chatBoxState: {
    receiverUser: IUserEntity | null;
    conversationId: string | null;
  };
  setChatBoxState: (state: TChatWindowStore["chatBoxState"]) => void;
};

export const useChatWindowStore = create<TChatWindowStore>((set) => ({
  chatBoxState: {
    receiverUser: null,
    conversationId: null,
  },
  setChatBoxState: (state) => set({ chatBoxState: state }),
}));
