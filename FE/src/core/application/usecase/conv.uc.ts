import {
  IConvEntity,
  createInitConv,
  updateLastMessageId,
} from "@/core/domain/conv/entity";
import { IConvRepo } from "@/core/domain/conv/repo";
import { IUserEntity } from "@/core/domain/user/entity";
import { assertExists, withErrorHandling } from "../error";

//////////////////////

export const getConvById = withErrorHandling(
  (convRepo: IConvRepo, id: IConvEntity["id"]): Promise<IConvEntity | null> => {
    return convRepo.getConvById(id);
  },
  "getConvById"
);

export const getConvByUserIds = withErrorHandling(
  (
    convRepo: IConvRepo,
    userIds: IUserEntity["id"][]
  ): Promise<IConvEntity | null> => {
    return convRepo.getConvByUserIds(userIds);
  },
  "getConvByUserIds"
);

///////////////////////

export const createConv = withErrorHandling(
  async (
    convRepo: IConvRepo,
    conv: Parameters<typeof createInitConv>[0],
    userIds: IUserEntity["id"][]
  ) => {
    const initNewConv = createInitConv({
      ...conv,
      key: userIds.sort().join(":"),
    });

    const newConv = assertExists(
      await convRepo.createConv(initNewConv),
      "Failed to create conversation"
    );
    return newConv;
  },
  "createConv"
);

export const updateConvLastMessageId = withErrorHandling(
  async (
    convRepo: IConvRepo,
    conv: IConvEntity,
    msgId: IConvEntity["lastMessageId"]
  ) => {
    if (!conv || !msgId) return null;
    const updated = updateLastMessageId(conv, msgId);
    await convRepo.updateConv(updated);
    return updated;
  },
  "updateConvLastMessageId"
);
