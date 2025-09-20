import { TID, TTimeStamp } from "../type";

export type TMsgDirection = "older" | "newer" | "around";

export enum EMsgStatus {
  SENT = "sent",
  PENDING = "pending",
  DELIVERED = "delivered",
}

export interface IMsgEntity {
  id: TID;
  localId: string;
  serverId: string | null;
  senderId: string;
  content: string;
  createdAt: TTimeStamp;
  status: EMsgStatus;
  receiverId: string;
  conversationId: string;
}

///////////////////

export const createInitMsg = (
  params: Omit<IMsgEntity, "id" | "createdAt" | "localId"> & {
    status?: EMsgStatus;
  }
) => {
  return {
    ...params,
    localId: crypto.randomUUID(),
    createdAt: new Date().getTime(),
    status: params.status || EMsgStatus.PENDING,
  };
};

export const markMsgAsSent = (msg: IMsgEntity): IMsgEntity => {
  return {
    ...msg,
    status: EMsgStatus.SENT,
  };
};

export const markMsgAsDelivered = (msg: IMsgEntity) => {
  return {
    ...msg,
    status: EMsgStatus.DELIVERED,
  };
};
