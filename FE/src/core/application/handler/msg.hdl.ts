import { IConvPartRepo } from "@/core/domain/conv-part/repo";
import { IConvRepo } from "@/core/domain/conv/repo";
import { createInitMsg, EMsgStatus } from "@/core/domain/msg/entity";
import { IMsgRepo } from "@/core/domain/msg/repo";
import { IPendingMsgRepo } from "@/core/domain/pending-msg/repo";
import { IEventBus } from "../eventbus";
import { createConvWithParticipants } from "../services";
import { ICommunicationManager, ITransactionManager } from "../services-facade";
import { updateConvLastMessageId } from "../usecase/conv.uc";
import { createMsg, setMsgDelivered, setMsgSent } from "../usecase/msg.uc";
import { getAllPendingMsgs, removePendingMsg } from "../usecase/pending-msg.uc";

export const updateLastMsgHandler = (
  eventBus: IEventBus,
  convRepo: IConvRepo
) => {
  eventBus.subscribe("MsgCreated", async ({ payload }) => {
    try {
      const conv = await convRepo.getConvById(payload.conversationId);
      if (!conv)
        throw new Error(
          `Conversation with id ${payload.conversationId} not found for last message update`
        );
      await updateConvLastMessageId(convRepo, eventBus, conv, payload.id);
    } catch (error) {
      console.error("Failed to update last message in conversation:", error);
    }
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
      status: EMsgStatus.DELIVERED,
    });

    const newMsg = await createMsg(msgRepo, eventBus, initNewMsg);

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

export const retrySendingPendingMessagesHandler = async (
  pendingMsgRepo: IPendingMsgRepo,
  eventBus: IEventBus,
  communicationManager: ICommunicationManager
) => {
  eventBus.subscribe("connect", async () => {
    console.log("Socket connected, retrying pending messages...");

    const pendingMsgs = await getAllPendingMsgs(pendingMsgRepo);
    console.log("Retrying pending messages:", pendingMsgs);

    for (const pendingMsg of pendingMsgs) {
      try {
        await communicationManager.sendMessage({
          content: pendingMsg.content,
          localId: pendingMsg.localId,
          senderId: pendingMsg.senderId,
          createdAt: pendingMsg.createdAt,
          receiverId: pendingMsg.receiverId,
          conversationId: pendingMsg.conversationId,
        });
        await removePendingMsg(pendingMsgRepo, eventBus, pendingMsg.localId);
      } catch (error) {
        console.error(
          `Failed to retry sending pending message ${pendingMsg.localId}:`,
          error
        );
      }
    }
  });
};
