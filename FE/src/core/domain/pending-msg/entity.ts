import { TID, TTimeStamp } from "../type";

export interface IPendingMsgEntity {
  id: TID;
  localId: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  content: string;
  createdAt: TTimeStamp;
  retryCount: number;
  lastRetryAt: TTimeStamp | null;
}

export const createPendingMsg = (
  params: Omit<
    IPendingMsgEntity,
    "id" | "retryCount" | "lastRetryAt" | "createdAt"
  >
): Omit<IPendingMsgEntity, "id"> => {
  return {
    ...params,
    createdAt: new Date().getTime(),
    retryCount: 0,
    lastRetryAt: null,
  };
};

export const incrementRetryCount = (
  pendingMsg: IPendingMsgEntity
): IPendingMsgEntity => {
  return {
    ...pendingMsg,
    retryCount: pendingMsg.retryCount + 1,
    lastRetryAt: new Date().getTime(),
  };
};
