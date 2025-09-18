import { IConvPartRepo } from "../domain/conv-part/repo";
import { IConvEntity } from "../domain/conv/entity";
import { IConvRepo } from "../domain/conv/repo";
import { createInitMsg } from "../domain/msg/entity";
import { IMsgRepo } from "../domain/msg/repo";
import { IEventBus } from "./eventbus";
import { ICommunicationManager, ITransactionManager } from "./services-facade";
import { createConvPart } from "./usecase/conv-part.uc";
import { createConv } from "./usecase/conv.uc";
import { createMsg } from "./usecase/msg.uc";

export const createConvWithParticipants = async (
  conv: Omit<
    IConvEntity,
    "id" | "createdAt" | "updatedAt" | "lastMessageId" | "key"
  >,
  userIds: string[],
  convRepo: IConvRepo,
  convPartRepo: IConvPartRepo,
  eventBus: IEventBus,
  transactionManager: ITransactionManager
) => {
  return await transactionManager.executeInTransaction(
    ["conversations", "conversationParts"],
    async () => {
      const newConv = await createConv(convRepo, eventBus, conv, userIds);
      newConv &&
        (await Promise.all(
          userIds.map((userId) =>
            createConvPart(convPartRepo, eventBus, {
              conversationId: newConv.id,
              userId,
            })
          )
        ));
      return newConv;
    }
  );
};

export async function sendMsg(
  msgRepo: IMsgRepo,
  eventBus: IEventBus,
  communicationManager: ICommunicationManager,
  msg: Parameters<typeof createMsg>[2]
) {
  const newMsg = await createMsg(msgRepo, eventBus, msg);
  newMsg &&
    (await communicationManager.sendMessage({
      content: newMsg.content,
      conversationId: newMsg.conversationId,
      localId: newMsg.localId,
      senderId: newMsg.senderId,
      receiverId: newMsg.receiverId,
      createdAt: newMsg.createdAt,
    }));
  return newMsg;
}
