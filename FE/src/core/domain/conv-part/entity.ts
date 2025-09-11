import { IConvEntity } from "../conv/entity";
import { IUserEntity } from "../user/entity";

/////////////////

export interface IConvPartEntity {
  id: string;
  joinedAt: Date;
  isMuted: boolean;
  isHidden: boolean;
  userId: IUserEntity["id"];
  conversationId: IConvEntity["id"];
}

//////////////////

export const createInitConvPart = (
  params: Omit<IConvPartEntity, "joinedAt" | "isMuted" | "isHidden" | "id">
) => {
  return {
    ...params,
    isMuted: false,
    isHidden: false,
    joinedAt: new Date(),
  };
};
