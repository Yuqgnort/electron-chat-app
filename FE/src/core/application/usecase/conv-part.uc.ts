import {
  createInitConvPart,
  IConvPartEntity,
} from "@/core/domain/conv-part/entity";
import { IConvPartRepo } from "@/core/domain/conv-part/repo";
import { IEventBus } from "../eventbus";

//////////////////////

export async function getConvPartById(
  convPartRepo: IConvPartRepo,
  id: IConvPartEntity["id"]
): Promise<IConvPartEntity | null> {
  return convPartRepo.getConvPartById(id);
}

export async function getConvPartsByConvId(
  convPartRepo: IConvPartRepo,
  convId: IConvPartEntity["conversationId"]
) {
  return convPartRepo.getConvPartsByConvId(convId);
}

export async function getConvPartsByUserId(
  convPartRepo: IConvPartRepo,
  userId: IConvPartEntity["userId"]
) {
  return convPartRepo.getConvPartsByUserId(userId);
}

//////////////////////

export async function createConvPart(
  convPartRepo: IConvPartRepo,
  eventBus: IEventBus,
  convPart: Parameters<typeof createInitConvPart>[0]
) {
  const initNewConvPart = createInitConvPart(convPart);
  const newConvPart = await convPartRepo.createConvPart(initNewConvPart);
  newConvPart &&
    eventBus.publish({
      type: "ConvPartCreated",
      payload: newConvPart,
    });
  return newConvPart;
}
