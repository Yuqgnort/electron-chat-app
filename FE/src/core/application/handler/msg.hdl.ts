import { IConvRepo } from "@/core/domain/conv/repo";
import { IEventBus } from "../eventbus";
import { updateConvLastMessageId } from "../usecase/conv.uc";
import { EMsgStatus } from "@/core/domain/msg/entity";
import { setMsgDelivered, setMsgRead, setMsgSent } from "../usecase/msg.uc";
import { IMsgRepo } from "@/core/domain/msg/repo";

export const updateLastMsgHandler = (
  eventBus: IEventBus,
  convRepo: IConvRepo
) => {
  eventBus.subscribe("MsgCreated", async ({ payload }) => {
    const conv = await convRepo.getConvById(payload.conversationId);
    conv &&
      (await updateConvLastMessageId(convRepo, eventBus, conv, payload.id));
  });
};

export const msgUpdatedHandler = (eventBus: IEventBus, msgRepo: IMsgRepo) => {
  eventBus.subscribe("MsgUpdated", async ({ payload }) => {
    if (payload.status === EMsgStatus.PENDING)
      throw new Error(`Invalid msg ${payload.id} status: ${payload.status}`);
    const msgStatusActionMap = {
      [EMsgStatus.SENT]: setMsgSent,
      [EMsgStatus.DELIVERED]: setMsgDelivered,
      [EMsgStatus.READ]: setMsgRead,
    };
    await msgStatusActionMap[payload.status](msgRepo, eventBus, payload);
  });
};

export const updateMsgAckHandler = (eventBus: IEventBus, msgRepo: IMsgRepo) => {
  eventBus.subscribe("msg:ack", async ({ payload }) => {
    const res = await msgRepo.updateByLocalId(payload.localId, { ...payload });
    res &&
      eventBus.publish({
        type: "MsgUpdated",
        payload: res,
      });
  });
};
