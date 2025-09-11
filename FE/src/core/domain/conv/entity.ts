import { IMsgEntity } from "../msg/entity";

/////////////////

export interface IConvEntity {
  id: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageId?: IMsgEntity["id"] | null;
}

//////////////////

export const createInitConv = (
  params: Omit<IConvEntity, "createdAt" | "updatedAt" | "lastMessageId" | "id">
): Omit<IConvEntity, "id"> => {
  return {
    ...params,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessageId: null,
  };
};

export const updateLastMessageId = (
  conv: IConvEntity,
  msgId: IMsgEntity["id"]
): IConvEntity => {
  return { ...conv, lastMessageId: msgId, updatedAt: new Date() };
};
