import { IConvPartRepo } from "../domain/conv-part/repo";
import { IConvEntity } from "../domain/conv/entity";
import { IConvRepo } from "../domain/conv/repo";
import { createInitMsg, IMsgEntity } from "../domain/msg/entity";
import { IMsgRepo } from "../domain/msg/repo";
import { IPendingMsgRepo } from "../domain/pending-msg/repo";
import { ISearchRepository } from "../domain/search/repo";
import {
  ISearchQuery,
  ISearchResult,
  ISearchResultItem,
  ESearchType,
  ESearchScope,
  EUserFilter,
  createSearchResult,
} from "../domain/search/entity";
import { TID } from "../domain/type";
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

const checkUserAccessToConversation = async (
  convPartRepo: IConvPartRepo,
  userId: TID,
  conversationId: TID
): Promise<boolean> => {
  try {
    const convParts = await getConvPartsByConvId(convPartRepo, conversationId);
    return convParts?.some((part) => part.userId === userId) || false;
  } catch (error) {
    console.error("Error checking conversation access:", error);
    return false;
  }
};

const filterMessagesUserHasAccessTo = async (
  convPartRepo: IConvPartRepo,
  userId: TID,
  messages: ISearchResultItem[]
): Promise<ISearchResultItem[]> => {
  const accessChecks = await Promise.all(
    messages.map(async (message) => {
      const hasAccess = await checkUserAccessToConversation(
        convPartRepo,
        userId,
        message.conversationId
      );
      return { message, hasAccess };
    })
  );

  return accessChecks
    .filter(({ hasAccess }) => hasAccess)
    .map(({ message }) => message);
};

export const performEnhancedSearch = async (
  searchRepo: ISearchRepository,
  msgRepo: IMsgRepo,
  userRepo: IUserRepo,
  convPartRepo: IConvPartRepo,
  query: ISearchQuery,
  currentUserId: TID
): Promise<ISearchResult> => {
  const startTime = Date.now();

  try {
    // Step 1: Get search results from FTS index (messageIds + basic info)
    const indexResults = await searchRepo.search(query);

    if (indexResults.items.length === 0) {
      return indexResults;
    }

    // Step 2: Filter messages based on user access to conversations
    const accessibleMessages = await filterMessagesUserHasAccessTo(
      convPartRepo,
      currentUserId,
      indexResults.items
    );

    // Step 3: Fetch raw message data using the IDs from filtered results
    const enrichedItems = await enrichSearchResultsWithRawData(
      msgRepo,
      userRepo,
      accessibleMessages
    );

    const executionTime = Date.now() - startTime;
    return createSearchResult(
      enrichedItems,
      query.query,
      query.type,
      executionTime
    );
  } catch (error) {
    console.error("Enhanced search error:", error);
    return createSearchResult(
      [],
      query.query,
      query.type,
      Date.now() - startTime
    );
  }
};

export const searchInConversationEnhanced = async (
  searchRepo: ISearchRepository,
  msgRepo: IMsgRepo,
  userRepo: IUserRepo,
  convPartRepo: IConvPartRepo,
  query: string,
  conversationId: TID,
  currentUserId: string,
  currentUserName?: string
): Promise<ISearchResult> => {
  // Security check: Verify user has access to this conversation
  const hasAccess = await checkUserAccessToConversation(
    convPartRepo,
    currentUserId,
    conversationId
  );

  if (!hasAccess) {
    console.warn(
      `User ${currentUserId} attempted to search in conversation ${conversationId} without access`
    );
    return createSearchResult([], query, ESearchType.FULL_TEXT, 0);
  }

  const searchQuery: ISearchQuery = {
    query,
    type: ESearchType.FULL_TEXT,
    scope: ESearchScope.CURRENT_CONVERSATION,
    conversationId,
    excludeCurrentUserId: currentUserId,
    excludeCurrentUserName: currentUserName,
  };

  return performEnhancedSearch(
    searchRepo,
    msgRepo,
    userRepo,
    convPartRepo,
    searchQuery,
    currentUserId
  );
};

export const searchMessagesByUserEnhanced = async (
  searchRepo: ISearchRepository,
  msgRepo: IMsgRepo,
  userRepo: IUserRepo,
  convPartRepo: IConvPartRepo,
  query: string,
  userId: TID,
  currentUserId: string,
  conversationId?: TID
): Promise<ISearchResult> => {
  // Security check for conversation-specific search
  if (conversationId) {
    const hasAccess = await checkUserAccessToConversation(
      convPartRepo,
      currentUserId,
      conversationId
    );

    if (!hasAccess) {
      console.warn(
        `User ${currentUserId} attempted to search messages by user ${userId} in conversation ${conversationId} without access`
      );
      return createSearchResult([], query, ESearchType.FULL_TEXT, 0);
    }
  }

  const searchQuery: ISearchQuery = {
    query,
    type: ESearchType.FULL_TEXT,
    scope: conversationId
      ? ESearchScope.CURRENT_CONVERSATION
      : ESearchScope.ALL_CONVERSATIONS,
    conversationId,
    userFilter: EUserFilter.SPECIFIC_USER,
    userId,
  };

  return performEnhancedSearch(
    searchRepo,
    msgRepo,
    userRepo,
    convPartRepo,
    searchQuery,
    currentUserId
  );
};

