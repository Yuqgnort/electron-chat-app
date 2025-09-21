import {
  createPendingMsg,
  incrementRetryCount,
  IPendingMsgEntity,
} from "@/core/domain/pending-msg/entity";
import { IPendingMsgRepo } from "@/core/domain/pending-msg/repo";
import { IEventBus } from "../eventbus";
import { assertExists, withErrorHandling } from "../error";

/////////////////////

export const getAllPendingMsgs = withErrorHandling(
  (pendingMsgRepo: IPendingMsgRepo): Promise<IPendingMsgEntity[]> => {
    return pendingMsgRepo.getAll();
  },
  "getAllPendingMsgs"
);

/////////////////////

export const addPendingMsg = withErrorHandling(
  async (
    pendingMsgRepo: IPendingMsgRepo,
    params: Parameters<typeof createPendingMsg>[0]
  ): Promise<IPendingMsgEntity> => {
    const pendingMsgData = createPendingMsg(params);
    const pendingMsg = assertExists(
      await pendingMsgRepo.save(pendingMsgData),
      "Failed to create pending message"
    );
    return pendingMsg;
  },
  "addPendingMsg"
);

export const retryPendingMsg = withErrorHandling(
  async (
    pendingMsgRepo: IPendingMsgRepo,
    pendingMsg: IPendingMsgEntity
  ): Promise<IPendingMsgEntity> => {
    const updatedPendingMsg = incrementRetryCount(pendingMsg);
    const result = assertExists(
      await pendingMsgRepo.update(updatedPendingMsg),
      `Failed to retry pending message ${pendingMsg.localId}`
    );
    return result;
  },
  "retryPendingMsg"
);

export const removePendingMsg = withErrorHandling(
  async (
    pendingMsgRepo: IPendingMsgRepo,
    localId: string
  ): Promise<boolean> => {
    const success = await pendingMsgRepo.deleteByLocalId(localId);
    return success;
  },
  "removePendingMsg"
);
