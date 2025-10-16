import { IConvPartRepo } from "../domain/conv-part/repo";
import { IConvEntity } from "../domain/conv/entity";
import { IConvRepo } from "../domain/conv/repo";
import { createInitMsg, IMsgEntity } from "../domain/msg/entity";
import { IMsgRepo } from "../domain/msg/repo";
import { IPendingMsgRepo } from "../domain/pending-msg/repo";
import {
  createRankingColection,
  createSearchRawItem,
  createSearchRawResult,
  ISearchIndexItem,
  ISearchQuery,
  ISearchRawResultItem,
} from "../domain/search/entity";
import { ISearchRepository } from "../domain/search/repo";
import { IUserEntity } from "../domain/user/entity";
import { IUserRepo } from "../domain/user/repo";
import { IEventBus } from "./eventbus";
import { ICommunicationManager, ITransactionManager } from "./services-facade";
import {
  createConvPart,
  getConvPartsByConvId,
  getConvPartsByUserId,
} from "./usecase/conv-part.uc";
import { createConv, getConvById } from "./usecase/conv.uc";
import { createMsg, getMsgById } from "./usecase/msg.uc";
import { addPendingMsg } from "./usecase/pending-msg.uc";
import { prefixSearch, searchExactPhrase } from "./usecase/search.uc";
import { getUserById } from "./usecase/user.uc";

export const createConvWithParticipants = async (
  conv: Omit<
    IConvEntity,
    "id" | "createdAt" | "updatedAt" | "lastMessageId" | "key"
  >,
  userIds: string[],
  convRepo: IConvRepo,
  convPartRepo: IConvPartRepo,
  eventBus: IEventBus,
  transactionManager: ITransactionManager
) => {
  const result = await transactionManager.executeInTransaction(
    ["conversations", "conversationParts", "messages"],
    async () => {
      const newConv = await createConv(convRepo, conv, userIds);
      if (!newConv) throw new Error("Failed to create conversation");
      const convParts = await Promise.all(
        userIds.map((userId) =>
          createConvPart(convPartRepo, {
            conversationId: newConv.id,
            userId,
          })
        )
      );

      return { conv: newConv, convParts: convParts.filter(Boolean) };
    }
  );

  if (result?.conv) {
    await eventBus.publishAsync({
      type: "ConvCreated",
      payload: result.conv,
    });
  }

  if (result?.convParts?.length) {
    for (const cp of result.convParts) {
      await eventBus.publishAsync({
        type: "ConvPartCreated",
        payload: cp,
      });
    }

    return result;
  }
};

export const sendMsg = async (
  msgRepo: IMsgRepo,
  pendingMsgRepo: IPendingMsgRepo,
  eventBus: IEventBus,
  communicationManager: ICommunicationManager,
  transactionManager: ITransactionManager,
  msg: Parameters<typeof createInitMsg>[0]
) => {
  const result = await transactionManager.executeInTransaction(
    [
      "messages",
      "pendingMessages",
      "conversations",
      "conversationParts",
      "users",
    ],
    async () => {
      const newMsg = await createMsg(msgRepo, msg);
      if (!newMsg) throw new Error("Failed to create message");
      const pendingMsg = await addPendingMsg(pendingMsgRepo, {
        content: msg.content,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        conversationId: msg.conversationId,
        localId: newMsg.localId!,
      });
      if (!pendingMsg) throw new Error("Failed to create pending message");
      return { newMsg, pendingMsg };
    }
  );

  if (!result) return;

  const { newMsg, pendingMsg } = result;

  await eventBus.publishAsync({ type: "MsgCreated", payload: newMsg });
  await eventBus.publishAsync({
    type: "PendingMsgCreated",
    payload: pendingMsg,
  });

  if (newMsg.localId) {
    await communicationManager.sendMessage({
      localId: newMsg.localId,
      conversationId: newMsg.conversationId,
      senderId: newMsg.senderId,
      receiverId: newMsg.receiverId,
      content: newMsg.content,
      createdAt: newMsg.createdAt,
    });
  }
};

