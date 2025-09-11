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
      const updated = await db.messages.put(msg);
      return await db.messages.get(updated);
    },
    async findById(id) {
      const msg = await db.messages.get(id);
      return msg ?? null;
    },
    async findByConversationId(conversationId) {
      return db.messages
        .where("conversationId")
        .equals(conversationId)
        .toArray();
    },
  };
}
