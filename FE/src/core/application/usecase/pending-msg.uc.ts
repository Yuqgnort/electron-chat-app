import {
  createPendingMsg,
  incrementRetryCount,
  IPendingMsgEntity,
} from "@/core/domain/pending-msg/entity";
import { IPendingMsgRepo } from "@/core/domain/pending-msg/repo";
import { IEventBus } from "../eventbus";

export const addPendingMsg = async (
  pendingMsgRepo: IPendingMsgRepo,
  eventBus: IEventBus,
  params: Parameters<typeof createPendingMsg>[0]
): Promise<IPendingMsgEntity | null> => {
  const pendingMsgData = createPendingMsg(params);

  const pendingMsg = await pendingMsgRepo.save(pendingMsgData);
  if (pendingMsg) {
    eventBus.publish({
      type: "PendingMsgCreated",
      payload: pendingMsg,
    });
  }

  return pendingMsg;
};

export const retryPendingMsg = async (
  pendingMsgRepo: IPendingMsgRepo,
  eventBus: IEventBus,
  pendingMsg: IPendingMsgEntity
): Promise<IPendingMsgEntity | null> => {
  const updatedPendingMsg = incrementRetryCount(pendingMsg);
  const result = await pendingMsgRepo.update(updatedPendingMsg);

  if (result) {
    eventBus.publish({
      type: "PendingMsgRetried",
      payload: result,
    });
  }

  return result;
};

export const removePendingMsg = async (
  pendingMsgRepo: IPendingMsgRepo,
  eventBus: IEventBus,
  localId: string
): Promise<boolean> => {
  const success = await pendingMsgRepo.deleteByLocalId(localId);

  if (success) {
    eventBus.publish({
      type: "PendingMsgRemoved",
      payload: { localId },
    });
  }

  return success;
};

export const getAllPendingMsgs = async (
  pendingMsgRepo: IPendingMsgRepo
): Promise<IPendingMsgEntity[]> => {
  return pendingMsgRepo.getAll();
};
