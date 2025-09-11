import {
  IConvEntity,
  createInitConv,
  updateLastMessageId,
} from "@/core/domain/conv/entity";
import { IConvRepo } from "@/core/domain/conv/repo";
import { IUserEntity } from "@/core/domain/user/entity";
import { IEventBus } from "../eventbus";
import { ITransactionManager } from "../services-facade";
import { IConvPartRepo } from "@/core/domain/conv-part/repo";
import { createConvPart } from "./conv-part.uc";

//////////////////////

export async function getConvById(
  convRepo: IConvRepo,
  id: IConvEntity["id"]
): Promise<IConvEntity | null> {
  return convRepo.getConvById(id);
}

export async function getConvsByUserId(
  convRepo: IConvRepo,
  userId: IUserEntity["id"]
): Promise<IConvEntity[]> {
  return convRepo.getConvsByUserId(userId);
}

//////////////////////

export async function createConv(
  convRepo: IConvRepo,
  eventBus: IEventBus,
  conv?: Parameters<typeof createInitConv>[0]
): Promise<IConvEntity> {
  const initNewConv = createInitConv(conv);
  const newConv = await convRepo.createConv(initNewConv);
  eventBus.publish({
    type: "ConvCreated",
    payload: newConv,
  });
  return newConv;
}

export async function updateConvLastMessageId(
  convRepo: IConvRepo,
  eventBus: IEventBus,
  conv: IConvEntity,
  msgId: IConvEntity["lastMessageId"]
): Promise<IConvEntity> {
  const updated = updateLastMessageId(conv, msgId);
  await convRepo.updateConv(updated);
  eventBus.publish({
    type: "ConvLastMessageChanged",
    payload: updated,
  });
  return updated;
}

export async function createConvWithParticipants(
  transactionManager: ITransactionManager,
  convRepo: IConvRepo,
  convPartRepo: IConvPartRepo,
  eventBus: IEventBus,
  userIds: string[]
) {
  return await transactionManager.executeInTransaction(
    ["conversations", "convParts"],
    async () => {
      const newConv = await createConv(convRepo, eventBus);
      await Promise.all(
        userIds.map((userId) =>
          createConvPart(convPartRepo, eventBus, {
            conversationId: newConv.id,
            userId,
          })
        )
      );
      return newConv;
    }
  );
}
