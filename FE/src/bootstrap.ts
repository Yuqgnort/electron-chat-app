import { withErrorHandling } from "./core/application/error";
import { createInMemoryEventBus } from "./core/application/eventbus";
import {
  autoIndexMessageHandler,
  indexExistingMessages,
  retrySendingPendingMessagesHandler,
  updateLastMsgHandler,
  updateMsgAckHandler,
  updateMsgDeliveredHandler,
  updateMsgIncomingHandler,
} from "./core/application/handler/msg.hdl";
import { createAppService } from "./core/application/services-facade";
import { ISearchRepository } from "./core/domain/search/repo";
import { EUserGender, IUserEntity } from "./core/domain/user/entity";
import { createIndexedDBTransactionManager } from "./infratructure/indexDB/helper";
import { ChatDb, initDb } from "./infratructure/indexDB/init";
import { createConvPartRepoIdb } from "./infratructure/indexDB/repos/conv-part.repo";
import { createConvRepoIdb } from "./infratructure/indexDB/repos/conv.repo";
import { createMsgRepoIdb } from "./infratructure/indexDB/repos/msg.repo";
import { createPendingMsgRepoIdb } from "./infratructure/indexDB/repos/pending-msg.repo";
import { createUserRepoIdb } from "./infratructure/indexDB/repos/user.repo";
import { createSocketClient } from "./infratructure/socket";
import { SQLiteWorkerDB } from "./infratructure/sqlite/init";
import { createSearchRepoSQLite } from "./infratructure/sqlite/repos";
import {
  startupHealthCheckHandler,
  periodicHealthCheckHandler,
} from "./core/application/handler/health-check.hdl";

/////////////////////////

const seedUsers: IUserEntity[] = [
  {
    id: "1-alice",
    userName: "Alice",
    displayName: "Alice",
    bio: "Hello, I'm Alice!",
    createdAt: new Date().getTime(),
    dob: "01/01/1990",
    gender: EUserGender.FEMALE,
    name: "Alice Johnson",
  },
  {
    id: "2-bob",
    userName: "Bob",
    displayName: "Bob",
    bio: "Hey there, I'm Bob.",
    createdAt: new Date().getTime(),
    dob: "02/02/1992",
    gender: EUserGender.MALE,
    name: "Bob Smith",
  },
  {
    id: "3-charlie",
    userName: "Charlie",
    displayName: "Charlie",
    bio: "Hi, I'm Charlie!",
    createdAt: new Date().getTime(),
    dob: "03/03/1994",
    gender: EUserGender.MALE,
    name: "Charlie Brown",
  },
];

/////////////////////////

const handleSeedUsers = async (
  db: ChatDb,
  userRepo: ReturnType<typeof createUserRepoIdb>
) => {
  const users = (await userRepo.getAll()) || [];
  if (users.length === 0) {
    for (const u of seedUsers) {
      await db.users.add(u);
    }
  }
};

/////////////////////////

export async function bootstrap() {
  const db = await initDb();
  const sqliteDb = new SQLiteWorkerDB();
  await sqliteDb.init();

  const msgRepo = createMsgRepoIdb(db);
  const userRepo = createUserRepoIdb(db);
  const convRepo = createConvRepoIdb(db);
  const convPartRepo = createConvPartRepoIdb(db);
  const pendingMsgRepo = createPendingMsgRepoIdb(db);
  const searchRepo = createSearchRepoSQLite(sqliteDb);

  await handleSeedUsers(db, userRepo);

  const eventBus = createInMemoryEventBus();
  const transactionManager = createIndexedDBTransactionManager(db);
  const socket = createSocketClient("ws://localhost:3000", eventBus);

  updateLastMsgHandler(eventBus, convRepo);
  updateMsgAckHandler(eventBus, msgRepo, pendingMsgRepo);
  updateMsgDeliveredHandler(eventBus, msgRepo);
  updateMsgIncomingHandler(
    eventBus,
    msgRepo,
    convRepo,
    convPartRepo,
    transactionManager,
    socket
  );
  retrySendingPendingMessagesHandler(pendingMsgRepo, eventBus, socket);
  autoIndexMessageHandler(eventBus, searchRepo);

  // Handler 1: Startup Health Check & Rebuild
  await startupHealthCheckHandler(msgRepo, searchRepo);

  // Handler 2: Periodic Health Check & Rebuild (every 30 minutes)
  const periodicHealthCheck = periodicHealthCheckHandler(msgRepo, searchRepo);
  periodicHealthCheck.start();

  const service = createAppService(
    {
      convRepo,
      convPartRepo,
      msgRepo,
      userRepo,
      pendingMsgRepo,
      searchRepo,
    },
    eventBus,
    transactionManager,
    socket
  );

  // Cleanup function for graceful shutdown
  const cleanup = () => {
    console.log("🧹 Cleaning up periodic health check...");
    periodicHealthCheck.stop();
  };

  // Register cleanup handlers (only in Node.js environment)
  if (typeof process !== "undefined" && process.on) {
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("beforeExit", cleanup);
  }

  // For browser/renderer environment - cleanup on window unload
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", cleanup);
    window.addEventListener("unload", cleanup);
  }

  return {
    service: {
      ...service,
      resetChatDataKeepUsers: withErrorHandling(
        async (onSuccess?: Parameters<typeof resetChatDataKeepUsers>[3]) =>
          await resetChatDataKeepUsers(db, searchRepo, sqliteDb, onSuccess),
        "resetChatDataKeepUsers"
      ),
    },
    socket,
    eventBus,
    db,
    repos: {
      msgRepo,
      userRepo,
      convRepo,
      convPartRepo,
      pendingMsgRepo,
      searchRepo,
    },
    sqliteDb,
    healthCheck: {
      start: () => periodicHealthCheck.start(),
      stop: () => periodicHealthCheck.stop(),
    },
  };
}

export type TBootstrapReturn = Awaited<ReturnType<typeof bootstrap>>;

export interface ResetResult {
  success: boolean;
  message: string;
  clearedStats?: any;
  error?: string;
}

export async function resetChatDataKeepUsers(
  db: ChatDb,
  searchRepo: ISearchRepository,
  sqliteDb: SQLiteWorkerDB,
  onSuccess?: () => void
): Promise<ResetResult> {
  try {
    await db.transaction(
      "rw",
      [db.messages, db.conversations, db.conversationParts, db.pendingMessages],
      async () => {
        await db.messages.clear();
        await db.conversations.clear();
        await db.conversationParts.clear();
        await db.pendingMessages.clear();
      }
    );
    await searchRepo.clearIndex();
    await sqliteDb.reset();
    // Reinitialize the search repository to ensure tables are properly created
    await searchRepo.init();
    if (onSuccess) onSuccess();
    return {
      success: true,
      message: "All chat data cleared, users preserved",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Failed to reset chat data",
    };
  }
}
