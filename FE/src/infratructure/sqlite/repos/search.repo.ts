import {
  createSearchIndexResult,
  ESearchType,
  IMessageIndexData,
  ISearchIndexItem,
  ISearchIndexResult,
  ISearchQuery,
  TCursor,
} from "@/core/domain/search/entity";
import { ISearchRepository } from "@/core/domain/search/repo";
import { TID } from "@/core/domain/type";
import {
  mapSQLiteRows,
  parseTimestamp,
  sanitizeString,
  validateRequiredFields,
} from "../helper";
import { SQLiteWorkerDB } from "../init";

let currentKeyword = "";

const escapeSQLString = (value?: string | number | null): string => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return value.toString();

  return `'${String(value).replace(/'/g, "''")}'`;
};

const ensureCacheTable = async (db: SQLiteWorkerDB) => {
  const sql = `
    CREATE TEMP TABLE IF NOT EXISTS temp_search_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT,
      messageId TEXT UNIQUE,
      content TEXT,
      senderId TEXT,
      receiverId TEXT,
      conversationId TEXT,
      createdAt INTEGER
    )
  `;
  await db.exec(sql);
};

const buildDeleteCacheSQL = (keyword: string) => `
  DELETE FROM temp_search_cache
  WHERE keyword != ${escapeSQLString(keyword)};
`;

const buildInsertCacheSQL = (row: ISearchIndexItem, keyword: string) => `
  INSERT OR IGNORE INTO temp_search_cache
  (keyword, messageId, content, senderId, receiverId, conversationId, createdAt)
  VALUES (
    ${escapeSQLString(keyword)},
    ${escapeSQLString(row.messageId)},
    ${escapeSQLString(row.content)},
    ${escapeSQLString(row.senderId)},
    ${escapeSQLString(row.receiverId)},
    ${escapeSQLString(row.conversationId)},
    ${escapeSQLString(row.createdAt)}
  );
`;

const buildTrimCacheSQL = (keyword: string) => `
  DELETE FROM temp_search_cache
  WHERE keyword = ${escapeSQLString(keyword)}
  AND id NOT IN (
    SELECT id FROM temp_search_cache
    WHERE keyword = ${escapeSQLString(keyword)}
    ORDER BY createdAt DESC
    LIMIT 1000
  );
`;

const buildSelectCacheSQL = (keyword: string, cursor?: number, limit = 100) => `
  SELECT * FROM temp_search_cache
  WHERE keyword = ${escapeSQLString(keyword)}
  ${cursor ? `AND id < ${cursor}` : ""}
  ORDER BY createdAt DESC
  LIMIT ${limit + 1};
`;

const mapToSearchIndexItem = (row: any): ISearchIndexItem => ({
  messageId: row.messageId,
  content: row.content,
  senderId: row.senderId,
  receiverId: row.receiverId,
  conversationId: row.conversationId,
  createdAt: parseTimestamp(row.createdAt),
  highlight: row.highlight,
  rowid: row.rowid,
});

const buildUserFilterClause = (query: ISearchQuery): string => {
  let clause = "";
  if (query.userId) {
    clause += ` AND f.senderId = '${sanitizeString(query.userId)}'`;
  }
  return clause;
};

const buildDateFilterClause = (query: ISearchQuery): string => {
  let clause = "";
  if (query.startDate && query.endDate) {
    const startTimestamp = new Date(query.startDate).getTime();
    const endTimestamp =
      new Date(query.endDate).getTime() + (24 * 60 * 60 * 1000 - 1);
    clause += ` AND CAST(f.createdAt AS INTEGER) >= ${startTimestamp} AND CAST(f.createdAt AS INTEGER) <= ${endTimestamp}`;
  } else if (query.startDate) {
    const startTimestamp = new Date(query.startDate).getTime();
    clause += ` AND CAST(f.createdAt AS INTEGER) >= ${startTimestamp}`;
  } else if (query.endDate) {
    const endTimestamp =
      new Date(query.endDate).getTime() + (24 * 60 * 60 * 1000 - 1);
    clause += ` AND CAST(f.createdAt AS INTEGER) <= ${endTimestamp}`;
  }
  return clause;
};