export const searchMessagesExcludingUserEnhanced = async (
  searchRepo: ISearchRepository,
  msgRepo: IMsgRepo,
  userRepo: IUserRepo,
  convPartRepo: IConvPartRepo,
  query: string,
  userId: TID,
  currentUserId: string,
  conversationId?: TID
): Promise<ISearchResult> => {
  // Security check for conversation-specific search
  if (conversationId) {
    const hasAccess = await checkUserAccessToConversation(
      convPartRepo,
      currentUserId,
      conversationId
    );

    if (!hasAccess) {
      console.warn(
        `User ${currentUserId} attempted to search messages excluding user ${userId} in conversation ${conversationId} without access`
      );
      return createSearchResult([], query, ESearchType.FULL_TEXT, 0);
    }
  }

  const searchQuery: ISearchQuery = {
    query,
    type: ESearchType.FULL_TEXT,
    scope: conversationId
      ? ESearchScope.CURRENT_CONVERSATION
      : ESearchScope.ALL_CONVERSATIONS,
    conversationId,
    userFilter: EUserFilter.EXCLUDE_USER,
    userId,
  };

  return performEnhancedSearch(
    searchRepo,
    msgRepo,
    userRepo,
    convPartRepo,
    searchQuery,
    currentUserId
  );
};

export const searchExactPhraseEnhanced = async (
  searchRepo: ISearchRepository,
  msgRepo: IMsgRepo,
  userRepo: IUserRepo,
  convPartRepo: IConvPartRepo,
  phrase: string,
  currentUserId: string,
  conversationId?: TID,
  currentUserName?: string
): Promise<ISearchResult> => {
  // Security check for conversation-specific search
  if (conversationId) {
    const hasAccess = await checkUserAccessToConversation(
      convPartRepo,
      currentUserId,
      conversationId
    );

    if (!hasAccess) {
      console.warn(
        `User ${currentUserId} attempted to search exact phrase in conversation ${conversationId} without access`
      );
      return createSearchResult([], phrase, ESearchType.EXACT_PHRASE, 0);
    }
  }

  const searchQuery: ISearchQuery = {
    query: phrase,
    type: ESearchType.EXACT_PHRASE,
    scope: conversationId
      ? ESearchScope.CURRENT_CONVERSATION
      : ESearchScope.ALL_CONVERSATIONS,
    conversationId,
    excludeCurrentUserId: currentUserId,
    excludeCurrentUserName: currentUserName,
  };

  return performEnhancedSearch(
    searchRepo,
    msgRepo,
    userRepo,
    convPartRepo,
    searchQuery,
    currentUserId
  );
};

const enrichSearchResultsWithRawData = async (
  msgRepo: IMsgRepo,
  userRepo: IUserRepo,
  searchItems: ISearchResultItem[]
): Promise<ISearchResultItem[]> => {
  const enrichedItems: ISearchResultItem[] = [];

  for (const item of searchItems) {
    try {
      // Fetch raw message data from message repository
      const rawMessage = await msgRepo.getById(item.id);

      if (rawMessage) {
        // Use raw data as source of truth, keep search ranking
        const enrichedItem: ISearchResultItem = {
          id: rawMessage.id,
          content: rawMessage.content, // Raw content from DB
          senderName: item.senderName, // Keep from search for performance
          senderId: rawMessage.senderId, // Raw senderId from DB
          conversationId: rawMessage.conversationId, // Raw conversationId from DB
          createdAt: rawMessage.createdAt, // Raw timestamp from DB
          rank: item.rank, // Keep search ranking
          highlight: item.highlight, // Keep search highlighting if any
        };

        // Optionally enrich with fresh user data if senderId changed
        if (rawMessage.senderId && rawMessage.senderId !== item.senderId) {
          try {
            const user = await userRepo.getById(rawMessage.senderId);
            if (user) {
              enrichedItem.senderName = user.displayName || user.userName;
            }
          } catch (userError) {
            console.warn(
              `Failed to fetch user data for ${rawMessage.senderId}:`,
              userError
            );
            // Keep existing senderName from search index
          }
        }

        enrichedItems.push(enrichedItem);
      } else {
        // Message not found in main DB, keep search result as fallback
        console.warn(
          `Message ${item.id} found in search index but not in main DB`
        );
        enrichedItems.push(item);
      }
    } catch (error) {
      console.warn(
        `Failed to enrich search result for message ${item.id}:`,
        error
      );
      // Fallback to search index data
      enrichedItems.push(item);
    }
  }

  return enrichedItems;
};
