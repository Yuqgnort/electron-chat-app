export class SQLiteWorkerDB {
  private worker: Worker;
  private messageId = 0;
  private pendingMessages = new Map<
    number,
    { resolve: (value: any) => void; reject: (error: any) => void }
  >();

  constructor() {
    this.worker = new Worker(new URL("./sqlite-worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = this.handleMessage.bind(this);
  }

  private handleMessage(event: MessageEvent) {
    const { type, result, error, id } = event.data;
    const pending = this.pendingMessages.get(id);

    if (!pending) return;

    this.pendingMessages.delete(id);

    if (type === "error") {
      pending.reject(new Error(error));
    } else {
      pending.resolve(result);
    }
  }

  private sendMessage(type: string, data: any = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      this.pendingMessages.set(id, { resolve, reject });
      this.worker.postMessage({ type, id, ...data });
    });
  }

  async init() {
    await this.sendMessage("init");
    console.log("SQLite Worker with OpfsDb initialized");
  }

  async exec(sql: string) {
    return this.sendMessage("exec", { sql });
  }

  async select(sql: string) {
    return this.sendMessage("select", { sql });
  }
}