const buildInitPrefixQuery = (string: string): string => {
  return `
         SELECT f.*, f.rowid
         FROM fts_index_global f
         WHERE fts_index_global MATCH '${string}'
  `;
};

const buildPrefixPhraseSearch = (query: string) => {
  const tokens = query.trim().split(/\s+/);
  if (tokens.length === 1) {
    return `${tokens[0]}*`;
  } else {
    return `"${query}"*`;
  }
};

const buildExactPhraseSearch = (query: string) => {
  return `"${query}"`;
};

const buildCursorClause = (cursor?: { rowid: number }): string => {
  if (cursor && cursor.rowid !== undefined) {
    return `
      AND rowid < ${cursor.rowid}
    `;
  }
  return "";
};

const buildOrderByClause = (type: ESearchType): string => {
  switch (type) {
    case ESearchType.FULL_TEXT:
      return ` ORDER BY rowid DESC`;
    case ESearchType.EXACT_PHRASE:
      return ` ORDER BY rowid DESC`;
    default:
      return ` ORDER BY rowid DESC`;
  }
};

const buildLimitClause = (limit: number): string => {
  return `
     LIMIT ${limit}
  `;
};

//////////////////////

export function createSearchRepoSQLite(db: SQLiteWorkerDB): ISearchRepository {
  ///////////////////

  const performFullTextSearchCache = async (
    query: ISearchQuery
  ): Promise<{
    items: ISearchIndexItem[];
    hasMore: boolean;
    nextCursor?: TCursor;
  }> => {
    const keyword = sanitizeString(query.query);
    if (!keyword) return { items: [], hasMore: false };

    const limit = query.limit || 100;
    await ensureCacheTable(db);

    // 🧹 Nếu keyword đổi → xoá cache cũ
    if (currentKeyword && currentKeyword !== keyword) {
      await db.exec(buildDeleteCacheSQL(keyword));
    }
    currentKeyword = keyword;

    if (query.cursor?.rowid) {
      const cacheSQL = buildSelectCacheSQL(keyword, query.cursor.rowid, limit);
      console.time("CacheSearchExecutionTime");
      const cachedRows = (await db.select(cacheSQL)) as any[];
      console.timeEnd("CacheSearchExecutionTime");
      if (cachedRows.length > 0) {
        const hasMore = cachedRows.length > limit;
        const items = hasMore ? cachedRows.slice(0, limit) : cachedRows;
        const nextCursor = hasMore
          ? { rowid: items[items.length - 1].id }
          : undefined;
        return { items, hasMore, nextCursor };
      }
    }

    // 🔍 Không có cache hoặc lần đầu → chạy truy vấn thật
    let sql = buildInitPrefixQuery(buildPrefixPhraseSearch(keyword));
    sql += buildUserFilterClause(query);
    sql += buildDateFilterClause(query);
    if (query.cursor?.rowid) sql += buildCursorClause(query.cursor);
    sql += buildOrderByClause(query.type || ESearchType.FULL_TEXT);
    sql += buildLimitClause(limit + 1);

    const rawResults = (await db.select(sql)) as any[];

    const mapped = mapSQLiteRows(rawResults, mapToSearchIndexItem);
    const hasMore = mapped.length > limit;
    const items = hasMore ? mapped.slice(0, limit) : mapped;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore ? { rowid: lastItem.rowid } : (undefined as any);

    (async () => {
      for (const row of items) {
        await db.exec(buildInsertCacheSQL(row, keyword));
      }
      await db.exec(buildTrimCacheSQL(keyword));
    })();

    return { items, hasMore, nextCursor };
  };

  const performFullTextSearch = async (
    query: ISearchQuery
  ): Promise<{
    items: ISearchIndexItem[];
    hasMore: boolean;
    nextCursor?: TCursor;
  }> => {
    const sanitize = sanitizeString(query.query);

    if (!sanitize) {
      return { items: [], hasMore: false };
    }

    const limit = query.limit || 100;

    let sql = buildInitPrefixQuery(buildPrefixPhraseSearch(sanitize));
    sql += buildUserFilterClause(query);
    sql += buildDateFilterClause(query);
    if (query.cursor && query.cursor.rowid) {
      sql += buildCursorClause(query.cursor);
    }
    sql += buildOrderByClause(query.type || ESearchType.FULL_TEXT);
    sql += buildLimitClause(limit + 1);
    const rawResults = await db.select(sql);
    const mappedResults = mapSQLiteRows(
      rawResults as any[],
      mapToSearchIndexItem
    );
    const hasMore = mappedResults.length > limit;
    const items = hasMore ? mappedResults.slice(0, limit) : mappedResults;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore
      ? { rowid: lastItem.rowid as number }
      : undefined;
    console.log("Final SQL for full-text search:", sql);
    return { items, hasMore, nextCursor };
  };

  const performExactPhraseSearch = async (
    query: ISearchQuery
  ): Promise<{
    items: ISearchIndexItem[];
    hasMore: boolean;
    nextCursor?: TCursor;
  }> => {
    const sanitize = sanitizeString(query.query);

    if (!sanitize) {
      return { items: [], hasMore: false };
    }

    const limit = query.limit || 100;

    let sql = buildInitPrefixQuery(buildExactPhraseSearch(sanitize));
    sql += buildUserFilterClause(query);
    sql += buildDateFilterClause(query);
    if (query.cursor && query.cursor.rowid) {
      sql += buildCursorClause(query.cursor);
    }
    sql += buildOrderByClause(query.type || ESearchType.FULL_TEXT);
    sql += buildLimitClause(limit + 1);

    const rawResults = await db.select(sql);

    const mappedResults = mapSQLiteRows(
      rawResults as any[],
      mapToSearchIndexItem
    );

    const hasMore = mappedResults.length > limit;
    const items = hasMore ? mappedResults.slice(0, limit) : mappedResults;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore
      ? { rowid: lastItem.rowid as number }
      : undefined;
    console.log("Final SQL for full-text search:", sql);

    return { items, hasMore, nextCursor };
  };

  return {
    async init(): Promise<void> {
      await db.init();
    },

    async getIndexedMessageCount(): Promise<number> {
      try {
        const result = (await db.select(
          `SELECT COUNT(*) as count FROM fts_index_global`
        )) as any[];
        return result && result.length > 0 ? result[0].count : 0;
      } catch (error) {
        console.warn(
          "Failed to get indexed message count, table might not exist:",
          error
        );
        return 0;
      }
    },

    async search(query: ISearchQuery): Promise<ISearchIndexResult> {
      const startTime = Date.now();

      try {
        validateRequiredFields(query, ["query", "type", "currentUserId"]);
        let searchResult: {
          items: ISearchIndexItem[];
          hasMore: boolean;
          nextCursor?: {
            rowid: number;
          };
        };

        switch (query.type) {
          case ESearchType.FULL_TEXT:
            searchResult = await performFullTextSearch(query);
            break;
          case ESearchType.EXACT_PHRASE:
            searchResult = await performExactPhraseSearch(query);
            break;
          default:
            searchResult = await performFullTextSearch(query);
        }

        const executionTime = Date.now() - startTime;

        let finalNextCursor = searchResult.nextCursor;
        if (finalNextCursor) {
          finalNextCursor = {
            ...finalNextCursor,
          };
        }

        return createSearchIndexResult(
          searchResult.items,
          query.query,
          query.type,
          searchResult.hasMore,
          executionTime,
          finalNextCursor as any // ✅ Cast để bypass type checking tạm thời
        );
      } catch (error) {
        console.error("Search error:", error);
        return createSearchIndexResult(
          [],
          query.query,
          query.type,
          false,
          Date.now() - startTime
        );
      }
    },

    async searchExactPhrase(query: ISearchQuery): Promise<ISearchIndexResult> {
      const startTime = Date.now();

      try {
        validateRequiredFields(query, ["query", "currentUserId"]);

        const results = await performExactPhraseSearch(query);
        const executionTime = Date.now() - startTime;

        return createSearchIndexResult(
          results.items,
          query.query,
          ESearchType.EXACT_PHRASE,
          results.hasMore,
          executionTime,
          results.nextCursor
        );
      } catch (error) {
        console.error("Exact phrase search error:", error);
        return createSearchIndexResult(
          [],
          query.query,
          ESearchType.EXACT_PHRASE,
          false,
          Date.now() - startTime
        );
      }
    },

    async indexMessage(messageData: IMessageIndexData): Promise<void> {
      try {
        validateRequiredFields(messageData, [
          "messageId",
          "content",
          "senderId",
          "conversationId",
          "createdAt",
          "receiverId",
        ]);

        // Index the message in FTS table
        const insertMessageSQL = `
          INSERT INTO fts_index_global(messageId, content, senderId, conversationId, createdAt, receiverId) 
          VALUES ('${messageData.messageId}', '${sanitizeString(messageData.content)}', '${sanitizeString(messageData.senderId)}', '${messageData.conversationId}', '${messageData.createdAt.toString()}', '${messageData.receiverId}')
        `;

        await db.exec(insertMessageSQL);

        // Update conversation metadata for ranking
        await this.updateConversationMetadata(
          messageData.conversationId,
          messageData.createdAt
        );
      } catch (error) {
        console.error("Failed to index message:", error);
        // Re-initialize the database if table doesn't exist
        if (error instanceof Error && error.message.includes("no such table")) {
          console.log("Table missing, reinitializing database...");
          await db.init();
          // Retry the operation once
          try {
            const insertMessageSQL = `
              INSERT INTO fts_index_global(messageId, content, senderId, conversationId, createdAt, receiverId) 
              VALUES ('${messageData.messageId}', '${sanitizeString(messageData.content)}', '${sanitizeString(messageData.senderId)}', '${messageData.conversationId}', '${messageData.createdAt.toString()}', '${messageData.receiverId}')
            `;
            await db.exec(insertMessageSQL);
            await this.updateConversationMetadata(
              messageData.conversationId,
              messageData.createdAt
            );
          } catch (retryError) {
            console.error("Failed to index message after retry:", retryError);
            throw retryError;
          }
        } else {
          throw error;
        }
      }
    },

    async bulkIndexMessages(messages: IMessageIndexData[]): Promise<void> {
      const BATCH_SIZE = 10000;
      const conversationUpdates = new Map<string, number>();

      console.log(
        `Bulk inserting ${messages.length} messages in batches of ${BATCH_SIZE}...`
      );

      // Group updates for conversation metadata
      for (const msg of messages) {
        const current = conversationUpdates.get(msg.conversationId) || 0;
        if (msg.createdAt > current) {
          conversationUpdates.set(msg.conversationId, msg.createdAt);
        }
      }

      // Process inserts in batches
      for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = messages.slice(i, i + BATCH_SIZE);

        const insertStatements = batch.map(
          (message) => `
      INSERT INTO fts_index_global (messageId, content, senderId, conversationId, createdAt, receiverId)
      VALUES (
        '${message.messageId}',
        '${sanitizeString(message.content)}',
        '${sanitizeString(message.senderId)}',
        '${message.conversationId}',
        '${message.createdAt.toString()}',
        '${message.receiverId}'
      );
    `
        );

        const batchSQL = `
      BEGIN TRANSACTION;
      ${insertStatements.join("\n")}
      COMMIT;
    `;

        console.log(
          `Inserting batch ${i / BATCH_SIZE + 1} (${batch.length} messages)...`
        );
        await db.exec(batchSQL);
      }

      console.log("All message batches inserted.");

      // Update conversation metadata after all inserts
      console.log("Updating conversation metadata...");
      await Promise.all(
        Array.from(conversationUpdates.entries()).map(
          ([conversationId, latestTimestamp]) =>
            this.updateConversationMetadata(conversationId, latestTimestamp)
        )
      );

      console.log("Bulk index completed.");
    },

    async rebuildIndex(): Promise<void> {
      await db.exec(`DELETE FROM fts_index_global`);
      await db.exec(`DELETE FROM conversation_metadata`);
    },

    async clearIndex(): Promise<void> {
      try {
        await db.exec(`DELETE FROM fts_index_global`);
      } catch (error) {
        console.warn("Failed to clear fts_index_global table:", error);
      }
      try {
        await db.exec(`DELETE FROM conversation_metadata`);
      } catch (error) {
        console.warn("Failed to clear conversation_metadata table:", error);
      }
    },

    async isMessageIndexed(messageId: TID): Promise<boolean> {
      try {
        const result = (await db.select(`
          SELECT COUNT(*) as count FROM fts_index_global WHERE messageId = '${messageId}'
        `)) as any[];
        return result && result.length > 0 && result[0].count > 0;
      } catch (error) {
        console.warn(
          "Failed to check if message is indexed, table might not exist:",
          error
        );
        return false;
      }
    },

    async getIndexedMessageIds(): Promise<TID[]> {
      try {
        const result = (await db.select(
          `SELECT messageId FROM fts_index_global`
        )) as any[];
        return result ? result.map((row: any) => row.messageId) : [];
      } catch (error) {
        console.warn(
          "Failed to get indexed message IDs, table might not exist:",
          error
        );
        return [];
      }
    },

    async getIndexedUserIds(): Promise<TID[]> {
      const sql = `SELECT DISTINCT senderId FROM fts_index_global WHERE senderId IS NOT NULL AND senderId != ''`;
      const rawResults = await db.select(sql);
      return mapSQLiteRows(rawResults as any[], (row: any) => row.senderId);
    },

    async getUserMessageCount(userId: TID): Promise<number> {
      const sql = `SELECT COUNT(*) as count FROM fts_index_global WHERE senderId = '${sanitizeString(userId)}'`;
      const result = await db.select(sql);
      if (Array.isArray(result) && result.length > 0) {
        return result[0].count || 0;
      }
      return 0;
    },

    async optimizeIndex(): Promise<void> {
      await db.exec(
        `INSERT INTO fts_index_global(fts_index_global) VALUES('optimize')`
      );
    },

    async validateIndex(): Promise<boolean> {
      try {
        await db.select(`SELECT COUNT(*) FROM fts_index_global LIMIT 1`);
        return true;
      } catch (error) {
        return false;
      }
    },

    async updateConversationMetadata(
      conversationId: TID,
      messageTimestamp: number
    ): Promise<void> {
      // Update or insert conversation metadata for ranking
      const updateSQL = `
        INSERT INTO conversation_metadata (conversationId, lastMessagesUpdateAt, messageCount, createdAt, updatedAt)
        VALUES ('${sanitizeString(conversationId)}', ${messageTimestamp}, 1, ${messageTimestamp}, ${messageTimestamp})
        ON CONFLICT(conversationId) DO UPDATE SET
          lastMessagesUpdateAt = ${messageTimestamp},
          messageCount = messageCount + 1,
          updatedAt = ${messageTimestamp}
      `;

      await db.exec(updateSQL);
    },

    async getConversationMetadata(
      conversationId: TID
    ): Promise<{ lastMessagesUpdateAt: number; messageCount: number } | null> {
      const sql = `
        SELECT lastMessagesUpdateAt, messageCount 
        FROM conversation_metadata 
        WHERE conversationId = '${sanitizeString(conversationId)}'
      `;

      const result = (await db.select(sql)) as any[];
      if (result && result.length > 0) {
        return {
          lastMessagesUpdateAt: parseInt(result[0].lastMessagesUpdateAt),
          messageCount: result[0].messageCount || 0,
        };
      }
      return null;
    },

    async cleanupConversationMetadata(): Promise<void> {
      // Remove metadata for conversations that no longer have messages
      const cleanupSQL = `
        DELETE FROM conversation_metadata 
        WHERE conversationId NOT IN (
          SELECT DISTINCT conversationId FROM fts_index_global
        )
      `;
      await db.exec(cleanupSQL);
    },
  };
}
