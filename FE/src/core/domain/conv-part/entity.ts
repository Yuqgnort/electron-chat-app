import { TID, TTimeStamp } from "../type";

/////////////////

export interface IConvPartEntity {
  id: TID;
  joinedAt: TTimeStamp;
  isMuted: boolean;
  isHidden: boolean;
  userId: TID;
  conversationId: TID;
}

//////////////////

export const createInitConvPart = (
  params: Omit<IConvPartEntity, "joinedAt" | "isMuted" | "isHidden" | "id">
) => {
  return {
    ...params,
    isMuted: false,
    isHidden: false,
    joinedAt: new Date().getTime(),
  };
};
