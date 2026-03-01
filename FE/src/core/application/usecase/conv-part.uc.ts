import {
  createInitConvPart,
  IConvPartEntity,
} from "@/core/domain/conv-part/entity";
import { IConvPartRepo } from "@/core/domain/conv-part/repo";
import { assertExists, withErrorHandling } from "../error";

//////////////////////

export const getConvPartById = withErrorHandling(
  (
    convPartRepo: IConvPartRepo,
    id: IConvPartEntity["id"]
  ): Promise<IConvPartEntity | null> => {
    return convPartRepo.getConvPartById(id);
  },
  "getConvPartById"
);

export const getConvPartsByConvId = withErrorHandling(
  (convPartRepo: IConvPartRepo, convId: IConvPartEntity["conversationId"]) => {
    return convPartRepo.getConvPartsByConvId(convId);
  },
  "getConvPartsByConvId"
);

export const getConvPartsByUserId = withErrorHandling(
  (convPartRepo: IConvPartRepo, userId: IConvPartEntity["userId"]) => {
    return convPartRepo.getConvPartsByUserId(userId);
  },
  "getConvPartsByUserId"
);

//////////////////////

export const createConvPart = withErrorHandling(
  async (
    convPartRepo: IConvPartRepo,
    convPart: Parameters<typeof createInitConvPart>[0]
  ) => {
    const initNewConvPart = createInitConvPart(convPart);
    const newConvPart = await convPartRepo.createConvPart(initNewConvPart);
    const created = assertExists(
      newConvPart,
      "Failed to create conversation part"
    );
    return created;
  },
  "createConvPart"
);
