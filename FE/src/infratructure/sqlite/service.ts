import { SQLiteWorkerDB } from "./init";

export class SQLiteService {
  private db: SQLiteWorkerDB;
  private isInitialized = false;

  constructor() {
    this.db = new SQLiteWorkerDB();
  }

  async init() {
    if (!this.isInitialized) {
      await this.db.init();
      this.isInitialized = true;
      console.log("SQLite FTS Service initialized");
    }
  }

  async indexMessage(
    messageId: string,
    content: string,
    senderName: string,
    conversationId: string,
    createdAt: string
  ) {
    await this.ensureInit();
    return this.db.exec(`
      INSERT INTO messages_fts(id, content, sender_name, conversation_id, created_at) 
      VALUES ('${messageId}', '${content.replace(/'/g, "''")}', '${senderName.replace(/'/g, "''")}', '${conversationId}', '${createdAt}')
    `);
  }

  async searchMessages(query: string, conversationId?: string) {
    await this.ensureInit();
    const cleanQuery = query.replace(/'/g, "''");

    let sql = `
      SELECT id, content, sender_name, conversation_id, created_at, rank
      FROM messages_fts 
      WHERE messages_fts MATCH '${cleanQuery}*'
    `;

    if (conversationId) {
      sql += ` AND conversation_id = '${conversationId}'`;
    }

    sql += ` ORDER BY rank LIMIT 50`;

    return this.db.select(sql);
  }

  async getAutocompleteSuggestions(query: string, limit: number = 10) {
    await this.ensureInit();
    const cleanQuery = query.replace(/'/g, "''");

    const sql = `
      SELECT DISTINCT 
        SUBSTR(content, 1, INSTR(content || ' ', ' ')) as suggestion,
        COUNT(*) as frequency
      FROM messages_fts 
      WHERE messages_fts MATCH '"${cleanQuery}"*'
      GROUP BY suggestion
      ORDER BY frequency DESC
      LIMIT ${limit}
    `;

    return this.db.select(sql);
  }

  async searchExactPhrase(phrase: string, conversationId?: string) {
    await this.ensureInit();
    const cleanPhrase = phrase.replace(/'/g, "''");

    let sql = `
      SELECT id, content, sender_name, conversation_id, created_at, rank
      FROM messages_fts 
      WHERE messages_fts MATCH '"${cleanPhrase}"'
    `;

    if (conversationId) {
      sql += ` AND conversation_id = '${conversationId}'`;
    }

    sql += ` ORDER BY rank LIMIT 50`;

    return this.db.select(sql);
  }

  async updateMessageInIndex(
    messageId: string,
    content: string,
    senderName: string
  ) {
    await this.ensureInit();
    return this.db.exec(`
      UPDATE messages_fts 
      SET content = '${content.replace(/'/g, "''")}', sender_name = '${senderName.replace(/'/g, "''")}'
      WHERE id = '${messageId}'
    `);
  }

  async removeMessageFromIndex(messageId: string) {
    await this.ensureInit();
    return this.db.exec(`DELETE FROM messages_fts WHERE id = '${messageId}'`);
  }

  async exec(sql: string) {
    await this.ensureInit();
    return this.db.exec(sql);
  }

  async select(sql: string) {
    await this.ensureInit();
    return this.db.select(sql);
  }

  private async ensureInit() {
    if (!this.isInitialized) {
      await this.init();
    }
  }
}
