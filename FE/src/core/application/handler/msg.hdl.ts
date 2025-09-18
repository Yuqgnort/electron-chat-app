import { IConvPartRepo } from "@/core/domain/conv-part/repo";
import { IConvRepo } from "@/core/domain/conv/repo";
import { createInitMsg, markMsgAsDelivered } from "@/core/domain/msg/entity";
import { IMsgRepo } from "@/core/domain/msg/repo";
import { genUUID } from "@/infratructure/indexDB/helper";
import { IEventBus } from "../eventbus";
import { createConvWithParticipants } from "../services";
import { ICommunicationManager, ITransactionManager } from "../services-facade";
import { updateConvLastMessageId } from "../usecase/conv.uc";
import {
  createMsg,
  setMsgDelivered,
  setMsgRead,
  setMsgSent,
} from "../usecase/msg.uc";

export const updateLastMsgHandler = (
  eventBus: IEventBus,
  convRepo: IConvRepo
) => {
  eventBus.subscribe("MsgCreated", async ({ payload }) => {
    const conv = await convRepo.getConvById(payload.conversationId);
    if (!conv)
      throw new Error(
        `Conversation with id ${payload.conversationId} not found for last message update`
      );
    await updateConvLastMessageId(convRepo, eventBus, conv, payload.id);
  });
};

export const updateMsgAckHandler = (eventBus: IEventBus, msgRepo: IMsgRepo) => {
  eventBus.subscribe("msg:ack", async ({ payload }) => {
    const msgAck = await msgRepo.getByLocalId(payload.localId);
    const msg = msgAck ? { ...msgAck, serverId: payload.serverId } : null;
    if (!msg) {
      throw new Error(
        `Message with localId ${payload.localId} not found for ack update`
      );
    }
    await setMsgSent(msgRepo, eventBus, msg);
  });
};

export const updateMsgDeliveredHandler = (
  eventBus: IEventBus,
  msgRepo: IMsgRepo
) => {
  eventBus.subscribe("msg:delivered", async ({ payload }) => {
    const msg = await msgRepo.getByServerId(payload.serverId);
    if (!msg) {
      throw new Error(
        `Message with serverId ${payload.serverId} not found for delivery update`
      );
    }
    await setMsgDelivered(msgRepo, eventBus, msg);
  });
};

export const updateMsgReadHandler = (
  eventBus: IEventBus,
  msgRepo: IMsgRepo
) => {
  eventBus.subscribe("msg:read", async ({ payload }) => {
    const msg = await msgRepo.getByServerId(payload.serverId);
    if (!msg) {
      throw new Error(
        `Message with serverId ${payload.serverId} not found for read update`
      );
    }
    await setMsgRead(msgRepo, eventBus, msg);
  });
};

export const updateMsgIncomingHandler = (
  eventBus: IEventBus,
  msgRepo: IMsgRepo,
  convRepo: IConvRepo,
  convPartRepo: IConvPartRepo,
  transactionManager: ITransactionManager,
  communicationManager: ICommunicationManager
) => {
  eventBus.subscribe("msg:incoming", async ({ payload }) => {
    let conv = await convRepo.getConvByUserIds([
      payload.senderId,
      payload.receiverId,
    ]);

    if (!conv) {
      conv = await createConvWithParticipants(
        { title: "New Conversation" },
        [payload.senderId, payload.receiverId],
        convRepo,
        convPartRepo,
        eventBus,
        transactionManager
      );
      if (!conv) return;
    }

    const initNewMsg = createInitMsg({
      content: payload.content,
      conversationId: conv.id,
      senderId: payload.senderId,
      receiverId: payload.receiverId,
      serverId: payload.serverId,
    });

    const deliveredMsg = markMsgAsDelivered(genUUID(initNewMsg));
    const newMsg = await createMsg(msgRepo, eventBus, deliveredMsg);

    if (newMsg) {
      await updateConvLastMessageId(convRepo, eventBus, conv, newMsg.id);
      if (newMsg.serverId) {
        await communicationManager.deliverMessage({
          serverId: newMsg.serverId,
        });
      }
    }
  });
};
