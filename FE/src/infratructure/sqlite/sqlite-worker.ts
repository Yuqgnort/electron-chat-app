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

  // Check if messages_fts table exists and has sender_id column
  let needsRecreate = false;
  let existingData: any[] = [];

  try {
    // Check if sender_id column exists
    let hasSenderId = false;
    db.exec({
      sql: "PRAGMA table_info(messages_fts)",
      rowMode: "object",
      callback: (row: any) => {
        if (row.name === "sender_id") {
          hasSenderId = true;
        }
      },
    });

    if (!hasSenderId) {
      needsRecreate = true;

      // Backup existing data if table exists
      try {
        db.exec({
          sql: "SELECT id, content, sender_name, conversation_id, created_at FROM messages_fts",
          rowMode: "object",
          callback: (row: any) => {
            existingData.push(row);
          },
        });
      } catch (error) {
        console.warn("Could not backup existing data:", error);
      }
    }
  } catch (error) {
    // Table doesn't exist, will be created
    needsRecreate = true;
  }

  if (needsRecreate) {
    // Drop existing table
    try {
      db.exec("DROP TABLE IF EXISTS messages_fts");
    } catch (error) {
      console.warn("Could not drop existing table:", error);
    }

    // Create new table with sender_id
    db.exec(`
      CREATE VIRTUAL TABLE messages_fts USING fts5(
        id UNINDEXED,
        content,
        sender_name UNINDEXED,
        sender_id UNINDEXED,
        conversation_id UNINDEXED,
        created_at UNINDEXED,
        tokenize = 'unicode61 remove_diacritics 1',
        prefix = '1,2,3'
      );
    `);

    // Restore existing data with empty sender_id (will be migrated later)
    for (const row of existingData) {
      try {
        const insertSql = `
          INSERT INTO messages_fts(id, content, sender_name, sender_id, conversation_id, created_at) 
          VALUES ('${row.id}', '${row.content.replace(/'/g, "''")}', '${row.sender_name.replace(/'/g, "''")}', '', '${row.conversation_id}', '${row.created_at}')
        `;
        db.exec(insertSql);
      } catch (error) {
        console.warn("Could not restore row:", row.id, error);
      }
    }

    console.log(
      `Recreated messages_fts table with ${existingData.length} restored messages`
    );
  } else {
    // Table exists with correct schema
    console.log("messages_fts table already has correct schema");
  }
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

  if (type === "reset") {
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry("mydb.sqlite3"); // xoá file db
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