export const getConvsWithParticipantsByUserId = async (
  msgRepo: IMsgRepo,
  convRepo: IConvRepo,
  userRepo: IUserRepo,
  convPartRepo: IConvPartRepo,
  userId: IUserEntity["id"]
) => {
  const userConvParts = await getConvPartsByUserId(convPartRepo, userId);
  if (!userConvParts?.length) return [];

  const convIds = userConvParts.map((cp) => cp.conversationId);

  const [conversations, convPartsGroups] = await Promise.all([
    Promise.all(convIds.map((id) => getConvById(convRepo, id))),
    Promise.all(convIds.map((id) => getConvPartsByConvId(convPartRepo, id))),
  ]);

  const validConvs = conversations.filter(Boolean) as IConvEntity[];
  const convPartsMap = new Map(
    convIds.map((id, i) => [id, convPartsGroups[i] ?? []])
  );

  const userIds = new Set<string>();
  const msgIds = new Set<string>();

  for (const conv of validConvs) {
    const parts = convPartsMap.get(conv.id) ?? [];
    parts.forEach((p) => p.userId !== userId && userIds.add(p.userId));
    conv.lastMessageId && msgIds.add(conv.lastMessageId);
  }

  const [users, messages] = await Promise.all([
    Promise.all([...userIds].map((id) => getUserById(userRepo, id))),
    Promise.all([...msgIds].map((id) => getMsgById(msgRepo, id))),
  ]);

  const userMap = new Map(
    [...userIds].map((id, i) => [id, users[i]]).filter(([, u]) => !!u) as [
      string,
      IUserEntity,
    ][]
  );
  const msgMap = new Map(
    [...msgIds].map((id, i) => [id, messages[i]]).filter(([, m]) => !!m) as [
      string,
      IMsgEntity,
    ][]
  );

  const results = validConvs.map((conv) => {
    const parts = convPartsMap.get(conv.id) ?? [];
    const otherParticipants = parts
      .filter((p) => p.userId !== userId)
      .map((p) => userMap.get(p.userId)!)
      .filter(Boolean);

    return {
      conversation: conv,
      otherParticipants,
      lastMessage: conv.lastMessageId
        ? (msgMap.get(conv.lastMessageId) ?? null)
        : null,
    };
  });

  return results.sort(
    (a, b) => b.conversation.updatedAt - a.conversation.updatedAt
  );
};

export const stopTyping = async (
  communicationManager: ICommunicationManager,
  conversationId: string,
  userId: string
) => {
  await communicationManager.stopTyping({ conversationId, userId });
};

export const startTyping = async (
  communicationManager: ICommunicationManager,
  conversationId: string,
  userId: string
) => {
  await communicationManager.startTyping({ conversationId, userId });
};

export const requestAllOnlineUsers = async (
  communicationManager: ICommunicationManager
) => {
  await communicationManager.requestAllOnlineUsers({});
};

export const requestUsersStatus = async (
  communicationManager: ICommunicationManager,
  userIds: string[]
) => {
  await communicationManager.requestUsersStatus({ userIds });
};

export const sendHeartbeat = async (
  communicationManager: ICommunicationManager,
  userId: string,
  timestamp: number
) => {
  await communicationManager.sendHeartbeat({ userId, timestamp });
};

export const prefixSearchAndGetRawData = async (
  searchRepo: ISearchRepository,
  msgRepo: IMsgRepo,
  userRepo: IUserRepo,
  transactionManager: ITransactionManager,
  query: ISearchQuery
) => {
  const startTime = performance.now();
  const timeLogs: { step: string; duration: number }[] = [];

  try {
    // 🕐 1️⃣ Prefix search
    const t1 = performance.now();

    const indexResults = await prefixSearch(searchRepo, query);
    timeLogs.push({
      step: "prefixSearch",
      duration: performance.now() - t1,
    });

    // 🕐 2️⃣ Enrich data
    const t2 = performance.now();
    const enrichedItems = await enrichSearchResultsWithRawData(
      userRepo,
      msgRepo,
      indexResults.items,
      transactionManager
    );
    timeLogs.push({
      step: "enrichSearchResultsWithRawData",
      duration: performance.now() - t2,
    });

    // 🕐 3️⃣ Create ranking collection
    const { recencyBoost } = createRankingColection();

    // 🕐 4️⃣ Build raw result
    const result = createSearchRawResult(
      enrichedItems,
      query.query,
      query.type,
      indexResults.hasMore,
      performance.now() - startTime,
      indexResults.nextCursor
    );

    // 🕐 5️⃣ Apply ranking
    const t3 = performance.now();
    const rankBoostedItems = result.items.map((item) => {
      const recencyScore = recencyBoost.calFunction
        ? recencyBoost.calFunction(item.createdAt)
        : 0;
      const boostedScore = recencyScore * (recencyBoost.weight || 1);
      return { ...item, boostedScore };
    });

    rankBoostedItems.sort(
      (a, b) => (b.boostedScore || 0) - (a.boostedScore || 0)
    );

    console.log("Ranking time (ms):", (performance.now() - t3).toFixed(6));

    timeLogs.push({
      step: "Ranking",
      duration: performance.now() - t3,
    });

    // 🕐 6️⃣ Tổng thời gian
    const totalTime = performance.now() - startTime;
    timeLogs.push({
      step: "Total",
      duration: totalTime,
    });

    // 🧾 Log đẹp gọn
    console.table(
      timeLogs.map((log) => ({
        Step: log.step,
        "Duration (ms)": log.duration.toFixed(3),
      }))
    );

    return result;
  } catch (error) {
    console.error("Enhanced search error:", error);

    const totalTime = performance.now() - startTime;
    timeLogs.push({
      step: "Total (failed)",
      duration: totalTime,
    });

    console.table(
      timeLogs.map((log) => ({
        Step: log.step,
        "Duration (ms)": log.duration.toFixed(3),
      }))
    );

    return createSearchRawResult([], query.query, query.type, false, totalTime);
  }
};

