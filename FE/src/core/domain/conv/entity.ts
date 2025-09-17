import { IMsgEntity } from "../msg/entity";
import { TID, TTimeStamp } from "../type";

/////////////////

export interface IConvEntity {
  id: TID;
  key?: string | null;
  title?: string | null;
  createdAt: TTimeStamp;
  updatedAt: TTimeStamp;
  lastMessageId?: TID | null;
}

//////////////////

export const createInitConv = (
  params: Omit<IConvEntity, "createdAt" | "updatedAt" | "lastMessageId" | "id">
): Omit<IConvEntity, "id"> => {
  return {
    ...params,
    createdAt: new Date().getTime(),
    updatedAt: new Date().getTime(),
    lastMessageId: null,
  };
};

export const updateLastMessageId = (
  conv: IConvEntity,
  msgId: IMsgEntity["id"]
): IConvEntity => {
  return { ...conv, lastMessageId: msgId, updatedAt: new Date().getTime() };
};
