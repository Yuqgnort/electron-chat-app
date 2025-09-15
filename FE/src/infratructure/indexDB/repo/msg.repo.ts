import { IMsgRepo } from "@/core/domain/msg/repo";
import { genUUID } from "../helper";
import { ChatDb } from "../init";

//////////////////////

export function createMsgRepoIdb(db: ChatDb): IMsgRepo {
  return {
    async save(msg) {
      const id = await db.messages.add(genUUID(msg));
      return await db.messages.get(id);
    },
    async update(msg) {
      await db.messages.update(msg.id, msg);
      return await db.messages.get(msg.id);
    },
    async findById(id) {
      return await db.messages.get(id);
    },
    async findByConversationId(conversationId) {
      return db.messages
        .where("conversationId")
        .equals(conversationId)
        .toArray();
    },
    async findAll() {
      return db.messages.toArray();
    },
  };
}