export const exactPhraseSearchAndGetRawData = async (
  searchRepo: ISearchRepository,
  msgRepo: IMsgRepo,
  userRepo: IUserRepo,
  transactionManager: ITransactionManager,
  query: ISearchQuery
) => {
  const startTime = performance.now();
  const timeLogs: { step: string; duration: number }[] = [];

  try {
    // 🕐 1️⃣ Exact phrase search
    const t1 = performance.now();
    const indexResults = await searchExactPhrase(searchRepo, query);
    timeLogs.push({
      step: "searchExactPhrase",
      duration: performance.now() - t1,
    });

    // 🕐 2️⃣ Enrich data
    const t2 = performance.now();
    const enrichedItems = await enrichSearchResultsWithRawData(
      userRepo,
      msgRepo,
      indexResults.items,
      transactionManager
    );
    timeLogs.push({
      step: "enrichSearchResultsWithRawData",
      duration: performance.now() - t2,
    });

    // 🕐 3️⃣ Create ranking collection
    const { recencyBoost } = createRankingColection();

    // 🕐 4️⃣ Build raw result
    const result = createSearchRawResult(
      enrichedItems,
      query.query,
      query.type,
      indexResults.hasMore,
      performance.now() - startTime,
      indexResults.nextCursor
    );

    // 🕐 5️⃣ Apply ranking
    const t3 = performance.now();
    const rankBoostedItems = result.items.map((item) => {
      const recencyScore = recencyBoost.calFunction
        ? recencyBoost.calFunction(item.createdAt)
        : 0;
      const boostedScore = recencyScore * (recencyBoost.weight || 1);
      return { ...item, boostedScore };
    });

    rankBoostedItems.sort(
      (a, b) => (b.boostedScore || 0) - (a.boostedScore || 0)
    );

    console.log("Ranking time (ms):", (performance.now() - t3).toFixed(6));

    timeLogs.push({
      step: "Ranking",
      duration: performance.now() - t3,
    });

    // 🕐 6️⃣ Tổng thời gian
    const totalTime = performance.now() - startTime;
    timeLogs.push({
      step: "Total",
      duration: totalTime,
    });

    // 🧾 Log đẹp gọn
    console.table(
      timeLogs.map((log) => ({
        Step: log.step,
        "Duration (ms)": log.duration.toFixed(3),
      }))
    );

    return result;
  } catch (error) {
    console.error("Enhanced search error (exactPhrase):", error);

    const totalTime = performance.now() - startTime;
    timeLogs.push({
      step: "Total (failed)",
      duration: totalTime,
    });

    console.table(
      timeLogs.map((log) => ({
        Step: log.step,
        "Duration (ms)": log.duration.toFixed(3),
      }))
    );

    return createSearchRawResult([], query.query, query.type, false, totalTime);
  }
};

export const getSearchRawResult = async (
  userRepo: IUserRepo,
  msgRepo: IMsgRepo,
  searchItem: ISearchIndexItem,
  transactionManager: ITransactionManager
): Promise<ISearchRawResultItem | null> => {
  const rs = await transactionManager.executeInTransaction(
    ["users", "messages"],
    async () => {
      const msg = await getMsgById(msgRepo, searchItem.messageId);
      if (!msg) return null;
      const sender = await getUserById(userRepo, msg.senderId);
      const receiver = await getUserById(userRepo, msg.receiverId);
      const rs = createSearchRawItem({
        msg,
        receiverId: msg.receiverId,
        receiverName: receiver?.name || "unknown",
        senderId: msg.senderId,
        senderName: sender?.name || "unknown",
        highlight: "",
      });
      return rs;
    }
  );
  return rs || null;
};

export const enrichSearchResultsWithRawData = async (
  userRepo: IUserRepo,
  msgRepo: IMsgRepo,
  searchItems: ISearchIndexItem[],
  transactionManager: ITransactionManager
): Promise<ISearchRawResultItem[]> => {
  const messageIds = searchItems.map((i) => i.messageId);
  return await transactionManager.executeInTransaction(
    ["users", "messages"],
    async () => {
      const messages = await msgRepo.getManyByIds(messageIds);
      if (!messages?.length) return [];
      const userIds = new Set<string>();
      messages.forEach((msg) => {
        userIds.add(msg.senderId);
        userIds.add(msg.receiverId);
      });
      const users = await userRepo.getManyByIds([...userIds]);
      if (!users?.length) return [];
      const userMap = new Map(users.map((u) => [u.id, u]));
      return messages.map((msg) =>
        createSearchRawItem({
          msg,
          receiverId: msg.receiverId,
          receiverName: userMap.get(msg.receiverId)?.name ?? "unknown",
          senderId: msg.senderId,
          senderName: userMap.get(msg.senderId)?.name ?? "unknown",
          highlight: "",
        })
      );
    }
  );
};
