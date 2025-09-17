import { IConvRepo } from "@/core/domain/conv/repo";
import { ChatDb } from "../init";
import { genUUID } from "../helper";

//////////////////////

export const createConvRepoIdb = (db: ChatDb): IConvRepo => {
  return {
    async createConv(conv) {
      const id = await db.conversations.add(genUUID(conv));
      return (await db.conversations.get(id)) || null;
    },
    async getConvById(id) {
      const conv = await db.conversations.get(id);
      return conv ?? null;
    },
    async getConvByUserIds(userIds) {
      if (userIds.length !== 2) {
        return null;
      }
      const key = [...userIds].sort().join(":");
      const conv = await db.conversations.get({ key });
      return conv ?? null;
    },
    async updateConv(conv) {
      const updated = await db.conversations.put(conv);
      return (await db.conversations.get(updated)) || null;
    },
  };
};
