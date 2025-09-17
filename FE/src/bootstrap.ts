import { createInMemoryEventBus } from "./core/application/eventbus";
import { EUserGender, IUserEntity } from "./core/domain/user/entity";
import { createIndexedDBTransactionManager } from "./infratructure/indexDB/helper";
import { ChatDb, initDb } from "./infratructure/indexDB/init";
import { createConvRepoIdb } from "./infratructure/indexDB/repo/conv.repo";
import { createConvPartRepoIdb } from "./infratructure/indexDB/repo/conv-part.repo";
import { createMsgRepoIdb } from "./infratructure/indexDB/repo/msg.repo";
import { createUserRepoIdb } from "./infratructure/indexDB/repo/user.repo";
import { createSocketClient } from "./infratructure/socket";
import { createAppService } from "./core/application/services-facade";
import {
  updateLastMsgHandler,
  updateMsgAckHandler,
} from "./core/application/handler/msg.hdl";

/////////////////////////

const seedUsers: IUserEntity[] = [
  {
    id: crypto.randomUUID(),
    userName: "Alice",
    displayName: "Alice",
    bio: "Hello, I'm Alice!",
    createdAt: new Date().getTime(),
    dob: "01/01/1990",
    gender: EUserGender.FEMALE,
    name: "Alice Johnson",
  },
  {
    id: crypto.randomUUID(),
    userName: "Bob",
    displayName: "Bob",
    bio: "Hey there, I'm Bob.",
    createdAt: new Date().getTime(),
    dob: "02/02/1992",
    gender: EUserGender.MALE,
    name: "Bob Smith",
  },
  {
    id: crypto.randomUUID(),
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
  const users = (await userRepo.findAll()) || [];
  if (users.length === 0) {
    for (const u of seedUsers) {
      await db.users.add(u);
    }
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

  // 3. Init Socket - Create socket client but don't connect yet
  const socket = createSocketClient("ws://localhost:3000", eventBus);
  // Note: Socket will connect and register when user is selected

  // 4. Register Handlers

  updateLastMsgHandler(eventBus, convRepo);
  updateMsgAckHandler(eventBus, msgRepo);

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

export type TBootstrapReturn = Awaited<ReturnType<typeof bootstrap>>;
