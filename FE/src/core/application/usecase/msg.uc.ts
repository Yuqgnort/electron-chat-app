import {
  createInitMsg,
  IMsgEntity,
  markMsgAsDelivered,
  markMsgAsRead,
  markMsgAsSent,
} from "@/core/domain/msg/entity";
import { IMsgRepo } from "@/core/domain/msg/repo";
import { IEventBus } from "../eventbus";
import { ICommunicationManager } from "../services-facade";
import { genUUID } from "@/infratructure/indexDB/helper";

/////////////////////

export async function getMsgById(
  msgRepo: IMsgRepo,
  id: IMsgEntity["id"]
): Promise<IMsgEntity | null> {
  return msgRepo.findById(id);
}

export async function getMsgsByConvId(
  msgRepo: IMsgRepo,
  conversationId: IMsgEntity["conversationId"]
): Promise<IMsgEntity[]> {
  return msgRepo.findByConversationId(conversationId);
}

export async function getAllMsgs(msgRepo: IMsgRepo): Promise<IMsgEntity[]> {
  return msgRepo.findAll();
}

/////////////////////

export async function createMsg(
  msgRepo: IMsgRepo,
  eventBus: IEventBus,
  communicationManager: ICommunicationManager,
  msg: Parameters<typeof createInitMsg>[0]
): Promise<IMsgEntity> {
  const initNewMsg = createInitMsg(genUUID(msg));
  const newMsg = await msgRepo.save(initNewMsg);
  eventBus.publish({
    type: "MsgCreated",
    payload: newMsg,
  });
  await communicationManager.sendMessage({
    content: newMsg.content,
    conversationId: newMsg.conversationId,
    localId: newMsg.localId,
    senderId: newMsg.senderId,
    receiverId: newMsg.receiverId,
    createdAt: newMsg.createdAt,
  });
  return newMsg;
}

export async function setMsgSent(
  msgRepo: IMsgRepo,
  eventBus: IEventBus,
  msg: IMsgEntity
): Promise<IMsgEntity> {
  const updated = markMsgAsSent(msg);
  await msgRepo.update(updated);
  eventBus.publish({
    type: "MsgUpdated",
    payload: updated,
  });
  return updated;
}

export async function setMsgDelivered(
  msgRepo: IMsgRepo,
  eventBus: IEventBus,
  msg: IMsgEntity
): Promise<IMsgEntity> {
  const updated = markMsgAsDelivered(msg);
  await msgRepo.update(updated);
  eventBus.publish({
    type: "MsgUpdated",
    payload: updated,
  });
  return updated;
}

export async function setMsgRead(
  msgRepo: IMsgRepo,
  eventBus: IEventBus,
  msg: IMsgEntity
): Promise<IMsgEntity> {
  const updated = markMsgAsRead(msg);
  await msgRepo.update(updated);
  eventBus.publish({
    type: "MsgUpdated",
    payload: updated,
  });
  return updated;
}
