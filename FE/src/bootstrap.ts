import { withErrorHandling } from "./core/application/error";
import { createInMemoryEventBus } from "./core/application/eventbus";
import {
  periodicHealthCheckHandler,
  startupHealthCheckHandler,
} from "./core/application/handler/health-check.hdl";
import {
  autoIndexMessageHandler,
  retrySendingPendingMessagesHandler,
  updateLastMsgHandler,
  updateMsgAckHandler,
  updateMsgDeliveredHandler,
  updateMsgIncomingHandler,
} from "./core/application/handler/msg.hdl";
import { createAppService } from "./core/application/services-facade";
import { ISearchRepository } from "./core/domain/search/repo";
import { TTimeStamp } from "./core/domain/type";
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
import { insertCustomTestMessages } from "./test/messages/bulk-insert-messages";

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
  {
    id: "4-diana",
    userName: "Diana",
    displayName: "Diana",
    bio: "Lover of art and coffee ☕",
    createdAt: new Date().getTime(),
    dob: "04/04/1991",
    gender: EUserGender.FEMALE,
    name: "Diana Prince",
  },
  {
    id: "5-ethan",
    userName: "Ethan",
    displayName: "Ethan",
    bio: "Tech enthusiast and gamer 🎮",
    createdAt: new Date().getTime(),
    dob: "05/05/1993",
    gender: EUserGender.MALE,
    name: "Ethan Miller",
  },
  {
    id: "6-fiona",
    userName: "Fiona",
    displayName: "Fiona",
    bio: "Traveler and foodie 🌍",
    createdAt: new Date().getTime(),
    dob: "06/06/1995",
    gender: EUserGender.FEMALE,
    name: "Fiona Lee",
  },
  {
    id: "7-george",
    userName: "George",
    displayName: "George",
    bio: "Always learning something new!",
    createdAt: new Date().getTime(),
    dob: "07/07/1990",
    gender: EUserGender.MALE,
    name: "George Wilson",
  },
  {
    id: "8-hannah",
    userName: "Hannah",
    displayName: "Hannah",
    bio: "Bookworm and tea lover 🍵",
    createdAt: new Date().getTime(),
    dob: "08/08/1996",
    gender: EUserGender.FEMALE,
    name: "Hannah Davis",
  },
  {
    id: "9-ian",
    userName: "Ian",
    displayName: "Ian",
    bio: "Music producer and sound designer 🎧",
    createdAt: new Date().getTime(),
    dob: "09/09/1991",
    gender: EUserGender.MALE,
    name: "Ian Carter",
  },
  {
    id: "10-julia",
    userName: "Julia",
    displayName: "Julia",
    bio: "Photographer & dreamer 📸",
    createdAt: new Date().getTime(),
    dob: "10/10/1994",
    gender: EUserGender.FEMALE,
    name: "Julia Roberts",
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
    test: {
      insertCustomTestMessages: withErrorHandling(
        async (
          conversationId: string,
          senderId: string,
          receiverId: string,
          count: number,
          startIndex: number = 0,
          startDate?: TTimeStamp
        ) =>
          await insertCustomTestMessages(
            db,
            searchRepo,
            convRepo,
            conversationId,
            senderId,
            receiverId,
            count,
            startIndex,
            startDate
          ),
        "insertCustomTestMessages"
      ),
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
