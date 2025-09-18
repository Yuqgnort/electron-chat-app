import {
  createInitMsg,
  IMsgEntity,
  markMsgAsDelivered,
  markMsgAsRead,
  markMsgAsSent,
  TMsgDirection,
} from "@/core/domain/msg/entity";
import { IMsgRepo } from "@/core/domain/msg/repo";
import { genUUID } from "@/infratructure/indexDB/helper";
import { IEventBus } from "../eventbus";
import { ICommunicationManager } from "../services-facade";

/////////////////////

export async function getMsgById(msgRepo: IMsgRepo, id: IMsgEntity["id"]) {
  return msgRepo.getById(id);
}

export async function getMsgsByConvId(
  msgRepo: IMsgRepo,
  conversationId: IMsgEntity["conversationId"],
  limit: number,
  direction: TMsgDirection,
  cursor: IMsgEntity["createdAt"] | null
) {
  return msgRepo.getByConversationId(conversationId, limit, direction, cursor);
}

export async function getAllMsgs(msgRepo: IMsgRepo) {
  return msgRepo.getAll();
}

export async function getByLocalId(
  msgRepo: IMsgRepo,
  localId: IMsgEntity["localId"]
) {
  return msgRepo.getByLocalId(localId);
}

export async function getByServerId(msgRepo: IMsgRepo, serverId: string) {
  return msgRepo.getByServerId(serverId);
}

/////////////////////

export async function createMsg(
  msgRepo: IMsgRepo,
  eventBus: IEventBus,
  msg: Parameters<typeof createInitMsg>[0]
) {
  const initNewMsg = createInitMsg(genUUID(msg));
  const newMsg = await msgRepo.save(initNewMsg);
  newMsg &&
    eventBus.publish({
      type: "MsgCreated",
      payload: newMsg,
    });
  return newMsg;
}

export async function setMsgSent(
  msgRepo: IMsgRepo,
  eventBus: IEventBus,
  msg: IMsgEntity
) {
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
) {
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
) {
  const updated = markMsgAsRead(msg);
  await msgRepo.update(updated);
  eventBus.publish({
    type: "MsgUpdated",
    payload: updated,
  });
  return updated;
}
