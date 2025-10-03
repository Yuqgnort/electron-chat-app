import sqlite3InitModule, {
  FlexibleString,
  OpfsDatabase,
  SqlValue,
} from "@sqlite.org/sqlite-wasm";

let db: OpfsDatabase;

const createFtsTableSQL = (db: OpfsDatabase) => {
  try {
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
  } catch (error) {
    console.error("Failed to create fts_index_global table:", error);
    throw error;
  }
};

const checkTableExists = (db: OpfsDatabase) => {
  try {
    db.exec("DROP TABLE IF EXISTS fts_index_global");
  } catch (error) {
    console.warn("Could not drop existing tables:", error);
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
  checkTableExists(db);
  createFtsTableSQL(db);
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
