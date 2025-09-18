import { IMsgEntity } from "@/core/domain/msg/entity";
import { IMsgRepo } from "@/core/domain/msg/repo";
import { TPaginationResult, TTimeStamp } from "@/core/domain/type";
import Dexie from "dexie";
import { genUUID } from "../helper";
import { ChatDb } from "../init";

//////////////////////

export function createMsgRepoIdb(db: ChatDb): IMsgRepo {
  return {
    async save(msg) {
      const id = await db.messages.add(genUUID(msg));
      return (await db.messages.get(id)) || null;
    },
    async update(msg) {
      await db.messages.update(msg.id, msg);
      return (await db.messages.get(msg.id)) || null;
    },
    async getByLocalId(localId) {
      return (
        (await db.messages.where("localId").equals(localId).first()) || null
      );
    },
    async getById(id) {
      return (await db.messages.get(id)) || null;
    },
    async getByServerId(serverId) {
      return (
        (await db.messages.where("serverId").equals(serverId).first()) || null
      );
    },
    async getAll() {
      return db.messages.toArray();
    },
    async getByConversationId(
      conversationId,
      limit = 20,
      direction = "older",
      cursor
    ): Promise<TPaginationResult<IMsgEntity, TTimeStamp>> {
      let data: IMsgEntity[] = [];

      if (!cursor) {
        const results = await db.messages
          .where("[conversationId+createdAt]")
          .between(
            [conversationId, Dexie.minKey],
            [conversationId, Dexie.maxKey]
          )
          .reverse()
          .limit(limit + 1)
          .toArray();

        data = results.slice(0, limit);

        return {
          data: [...data].reverse(),
          nextCursor:
            results.length > limit ? data[data.length - 1].createdAt : null,
          prevCursor: null,
        };
      }

      if (direction === "older") {
        const results = await db.messages
          .where("[conversationId+createdAt]")
          .between([conversationId, Dexie.minKey], [conversationId, cursor])
          .reverse()
          .limit(limit + 1)
          .toArray();

        data = results.slice(0, limit);

        return {
          data: [...data].reverse(),
          nextCursor:
            results.length > limit ? data[data.length - 1].createdAt : null,
          prevCursor: data.length > 0 ? data[0].createdAt : null,
        };
      }

      if (direction === "newer") {
        const results = await db.messages
          .where("[conversationId+createdAt]")
          .between([conversationId, cursor], [conversationId, Dexie.maxKey])
          .limit(limit + 1)
          .toArray();

        data = results.slice(0, limit);

        return {
          data,
          nextCursor:
            results.length > limit ? data[data.length - 1].createdAt : null,
          prevCursor: data.length > 0 ? data[0].createdAt : null,
        };
      }

      // direction === "around"
      const half = Math.floor(limit / 2);

      const older = await db.messages
        .where("[conversationId+createdAt]")
        .between([conversationId, Dexie.minKey], [conversationId, cursor])
        .reverse()
        .limit(half + 1)
        .toArray();

      const newer = await db.messages
        .where("[conversationId+createdAt]")
        .between([conversationId, cursor], [conversationId, Dexie.maxKey])
        .limit(half + 1)
        .toArray();

      const olderData = older.slice(0, half).reverse();
      const newerData = newer.slice(0, half);

      data = [...olderData, ...newerData];

      return {
        data,
        nextCursor: data.length > 0 ? data[data.length - 1].createdAt : null,
        prevCursor: data.length > 0 ? data[0].createdAt : null,
      };
    },
  };
}
