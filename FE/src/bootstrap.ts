import { createInMemoryEventBus } from "./core/application/eventbus";
import { IUserEntity } from "./core/domain/user/entity";
import { createIndexedDBTransactionManager } from "./infratructure/indexDB/helper";
import { ChatDb, initDb } from "./infratructure/indexDB/init";
import { createConvRepoIdb } from "./infratructure/indexDB/repo/conv.repo";
import { createConvPartRepoIdb } from "./infratructure/indexDB/repo/conv-part.repo";
import { createMsgRepoIdb } from "./infratructure/indexDB/repo/msg.repo";
import { createUserRepoIdb } from "./infratructure/indexDB/repo/user.repo";
import { createSocketClient } from "./infratructure/socket";
import { createAppService } from "./core/application/services-facade";

/////////////////////////

const seedUsers: IUserEntity[] = [];

/////////////////////////

const handleSeedUsers = async (
  db: ChatDb,
  userRepo: ReturnType<typeof createUserRepoIdb>
) => {
  const users = await userRepo.findAll();
  if (users.length === 0) {
    for (const u of seedUsers) {
      await db.users.add(u);
    }
    console.log(
      "[bootstrap] Seeded users:",
      seedUsers.map((u) => u.userName)
    );
  }
};

/////////////////////////

export async function bootstrap() {
  // 1. Init DB
  const db = await initDb();
  const msgRepo = createMsgRepoIdb(db);
  const userRepo = createUserRepoIdb(db);
  const convRepo = createConvRepoIdb(db);
  const convPartRepo = createConvPartRepoIdb(db);

  await handleSeedUsers(db, userRepo);

  // 2. Init EventBus
  const eventBus = createInMemoryEventBus();

  // 3. Init Socket - Connect to BE relay server
  const socket = createSocketClient("ws://localhost:3000", eventBus);
  socket.connect();

  // 4. Register Handlers

  // 5. Create App Service

  const transactionManager = createIndexedDBTransactionManager(db);

  const service = createAppService(
    {
      convRepo,
      convPartRepo,
      msgRepo,
      userRepo,
    },
    eventBus,
    transactionManager,
    socket
  );

  // 6. Return all the things

  return {
    service,
    eventBus,
    socket,
  };
}
