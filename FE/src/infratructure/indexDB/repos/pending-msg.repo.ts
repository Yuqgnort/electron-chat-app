import { IPendingMsgEntity } from "@/core/domain/pending-msg/entity";
import { IPendingMsgRepo } from "@/core/domain/pending-msg/repo";
import { genUUID } from "../helper";
import { ChatDb } from "../init";

export function createPendingMsgRepoIdb(db: ChatDb): IPendingMsgRepo {
  return {
    async save(pendingMsg) {
      const id = await db.pendingMessages.add(genUUID(pendingMsg));
      return (await db.pendingMessages.get(id)) || null;
    },

    async update(pendingMsg) {
      await db.pendingMessages.update(pendingMsg.id, pendingMsg);
      return (await db.pendingMessages.get(pendingMsg.id)) || null;
    },

    async getById(id) {
      return (await db.pendingMessages.get(id)) || null;
    },

    async getByLocalId(localId) {
      return (
        (await db.pendingMessages.where("localId").equals(localId).first()) ||
        null
      );
    },

    async getAll() {
      return db.pendingMessages.orderBy("createdAt").toArray();
    },

    async delete(id) {
      await db.pendingMessages.delete(id);
      return true;
    },

    async deleteByLocalId(localId) {
      const deleteCount = await db.pendingMessages
        .where("localId")
        .equals(localId)
        .delete();
      return deleteCount > 0;
    },

    async getByConversationId(conversationId) {
      return db.pendingMessages
        .where("conversationId")
        .equals(conversationId)
        .toArray();
    },
  };
}
