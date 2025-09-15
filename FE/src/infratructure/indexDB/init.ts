import { IConvPartEntity } from "@/core/domain/conv-part/entity";
import { IConvEntity } from "@/core/domain/conv/entity";
import { IMsgEntity } from "@/core/domain/msg/entity";
import { IUserEntity } from "@/core/domain/user/entity";
import Dexie, { Table } from "dexie";

let db: ChatDb | null = null;

export class ChatDb extends Dexie {
  users!: Table<IUserEntity, string>;
  conversations!: Table<IConvEntity, string>;
  conversationParts!: Table<IConvPartEntity, string>;
  messages!: Table<IMsgEntity, string>;

  constructor() {
    super("chat-db");
    this.version(1).stores({
      users: "id, username",
      conversations: "id, &key, updatedAt",
      messages: "id, conversationId, localId",
      conversationParts: "id, conversationId, userId",
    });
  }
}

export async function initDb(): Promise<ChatDb> {
  if (!db) {
    db = new ChatDb();
    await db.open();
  }
  return db;
}
