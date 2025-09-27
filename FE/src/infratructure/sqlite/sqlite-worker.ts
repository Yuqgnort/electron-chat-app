import sqlite3InitModule, {
  OpfsDatabase,
  SqlValue,
} from "@sqlite.org/sqlite-wasm";

let db: OpfsDatabase;

const initWorker = async () => {
  const sqlite3 = await sqlite3InitModule({
    locateFile: (file) => {
      if (file.endsWith(".wasm")) {
        return new URL("./sqlite3.wasm", import.meta.url).href;
      }
      return file;
    },
  });

  db = new sqlite3.oo1.OpfsDb("/mydb.sqlite3");

  // Create FTS tables for search functionality with enhanced configuration
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      id UNINDEXED,
      content,
      sender_name,
      conversation_id UNINDEXED,
      created_at UNINDEXED,
      tokenize = 'unicode61 remove_diacritics 1',
      prefix = '1,2,3'
    );
  `);
};

self.onmessage = async (event) => {
  const { type, sql, params, id } = event.data;

  if (type === "init") {
    await initWorker();
    self.postMessage({ type: "init-complete", id });
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
  }

  if (type === "select") {
    try {
      const results: any[] = [];
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
  }
};
