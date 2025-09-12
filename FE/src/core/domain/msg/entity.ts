export enum EMsgStatus {
  SENT = "sent",
  READ = "read",
  PENDING = "Pending",
  DELIVERED = "delivered",
}

export interface IMsgEntity {
  id: string;
  localId: string;
  serverId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  status: EMsgStatus;
  receiverId: string;
  conversationId: string;
}

///////////////////

export const createInitMsg = (
  params: Omit<
    IMsgEntity,
    "id" | "createdAt" | "status" | "localId" | "serverId"
  >
): Omit<IMsgEntity, "id"> => {
  return {
    ...params,
    serverId: null,
    createdAt: new Date(),
    status: EMsgStatus.PENDING,
    localId: crypto.randomUUID(),
  };
};

export const markMsgAsSent = (msg: IMsgEntity): IMsgEntity => {
  if (msg.status !== EMsgStatus.PENDING)
    throw new Error("Only pending msg can be marked as sent");
  return {
    ...msg,
    status: EMsgStatus.SENT,
  };
};

export const markMsgAsDelivered = (msg: IMsgEntity): IMsgEntity => {
  if (msg.status !== EMsgStatus.SENT)
    throw new Error("Only sent msg can be marked as delivered");
  return {
    ...msg,
    status: EMsgStatus.DELIVERED,
  };
};

export const markMsgAsRead = (msg: IMsgEntity): IMsgEntity => {
  if (msg.status !== EMsgStatus.DELIVERED)
    throw new Error("Only delivered msg can be marked as read");
  return {
    ...msg,
    status: EMsgStatus.READ,
  };
};
