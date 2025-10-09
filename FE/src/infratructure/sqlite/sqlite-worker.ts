import sqlite3InitModule, {
  FlexibleString,
  OpfsDatabase,
  SqlValue,
} from "@sqlite.org/sqlite-wasm";

let db: OpfsDatabase;

const createFtsTableSQL = (db: OpfsDatabase) => {
  try {
    // Check if FTS table already exists using a more reliable method
    let tableExists = false;
    try {
      const result: any[] = [];
      db.exec({
        sql: `SELECT name FROM sqlite_master WHERE type='table' AND name='fts_index_global'`,
        rowMode: "object",
        callback: (row: any) => {
          result.push(row);
        },
      });
      tableExists = result.length > 0;
    } catch (checkError) {
      console.warn("Error checking table existence:", checkError);
      tableExists = false;
    }

    if (!tableExists) {
      db.exec(`
        CREATE VIRTUAL TABLE fts_index_global USING fts5(
          messageId UNINDEXED,
          conversationId UNINDEXED,
          senderId UNINDEXED,
          receiverId UNINDEXED,
          content,
          createdAt UNINDEXED,
          tokenize = 'unicode61 remove_diacritics 2',
          prefix = 1,
          prefix = 2,
          prefix = 3
        );
      `);
      console.log("Created new FTS table");
    } else {
      console.log("FTS table already exists, preserving data");
    }
  } catch (error) {
    console.error("Failed to create fts_index_global table:", error);
    throw error;
  }
};

const createConversationMetadataTableSQL = (db: OpfsDatabase) => {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_metadata (
        conversationId TEXT PRIMARY KEY,
        lastMessagesUpdateAt INTEGER NOT NULL,
        messageCount INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
    `);

    db.exec(`
     CREATE INDEX IF NOT EXISTS idx_conversation_metadata_conversationId
     ON conversation_metadata(conversationId);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversation_metadata_last_update 
      ON conversation_metadata(lastMessagesUpdateAt);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversation_metadata_updated_at 
      ON conversation_metadata(updatedAt);
    `);
  } catch (error) {
    console.error("Failed to create conversation_metadata table:", error);
    throw error;
  }
};

const validateFtsTable = (db: OpfsDatabase): boolean => {
  try {
    // Try to query the FTS table to ensure it actually works
    const results: any[] = [];
    db.exec({
      sql: `SELECT COUNT(*) as count FROM fts_index_global LIMIT 1`,
      rowMode: "object",
      callback: (row: any) => {
        results.push(row);
      },
    });
    console.log("FTS table validation successful");
    return true;
  } catch (error) {
    console.warn("FTS table validation failed:", error);
    return false;
  }
};

const ensureTablesExist = (db: OpfsDatabase) => {
  try {
    // Check if tables exist using a more reliable method
    const existingTables: string[] = [];
    db.exec({
      sql: `SELECT name FROM sqlite_master WHERE type='table' AND (name='fts_index_global' OR name='conversation_metadata')`,
      rowMode: "object",
      callback: (row: any) => {
        existingTables.push(row.name);
      },
    });

    if (existingTables.length > 0) {
      console.log("Existing tables found:", existingTables.join(", "));
    } else {
      console.log("No existing tables found, will create new ones");
    }
  } catch (error) {
    console.warn("Error checking existing tables:", error);
  }
};

const initDb = async () => {
  const sqlite3 = await sqlite3InitModule({
    locateFile: (file) => {
      if (file.endsWith(".wasm")) {
        return new URL("./sqlite3.wasm", import.meta.url).href;
      }
      return file;
    },
  });
  db = new sqlite3.oo1.OpfsDb("/mydb.sqlite3");
  ensureTablesExist(db);
  createFtsTableSQL(db);
  createConversationMetadataTableSQL(db);

  // Validate that the FTS table actually works
  if (!validateFtsTable(db)) {
    console.log("FTS table validation failed, attempting to recreate...");
    try {
      // Drop and recreate the FTS table
      db.exec(`DROP TABLE IF EXISTS fts_index_global`);
      db.exec(`
        CREATE VIRTUAL TABLE fts_index_global USING fts5(
          messageId UNINDEXED,
          conversationId UNINDEXED,
          senderId UNINDEXED,
          receiverId UNINDEXED,
          content,
          createdAt UNINDEXED,
          tokenize = 'unicode61 remove_diacritics 2',
          prefix = 1,
          prefix = 2,
          prefix = 3
        );
      `);
      console.log("FTS table recreated successfully");

      // Validate again
      if (!validateFtsTable(db)) {
        throw new Error("FTS table still not working after recreation");
      }
    } catch (recreateError) {
      console.error("Failed to recreate FTS table:", recreateError);
      throw recreateError;
    }
  }
};

const postMessageHandler = async (
  event: MessageEvent<{
    type: string;
    sql: FlexibleString;
    id: string;
  }>
) => {
  const { type, sql, id } = event.data;
  if (type === "init") {
    try {
      await initDb();
      self.postMessage({ type: "init-complete", id });
    } catch (error) {
      self.postMessage({
        type: "error",
        error: error instanceof Error ? error.message : String(error),
        id,
      });
    }
    return;
  }
  if (type === "exec") {
    try {
      const result = db.exec(sql);
      self.postMessage({ type: "result", result, id });
    } catch (error) {
      self.postMessage({
        type: "error",
        error: error instanceof Error ? error.message : String(error),
        id,
      });
    }
    return;
  }
  if (type === "select") {
    try {
      const results: SqlValue[] = [];
      db.exec({
        sql,
        rowMode: "object",
        callback: (row: SqlValue) => {
          results.push(row);
        },
      });
      self.postMessage({ type: "result", result: results, id });
    } catch (error) {
      self.postMessage({
        type: "error",
        error: error instanceof Error ? error.message : String(error),
        id,
      });
    }
    return;
  }
  if (type === "reset") {
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry("mydb.sqlite3");
      // Reinitialize the database after reset to ensure tables exist
      await initDb();
      self.postMessage({ type: "reset-complete", id });
    } catch (error) {
      self.postMessage({
        type: "error",
        error: error instanceof Error ? error.message : String(error),
        id,
      });
    }
    return;
  }
};

self.onmessage = postMessageHandler;
