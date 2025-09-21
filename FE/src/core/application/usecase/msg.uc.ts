import {
  createInitMsg,
  IMsgEntity,
  markMsgAsDelivered,
  markMsgAsSent,
  TMsgDirection,
} from "@/core/domain/msg/entity";
import { IMsgRepo } from "@/core/domain/msg/repo";
import { assertExists, withErrorHandling } from "../error";

/////////////////////

export const getMsgById = withErrorHandling(
  (msgRepo: IMsgRepo, id: IMsgEntity["id"]) => {
    return msgRepo.getById(id);
  },
  "getMsgById"
);

export const getMsgsByConvId = withErrorHandling(
  (
    msgRepo: IMsgRepo,
    conversationId: IMsgEntity["conversationId"],
    limit: number,
    direction: TMsgDirection,
    cursor: IMsgEntity["createdAt"] | null
  ) => {
    return msgRepo.getByConversationId(
      conversationId,
      limit,
      direction,
      cursor
    );
  },
  "getMsgsByConvId"
);

export const getAllMsgs = withErrorHandling((msgRepo: IMsgRepo) => {
  return msgRepo.getAll();
}, "getAllMsgs");

export const getByLocalId = withErrorHandling(
  (msgRepo: IMsgRepo, localId: IMsgEntity["localId"]) => {
    return msgRepo.getByLocalId(localId);
  },
  "getByLocalId"
);

export const getByServerId = withErrorHandling(
  (msgRepo: IMsgRepo, serverId: string) => {
    return msgRepo.getByServerId(serverId);
  },
  "getByServerId"
);

/////////////////////

export const createMsg = withErrorHandling(
  async (msgRepo: IMsgRepo, msg: Parameters<typeof createInitMsg>[0]) => {
    const initNewMsg = createInitMsg(msg);
    const newMsg = assertExists(
      await msgRepo.save(initNewMsg),
      "Failed to create message"
    );
    return newMsg;
  },
  "createMsg"
);

export const setMsgSent = withErrorHandling(
  async (msgRepo: IMsgRepo, msg: IMsgEntity) => {
    const updated = markMsgAsSent(msg);
    await msgRepo.update(updated);
    return updated;
  },
  "setMsgSent"
);

export const setMsgDelivered = withErrorHandling(
  async (msgRepo: IMsgRepo, msg: IMsgEntity) => {
    const updated = markMsgAsDelivered(msg);
    await msgRepo.update(updated);
    return updated;
  },
  "setMsgDelivered"
);
