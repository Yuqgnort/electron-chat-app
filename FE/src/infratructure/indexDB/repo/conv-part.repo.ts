import { IConvPartRepo } from "@/core/domain/conv-part/repo";
import { ChatDb } from "../init";
import { genUUID } from "../helper";

export const createConvPartRepoIdb = (db: ChatDb): IConvPartRepo => {
  return {
    async createConvPart(convPart) {
      const id = await db.conversationParts.add(genUUID(convPart));
      return (await db.conversationParts.get(id)) || null;
    },
    async getConvPartsByConvId(conversationId) {
      return (
        (await db.conversationParts
          .where("conversationId")
          .equals(conversationId)
          .toArray()) || null
      );
    },
    async getConvPartsByUserId(userId) {
      return (
        (await db.conversationParts.where("userId").equals(userId).toArray()) ||
        null
      );
    },
    async getConvPartById(id) {
      const convPart = await db.conversationParts.get(id);
      return convPart ?? null;
    },
  };
};
