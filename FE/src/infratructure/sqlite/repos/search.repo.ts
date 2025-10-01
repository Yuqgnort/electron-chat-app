import {
  ISearchQuery,
  ISearchResult,
  ISearchResultItem,
  IAutocompleteSuggestion,
  IIndexStats,
  IMessageIndexData,
  ESearchType,
  ESearchScope,
  EUserFilter,
  createSearchResult,
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
  const mapToSearchResultItem = (row: any): ISearchResultItem => ({
    id: row.id,
    content: row.content,
    senderName: row.sender_name,
    senderId: row.sender_id, // Sử dụng sender_id thực tế từ database
    conversationId: row.conversation_id,
    createdAt: parseTimestamp(row.created_at),
    rank: row.rank,
  });

  const buildUserFilterClause = (query: ISearchQuery): string => {
    let clause = "";
    if (query.excludeCurrentUserId) {
      clause += ` AND sender_id != '${sanitizeString(query.excludeCurrentUserId)}'`;
    } else if (query.excludeCurrentUserName) {
      clause += ` AND sender_name != '${sanitizeString(query.excludeCurrentUserName)}'`;
    }

    if (!query.userFilter || query.userFilter === EUserFilter.ALL_USERS) {
      return clause;
    }

    if (query.userFilter === EUserFilter.SPECIFIC_USER) {
      if (query.userId) {
        clause += ` AND sender_id = '${sanitizeString(query.userId)}'`;
      } else if (query.senderName) {
        clause += ` AND sender_name = '${sanitizeString(query.senderName)}'`;
      }
    }

    if (query.userFilter === EUserFilter.EXCLUDE_USER) {
      if (query.userId) {
        clause += ` AND sender_id != '${sanitizeString(query.userId)}'`;
      } else if (query.senderName) {
        clause += ` AND sender_name != '${sanitizeString(query.senderName)}'`;
      }
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
    query: ISearchQuery
  ): Promise<ISearchResultItem[]> => {
    console.log(
      "Performing full-text search with query:",
      buildPhraseSearch(sanitizeString(query.query))
    );
    let sql = `
      SELECT id, content, sender_name, sender_id, conversation_id, created_at, rank
      FROM messages_fts 
      WHERE messages_fts MATCH '${buildPhraseSearch(
        sanitizeString(query.query)
      )}'
    `;

    if (
      query.scope === ESearchScope.CURRENT_CONVERSATION &&
      query.conversationId
    ) {
      sql += ` AND conversation_id = '${sanitizeString(query.conversationId)}'`;
    }

    sql += buildUserFilterClause(query);
    sql += ` ORDER BY created_at DESC LIMIT ${query.limit || 50}`;

    console.log("Final SQL for full-text search:", sql);

    const rawResults = await db.select(sql);

    return mapSQLiteRows(rawResults as any[], mapToSearchResultItem);
  };

  const performExactPhraseSearch = async (
    query: ISearchQuery
  ): Promise<ISearchResultItem[]> => {
    let sql = `
      SELECT id, content, sender_name, sender_id, conversation_id, created_at, rank
      FROM messages_fts 
      WHERE messages_fts MATCH '"${sanitizeString(query.query)}"'
    `;

    if (
      query.scope === ESearchScope.CURRENT_CONVERSATION &&
      query.conversationId
    ) {
      sql += ` AND conversation_id = '${sanitizeString(query.conversationId)}'`;
    }

    sql += buildUserFilterClause(query);
    sql += ` ORDER BY created_at DESC LIMIT ${query.limit || 50}`;

    const rawResults = await db.select(sql);
    return mapSQLiteRows(rawResults as any[], mapToSearchResultItem);
  };

  return {
    async init(): Promise<void> {
      await db.init();
    },

    async search(query: ISearchQuery): Promise<ISearchResult> {
      const startTime = Date.now();

      try {
        validateRequiredFields(query, ["query", "type"]);

        let results: ISearchResultItem[] = [];

        switch (query.type) {
          case ESearchType.FULL_TEXT:
            results = await performFullTextSearch(query);
            break;
          case ESearchType.EXACT_PHRASE:
            results = await performExactPhraseSearch(query);
            break;
          case ESearchType.AUTOCOMPLETE:
            return createSearchResult(
              [],
              query.query,
              query.type,
              Date.now() - startTime
            );
          default:
            results = await performFullTextSearch(query);
        }

        const executionTime = Date.now() - startTime;
        return createSearchResult(
          results,
          query.query,
          query.type,
          executionTime
        );
      } catch (error) {
        console.error("Search error:", error);
        return createSearchResult(
          [],
          query.query,
          query.type,
          Date.now() - startTime
        );
      }
    },

    async searchExactPhrase(
      phrase: string,
      conversationId?: TID
    ): Promise<ISearchResultItem[]> {
      const cleanPhrase = sanitizeString(phrase);
      let sql = `
        SELECT id, content, sender_name, sender_id, conversation_id, created_at, rank
        FROM messages_fts 
        WHERE messages_fts MATCH '"${cleanPhrase}"'
      `;

      if (conversationId) {
        sql += ` AND conversation_id = '${sanitizeString(conversationId)}'`;
      }

      sql += ` ORDER BY created_at DESC LIMIT 50`;

      const rawResults = await db.select(sql);
      return mapSQLiteRows(rawResults as any[], mapToSearchResultItem);
    },

    async getAutocompleteSuggestions(
      query: string,
      limit?: number
    ): Promise<IAutocompleteSuggestion[]> {
      const cleanQuery = sanitizeString(query);
      const sql = `
        SELECT DISTINCT 
          SUBSTR(content, 1, INSTR(content || ' ', ' ')) as suggestion,
          COUNT(*) as frequency
        FROM messages_fts 
        WHERE messages_fts MATCH '"${cleanQuery}"*'
        GROUP BY suggestion
        ORDER BY frequency DESC
        LIMIT ${limit || 10}
      `;

      const rawResults = await db.select(sql);
      return mapSQLiteRows(rawResults as any[], (row: any) => ({
        suggestion: row.suggestion,
        frequency: row.frequency,
      }));
    },

    async searchByUser(
      query: string,
      userId: TID,
      conversationId?: TID
    ): Promise<ISearchResultItem[]> {
      const searchQuery: ISearchQuery = {
        query,
        type: ESearchType.FULL_TEXT,
        scope: conversationId
          ? ESearchScope.CURRENT_CONVERSATION
          : ESearchScope.ALL_CONVERSATIONS,
        conversationId,
        userFilter: EUserFilter.SPECIFIC_USER,
        senderName: userId, // Use as senderName since we don't have senderId
      };

      const result = await this.search(searchQuery);
      return result.items;
    },

    async searchExcludingUser(
      query: string,
      userId: TID,
      conversationId?: TID
    ): Promise<ISearchResultItem[]> {
      const searchQuery: ISearchQuery = {
        query,
        type: ESearchType.FULL_TEXT,
        scope: conversationId
          ? ESearchScope.CURRENT_CONVERSATION
          : ESearchScope.ALL_CONVERSATIONS,
        conversationId,
        userFilter: EUserFilter.EXCLUDE_USER,
        senderName: userId, // Use as senderName since we don't have senderId
      };

      const result = await this.search(searchQuery);
      return result.items;
    },

    async getUserMessages(
      userId: TID,
      conversationId?: TID,
      limit?: number
    ): Promise<ISearchResultItem[]> {
      let sql = `
        SELECT id, content, sender_name, sender_id, conversation_id, created_at
        FROM messages_fts 
        WHERE sender_name = '${sanitizeString(userId)}'
      `;

      if (conversationId) {
        sql += ` AND conversation_id = '${sanitizeString(conversationId)}'`;
      }

      sql += ` ORDER BY created_at DESC LIMIT ${limit || 50}`;

      const rawResults = await db.select(sql);
      return mapSQLiteRows(rawResults as any[], mapToSearchResultItem);
    },

    async indexMessage(messageData: IMessageIndexData): Promise<void> {
      validateRequiredFields(messageData, [
        "messageId",
        "content",
        "senderName",
        "conversationId",
        "createdAt",
      ]);

      const sql = `
        INSERT INTO messages_fts(id, content, sender_name, sender_id, conversation_id, created_at) 
        VALUES ('${messageData.messageId}', '${sanitizeString(messageData.content)}', '${sanitizeString(messageData.senderName)}', '${sanitizeString(messageData.senderId)}', '${messageData.conversationId}', '${messageData.createdAt.toString()}')
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

    async getIndexStats(): Promise<IIndexStats> {
      const result = (await db.select(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT conversation_id) as total_conversations,
          COUNT(DISTINCT sender_name) as total_senders
        FROM messages_fts
      `)) as any[];

      const stats =
        result && result.length > 0
          ? result[0]
          : {
              total_messages: 0,
              total_conversations: 0,
              total_senders: 0,
            };

      return {
        totalMessages: stats.total_messages || 0,
        totalConversations: stats.total_conversations || 0,
        totalSenders: stats.total_senders || 0,
        lastIndexedAt: Date.now(),
      };
    },

    async getIndexedUserIds(): Promise<TID[]> {
      const sql = `SELECT DISTINCT sender_name FROM messages_fts WHERE sender_name IS NOT NULL AND sender_name != ''`;
      const rawResults = await db.select(sql);
      return mapSQLiteRows(rawResults as any[], (row: any) => row.sender_name);
    },

    async getUserMessageCount(userId: TID): Promise<number> {
      const sql = `SELECT COUNT(*) as count FROM messages_fts WHERE sender_name = '${sanitizeString(userId)}'`;
      const result = await db.select(sql);
      if (Array.isArray(result) && result.length > 0) {
        return result[0].count || 0;
      }
      return 0;
    },

    async getActiveUsers(
      conversationId?: TID
    ): Promise<
      Array<{ userId: TID; senderName: string; messageCount: number }>
    > {
      let sql = `
        SELECT 
          sender_name as userId,
          sender_name as senderName,
          COUNT(*) as messageCount
        FROM messages_fts 
      `;

      if (conversationId) {
        sql += ` WHERE conversation_id = '${sanitizeString(conversationId)}'`;
      }

      sql += ` GROUP BY sender_name ORDER BY messageCount DESC`;

      const rawResults = await db.select(sql);
      return mapSQLiteRows(rawResults as any[], (row: any) => ({
        userId: row.userId,
        senderName: row.senderName,
        messageCount: row.messageCount,
      }));
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

    // Migration helper để thêm sender_id cho existing messages
    async migrateSenderIds(userRepo: any): Promise<void> {
      try {
        // Lấy tất cả messages không có sender_id
        const messagesWithoutSenderId = (await db.select(`
          SELECT id, sender_name 
          FROM messages_fts 
          WHERE sender_id IS NULL OR sender_id = ''
        `)) as any[];

        console.log(
          `Found ${messagesWithoutSenderId.length} messages to migrate`
        );

        // Lấy mapping của tất cả users
        const users = await userRepo.getAll();
        const userNameToIdMap = new Map();
        users?.forEach((user: any) => {
          userNameToIdMap.set(user.displayName, user.id);
          userNameToIdMap.set(user.name, user.id);
          userNameToIdMap.set(user.userName, user.id);
        });

        let updatedCount = 0;
        for (const msg of messagesWithoutSenderId) {
          const senderId = userNameToIdMap.get(msg.sender_name);
          if (senderId) {
            await db.exec(`
              UPDATE messages_fts 
              SET sender_id = '${sanitizeString(senderId)}'
              WHERE id = '${msg.id}'
            `);
            updatedCount++;
          } else {
            console.warn(
              `Could not find user ID for sender: ${msg.sender_name}`
            );
          }
        }

        console.log(
          `Successfully migrated ${updatedCount} messages with sender_id`
        );
      } catch (error) {
        console.error("Migration failed:", error);
        throw error;
      }
    },

    async executeQuery(sql: string): Promise<any> {
      return await db.exec(sql);
    },

    async selectQuery(sql: string): Promise<any[]> {
      const result = await db.select(sql);
      return Array.isArray(result) ? result : [];
    },
  };
}
