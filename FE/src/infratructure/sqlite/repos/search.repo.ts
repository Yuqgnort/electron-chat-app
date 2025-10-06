import {
  ISearchQuery,
  ISearchIndexResult,
  ISearchIndexItem,
  IMessageIndexData,
  ESearchType,
  createSearchIndexResult,
  TRankingColection,
} from "@/core/domain/search/entity";
import { ISearchRepository } from "@/core/domain/search/repo";
import { TID } from "@/core/domain/type";
import { SQLiteWorkerDB } from "../init";
import {
  sanitizeString,
  mapSQLiteRows,
  parseTimestamp,
  validateRequiredFields,
} from "../helper";
import {
  buildRankingSelectSQL,
  buildConversationMetadataJoinSQL,
  buildRankingOrderBySQL,
  ensureRankingConfiguration,
  validateRankingConfiguration,
} from "../ranking-helper";

export function createSearchRepoSQLite(db: SQLiteWorkerDB): ISearchRepository {
  const mapToSearchIndexItem = (row: any): ISearchIndexItem => ({
    messageId: row.messageId,
    content: row.content,
    senderId: row.senderId,
    receiverId: row.receiverId,
    conversationId: row.conversationId,
    createdAt: parseTimestamp(row.createdAt),
    rank: row.rank,
    highlight: row.highlight,
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

    // Filter by date range
    if (query.startDate && query.endDate) {
      // Convert dates to timestamps for comparison
      const startTimestamp = new Date(query.startDate).getTime();
      const endTimestamp =
        new Date(query.endDate).getTime() + (24 * 60 * 60 * 1000 - 1); // End of day

      // Cast createdAt to numeric for comparison since it might be stored as string
      clause += ` AND CAST(f.createdAt AS INTEGER) >= ${startTimestamp} AND CAST(f.createdAt AS INTEGER) <= ${endTimestamp}`;
    } else if (query.startDate) {
      const startTimestamp = new Date(query.startDate).getTime();
      clause += ` AND CAST(f.createdAt AS INTEGER) >= ${startTimestamp}`;
    } else if (query.endDate) {
      const endTimestamp =
        new Date(query.endDate).getTime() + (24 * 60 * 60 * 1000 - 1); // End of day
      clause += ` AND CAST(f.createdAt AS INTEGER) <= ${endTimestamp}`;
    }

    return clause;
  };

  function buildPhraseSearch(query: string) {
    const tokens = query.trim().split(/\s+/);
    if (tokens.length === 1) {
      return `${tokens[0]}*`;
    } else {
      return `"${query}"*`;
    }
  }

  const performFullTextSearch = async (
    query: ISearchQuery,
    ranking: TRankingColection
  ): Promise<{ items: ISearchIndexItem[]; hasMore: boolean }> => {
    console.log(
      "Performing full-text search with query:",
      buildPhraseSearch(sanitizeString(query.query))
    );

    const limit = query.limit || 50;
    const validatedRanking = ensureRankingConfiguration(ranking);

    if (!validateRankingConfiguration(validatedRanking)) {
      console.warn("Invalid ranking configuration, using default ranking");
    }

    let sql = `
      SELECT ${buildRankingSelectSQL(validatedRanking)}
      FROM fts_index_global f
      ${buildConversationMetadataJoinSQL()}
      WHERE f.fts_index_global MATCH '${buildPhraseSearch(
        sanitizeString(query.query)
      )}'
    `;

    if (query.conversationId) {
      sql += ` AND f.conversationId = '${sanitizeString(query.conversationId)}'`;
    }

    sql += buildUserFilterClause(query);
    sql += buildDateFilterClause(query);
    sql += ` ORDER BY ${buildRankingOrderBySQL(validatedRanking, "f.createdAt DESC")} LIMIT ${limit + 1}`; // Fetch one extra to check hasMore

    if (query.offset && query.offset > 0) {
      sql += ` OFFSET ${query.offset}`;
    }

    console.log("Final SQL for full-text search:", sql);

    const rawResults = await db.select(sql);
    const mappedResults = mapSQLiteRows(
      rawResults as any[],
      mapToSearchIndexItem
    );

    const hasMore = mappedResults.length > limit;
    const items = hasMore ? mappedResults.slice(0, limit) : mappedResults;

    return { items, hasMore };
  };

  const performExactPhraseSearch = async (
    query: ISearchQuery,
    ranking: TRankingColection
  ): Promise<{ items: ISearchIndexItem[]; hasMore: boolean }> => {
    const limit = query.limit || 50;
    const validatedRanking = ensureRankingConfiguration(ranking);

    if (!validateRankingConfiguration(validatedRanking)) {
      console.warn("Invalid ranking configuration, using default ranking");
    }

    let sql = `
      SELECT ${buildRankingSelectSQL(validatedRanking)}
      FROM fts_index_global f
      ${buildConversationMetadataJoinSQL()}
      WHERE f.fts_index_global MATCH '"${sanitizeString(query.query)}"'
    `;

    if (query.conversationId) {
      sql += ` AND f.conversationId = '${sanitizeString(query.conversationId)}'`;
    }

    sql += buildUserFilterClause(query);
    sql += buildDateFilterClause(query);
    sql += ` ORDER BY ${buildRankingOrderBySQL(validatedRanking, "f.createdAt DESC")} LIMIT ${limit + 1}`; // Fetch one extra to check hasMore

    if (query.offset && query.offset > 0) {
      sql += ` OFFSET ${query.offset}`;
    }

    console.log("Final SQL for exact phrase search:", sql);
    const rawResults = await db.select(sql);
    console.log("Raw results:", rawResults);
    const mappedResults = mapSQLiteRows(
      rawResults as any[],
      mapToSearchIndexItem
    );

    const hasMore = mappedResults.length > limit;
    const items = hasMore ? mappedResults.slice(0, limit) : mappedResults;

    return { items, hasMore };
  };

  return {
    async init(): Promise<void> {
      await db.init();
    },

    async search(
      query: ISearchQuery,
      ranking: TRankingColection
    ): Promise<ISearchIndexResult> {
      const startTime = Date.now();

      try {
        validateRequiredFields(query, ["query", "type", "currentUserId"]);

        let searchResult: { items: ISearchIndexItem[]; hasMore: boolean };

        switch (query.type) {
          case ESearchType.FULL_TEXT:
            searchResult = await performFullTextSearch(query, ranking);
            break;
          case ESearchType.EXACT_PHRASE:
            searchResult = await performExactPhraseSearch(query, ranking);
            break;
          default:
            searchResult = await performFullTextSearch(query, ranking);
        }

        const executionTime = Date.now() - startTime;
        return createSearchIndexResult(
          searchResult.items,
          query.query,
          query.type,
          searchResult.hasMore,
          executionTime
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

    async searchExactPhrase(
      query: ISearchQuery,
      ranking: TRankingColection
    ): Promise<ISearchIndexResult> {
      const startTime = Date.now();

      try {
        validateRequiredFields(query, ["query", "currentUserId"]);

        const results = await performExactPhraseSearch(query, ranking);
        const executionTime = Date.now() - startTime;

        return createSearchIndexResult(
          results.items,
          query.query,
          ESearchType.EXACT_PHRASE,
          results.hasMore,
          executionTime
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
    },

    async bulkIndexMessages(messages: IMessageIndexData[]): Promise<void> {
      // Group messages by conversation for efficient metadata updates
      const conversationUpdates = new Map<string, number>();

      for (const message of messages) {
        // Index each message
        const insertMessageSQL = `
          INSERT INTO fts_index_global(messageId, content, senderId, conversationId, createdAt, receiverId) 
          VALUES ('${message.messageId}', '${sanitizeString(message.content)}', '${sanitizeString(message.senderId)}', '${message.conversationId}', '${message.createdAt.toString()}', '${message.receiverId}')
        `;
        await db.exec(insertMessageSQL);

        // Track the latest timestamp for each conversation
        const currentTimestamp =
          conversationUpdates.get(message.conversationId) || 0;
        if (message.createdAt > currentTimestamp) {
          conversationUpdates.set(message.conversationId, message.createdAt);
        }
      }

      // Update conversation metadata for all affected conversations
      for (const [conversationId, latestTimestamp] of conversationUpdates) {
        await this.updateConversationMetadata(conversationId, latestTimestamp);
      }
    },

    async rebuildIndex(): Promise<void> {
      await db.exec(`DELETE FROM fts_index_global`);
      await db.exec(`DELETE FROM conversation_metadata`);
    },

    async clearIndex(): Promise<void> {
      await db.exec(`DELETE FROM fts_index_global`);
      await db.exec(`DELETE FROM conversation_metadata`);
    },

    async isMessageIndexed(messageId: TID): Promise<boolean> {
      const result = (await db.select(`
        SELECT COUNT(*) as count FROM fts_index_global WHERE messageId = '${messageId}'
      `)) as any[];
      return result && result.length > 0 && result[0].count > 0;
    },

    async getIndexedMessageIds(): Promise<TID[]> {
      const result = (await db.select(
        `SELECT messageId FROM fts_index_global`
      )) as any[];
      return result ? result.map((row: any) => row.id) : [];
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
