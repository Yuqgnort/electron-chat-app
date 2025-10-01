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

export function createSearchRepoSQLite(db: SQLiteWorkerDB): ISearchRepository {
  const mapToSearchIndexItem = (row: any): ISearchIndexItem => ({
    id: row.id,
    content: row.content,
    senderId: row.sender_id,
    conversationId: row.conversation_id,
    createdAt: parseTimestamp(row.created_at),
    rank: row.rank,
    highlight: row.highlight,
  });

  const buildUserFilterClause = (query: ISearchQuery): string => {
    let clause = "";

    // Filter by current user
    if (query.currentUserId) {
      clause += ` AND sender_id != '${sanitizeString(query.currentUserId)}'`;
    }

    // Filter by specific user
    if (query.userId) {
      clause += ` AND sender_id = '${sanitizeString(query.userId)}'`;
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
  ): Promise<ISearchIndexItem[]> => {
    console.log(
      "Performing full-text search with query:",
      buildPhraseSearch(sanitizeString(query.query))
    );

    let sql = `
      SELECT id, content, sender_id, conversation_id, created_at, 
             1.0 as rank, '' as highlight
      FROM messages_fts 
      WHERE messages_fts MATCH '${buildPhraseSearch(
        sanitizeString(query.query)
      )}'
    `;

    if (query.conversationId) {
      sql += ` AND conversation_id = '${sanitizeString(query.conversationId)}'`;
    }

    sql += buildUserFilterClause(query);
    sql += ` ORDER BY created_at DESC LIMIT ${query.limit || 50}`;

    console.log("Final SQL for full-text search:", sql);

    const rawResults = await db.select(sql);
    return mapSQLiteRows(rawResults as any[], mapToSearchIndexItem);
  };

  const performExactPhraseSearch = async (
    query: ISearchQuery,
    ranking: TRankingColection
  ): Promise<ISearchIndexItem[]> => {
    let sql = `
      SELECT id, content, sender_id, conversation_id, created_at,
             1.0 as rank, '' as highlight
      FROM messages_fts 
      WHERE messages_fts MATCH '"${sanitizeString(query.query)}"'
    `;

    if (query.conversationId) {
      sql += ` AND conversation_id = '${sanitizeString(query.conversationId)}'`;
    }

    sql += buildUserFilterClause(query);
    sql += ` ORDER BY created_at DESC LIMIT ${query.limit || 50}`;

    const rawResults = await db.select(sql);
    return mapSQLiteRows(rawResults as any[], mapToSearchIndexItem);
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

        let results: ISearchIndexItem[] = [];

        switch (query.type) {
          case ESearchType.FULL_TEXT:
            results = await performFullTextSearch(query, ranking);
            break;
          case ESearchType.EXACT_PHRASE:
            results = await performExactPhraseSearch(query, ranking);
            break;
          default:
            results = await performFullTextSearch(query, ranking);
        }

        const executionTime = Date.now() - startTime;
        return createSearchIndexResult(
          results,
          query.query,
          query.type,
          executionTime
        );
      } catch (error) {
        console.error("Search error:", error);
        return createSearchIndexResult(
          [],
          query.query,
          query.type,
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
          results,
          query.query,
          ESearchType.EXACT_PHRASE,
          executionTime
        );
      } catch (error) {
        console.error("Exact phrase search error:", error);
        return createSearchIndexResult(
          [],
          query.query,
          ESearchType.EXACT_PHRASE,
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
      ]);

      const sql = `
        INSERT INTO messages_fts(id, content, sender_id, conversation_id, created_at) 
        VALUES ('${messageData.messageId}', '${sanitizeString(messageData.content)}', '${sanitizeString(messageData.senderId)}', '${messageData.conversationId}', '${messageData.createdAt.toString()}')
      `;

      console.log("Indexing message:", sql);

      await db.exec(sql);
    },

    async updateMessageInIndex(
      messageId: TID,
      content: string,
      senderName: string,
      senderId?: TID
    ): Promise<void> {
      validateRequiredFields({ messageId, content, senderName }, [
        "messageId",
        "content",
        "senderName",
      ]);

      const updateFields = [
        `content = '${sanitizeString(content)}'`,
        `sender_name = '${sanitizeString(senderName)}'`,
      ];

      if (senderId) {
        updateFields.push(`sender_id = '${sanitizeString(senderId)}'`);
      }

      const sql = `
        UPDATE messages_fts 
        SET ${updateFields.join(", ")}
        WHERE id = '${messageId}'
      `;

      await db.exec(sql);
    },

    async removeMessageFromIndex(messageId: TID): Promise<void> {
      validateRequiredFields({ messageId }, ["messageId"]);

      const sql = `DELETE FROM messages_fts WHERE id = '${messageId}'`;
      await db.exec(sql);
    },

    async bulkIndexMessages(messages: IMessageIndexData[]): Promise<void> {
      for (const message of messages) {
        await this.indexMessage(message);
      }
    },

    async rebuildIndex(): Promise<void> {
      await db.exec(`DELETE FROM messages_fts`);
    },

    async clearIndex(): Promise<void> {
      await db.exec(`DELETE FROM messages_fts`);
    },

    async isMessageIndexed(messageId: TID): Promise<boolean> {
      const result = (await db.select(`
        SELECT COUNT(*) as count FROM messages_fts WHERE id = '${messageId}'
      `)) as any[];
      return result && result.length > 0 && result[0].count > 0;
    },

    async getIndexedMessageIds(): Promise<TID[]> {
      const result = (await db.select(`SELECT id FROM messages_fts`)) as any[];
      return result ? result.map((row: any) => row.id) : [];
    },

    async getIndexedUserIds(): Promise<TID[]> {
      const sql = `SELECT DISTINCT sender_id FROM messages_fts WHERE sender_id IS NOT NULL AND sender_id != ''`;
      const rawResults = await db.select(sql);
      return mapSQLiteRows(rawResults as any[], (row: any) => row.sender_id);
    },

    async getUserMessageCount(userId: TID): Promise<number> {
      const sql = `SELECT COUNT(*) as count FROM messages_fts WHERE sender_id = '${sanitizeString(userId)}'`;
      const result = await db.select(sql);
      if (Array.isArray(result) && result.length > 0) {
        return result[0].count || 0;
      }
      return 0;
    },

    async optimizeIndex(): Promise<void> {
      await db.exec(
        `INSERT INTO messages_fts(messages_fts) VALUES('optimize')`
      );
    },

    async validateIndex(): Promise<boolean> {
      try {
        await db.select(`SELECT COUNT(*) FROM messages_fts LIMIT 1`);
        return true;
      } catch (error) {
        return false;
      }
    },
  };
}
