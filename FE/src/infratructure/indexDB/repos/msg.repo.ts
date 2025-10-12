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
      conversationId: string,
      limit = 50,
      direction: "older" | "newer" | "around" | "latest" = "latest",
      cursor?: number | null
    ): Promise<TPaginationResult<IMsgEntity, TTimeStamp>> {
      let data: IMsgEntity[] = [];

      if (!cursor && direction === "latest") {
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
          data: data.reverse(),
          nextCursor:
            results.length > limit &&
            data.length > 0 &&
            data[0].createdAt !== cursor
              ? data[0].createdAt
              : null,
          prevCursor: null,
        };
      }

      if (direction === "older" && cursor) {
        const results = await db.messages
          .where("[conversationId+createdAt]")
          .between(
            [conversationId, Dexie.minKey],
            [conversationId, cursor],
            true,
            false
          )
          .reverse()
          .limit(limit + 1)
          .toArray();

        data = results.slice(0, limit);

        return {
          data: data.reverse(),
          nextCursor: results.length > limit ? data[0].createdAt : null,
          prevCursor: data.length > 0 ? data[data.length - 1].createdAt : null,
        };
      }

      if (direction === "newer" && cursor) {
        const results = await db.messages
          .where("[conversationId+createdAt]")
          .between(
            [conversationId, cursor],
            [conversationId, Dexie.maxKey],
            false,
            true
          )
          .limit(limit + 1)
          .toArray();

        data = results.slice(0, limit);

        return {
          data: data,
          nextCursor:
            data.length > 0 && data[0].createdAt !== cursor
              ? data[0].createdAt
              : null,
          prevCursor:
            results.length > limit &&
            data.length > 0 &&
            data[data.length - 1].createdAt !== cursor
              ? data[data.length - 1].createdAt
              : null,
        };
      }

      if (direction === "around" && cursor) {
        const half = Math.floor(limit / 2);
        const older = await db.messages
          .where("[conversationId+createdAt]")
          .between(
            [conversationId, Dexie.minKey],
            [conversationId, cursor],
            true,
            true
          )
          .reverse()
          .limit(half + 1)
          .toArray();

        const newer = await db.messages
          .where("[conversationId+createdAt]")
          .between(
            [conversationId, cursor],
            [conversationId, Dexie.maxKey],
            true,
            true
          )
          .limit(half + 1)
          .toArray();

        const olderData = older.slice(0, half).reverse();
        const newerData = newer.slice(0, half);
        data = [...olderData, ...newerData];

        const unique = [
          ...new Map(
            data.map((item) => [`${item.id}-${item.localId}`, item])
          ).values(),
        ];

        return {
          data: unique,
          nextCursor:
            olderData.length > 0 &&
            olderData[0].createdAt !== cursor &&
            olderData.length >= half
              ? olderData[0].createdAt
              : null,
          prevCursor:
            newerData.length > 0 &&
            newerData[newerData.length - 1].createdAt !== cursor &&
            newerData.length >= half
              ? newerData[newerData.length - 1].createdAt
              : null,
        };
      }

      return {
        data: [],
        nextCursor: null,
        prevCursor: null,
      };
    },
    async countAll() {
      return db.messages.count();
    },
    async getManyByIds(ids) {
      const rs = await db.messages.bulkGet(ids);
      return rs.filter((r): r is IMsgEntity => r !== undefined) || null;
    },
  };
}
