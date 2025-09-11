import { IConvRepo } from "@/core/domain/conv/repo";
import { ChatDb } from "../init";
import { genUUID } from "../helper";

//////////////////////

export const createConvRepoIdb = (db: ChatDb): IConvRepo => {
  return {
    async createConv(conv) {
      const id = await db.conversations.add(genUUID(conv));
      return await db.conversations.get(id);
    },
    async getConvById(id) {
      const conv = await db.conversations.get(id);
      return conv ?? null;
    },
    async getConvsByUserId(userId) {
      return await db.conversations.where("id").equals(userId).toArray();
    },
    async updateConv(conv) {
      const updated = await db.conversations.put(conv);
      return await db.conversations.get(updated);
    },
  };
};
