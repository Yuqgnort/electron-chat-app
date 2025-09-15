import {
  IConvEntity,
  createInitConv,
  updateLastMessageId,
} from "@/core/domain/conv/entity";
import { IConvRepo } from "@/core/domain/conv/repo";
import { IUserEntity } from "@/core/domain/user/entity";
import { genUUID } from "@/infratructure/indexDB/helper";
import { IEventBus } from "../eventbus";

//////////////////////

export async function getConvById(
  convRepo: IConvRepo,
  id: IConvEntity["id"]
): Promise<IConvEntity | null> {
  return convRepo.getConvById(id);
}

export async function getConvByUserIds(
  convRepo: IConvRepo,
  userIds: IUserEntity["id"][]
): Promise<IConvEntity | null> {
  return convRepo.getConvByUserIds(userIds);
}

//////////////////////

export async function createConv(
  convRepo: IConvRepo,
  eventBus: IEventBus,
  conv: Parameters<typeof createInitConv>[0],
  userIds?: IUserEntity["id"][]
): Promise<IConvEntity> {
  const initNewConv = createInitConv(
    genUUID({
      ...conv,
      key: userIds.sort().join(":"),
    })
  );
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
