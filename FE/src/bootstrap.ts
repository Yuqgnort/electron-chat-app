import { s } from "node_modules/framer-motion/dist/types.d-Cjd591yU";
import { createInMemoryEventBus, IEventBus } from "./core/application/eventbus";
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
import { EUserGender, IUserEntity } from "./core/domain/user/entity";
import { createIndexedDBTransactionManager } from "./infratructure/indexDB/helper";
import { ChatDb, initDb } from "./infratructure/indexDB/init";
import { createConvPartRepoIdb } from "./infratructure/indexDB/repos/conv-part.repo";
import { createConvRepoIdb } from "./infratructure/indexDB/repos/conv.repo";
import { createMsgRepoIdb } from "./infratructure/indexDB/repos/msg.repo";
import { createPendingMsgRepoIdb } from "./infratructure/indexDB/repos/pending-msg.repo";
import { createUserRepoIdb } from "./infratructure/indexDB/repos/user.repo";
import { createSocketClient } from "./infratructure/socket";
import { SQLiteService } from "./infratructure/sqlite/service";
import { withErrorHandling } from "./core/application/error";

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
  const sqliteService = new SQLiteService();
  await sqliteService.init();

  const msgRepo = createMsgRepoIdb(db);
  const userRepo = createUserRepoIdb(db);
  const convRepo = createConvRepoIdb(db);
  const convPartRepo = createConvPartRepoIdb(db);
  const pendingMsgRepo = createPendingMsgRepoIdb(db);

  await handleSeedUsers(db, userRepo);

  const eventBus = createInMemoryEventBus();
  const transactionManager = createIndexedDBTransactionManager(db);
  const socket = createSocketClient("ws://localhost:3000", eventBus);

  updateLastMsgHandler(eventBus, convRepo);
  updateMsgAckHandler(eventBus, msgRepo);
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
  autoIndexMessageHandler(eventBus, sqliteService, userRepo);
  indexExistingMessages(msgRepo, userRepo, sqliteService).catch(console.error);

  const service = createAppService(
    {
      convRepo,
      convPartRepo,
      msgRepo,
      userRepo,
      pendingMsgRepo,
    },
    eventBus,
    transactionManager,
    socket
  );

  return {
    service: {
      ...service,
      resetChatDataKeepUsers: withErrorHandling(
        async (onSuccess?: Parameters<typeof resetChatDataKeepUsers>[2]) =>
          await resetChatDataKeepUsers(db, sqliteService, onSuccess),
        "resetChatDataKeepUsers"
      ),
      search: sqliteService,
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
  searchDb: SQLiteService,
  onSuccess?: () => void
): Promise<ResetResult> {
  try {
    const indexStats = await searchDb.getIndexStats();
    await searchDb.clearIndex();
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
    if (onSuccess) onSuccess();
    return {
      success: true,
      clearedStats: indexStats,
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
