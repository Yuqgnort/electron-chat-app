import { IConvPartRepo } from "../domain/conv-part/repo";
import { IConvEntity } from "../domain/conv/entity";
import { IConvRepo } from "../domain/conv/repo";
import { createInitMsg, IMsgEntity } from "../domain/msg/entity";
import { IMsgRepo } from "../domain/msg/repo";
import { IPendingMsgRepo } from "../domain/pending-msg/repo";
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

      console.log(
        `[sendMessage] Creating pending message for localId: ${newMsg.localId}`
      );
      const pendingMsg = await addPendingMsg(pendingMsgRepo, {
        content: msg.content,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        conversationId: msg.conversationId,
        localId: newMsg.localId!,
      });
      if (!pendingMsg) throw new Error("Failed to create pending message");
      console.log(
        `[sendMessage] ✅ Created pending message for localId: ${newMsg.localId}`
      );
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
