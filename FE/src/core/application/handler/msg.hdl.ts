import { IConvPartRepo } from "@/core/domain/conv-part/repo";
import { IConvRepo } from "@/core/domain/conv/repo";
import { createInitMsg, EMsgStatus } from "@/core/domain/msg/entity";
import { IMsgRepo } from "@/core/domain/msg/repo";
import { IPendingMsgEntity } from "@/core/domain/pending-msg/entity";
import { IPendingMsgRepo } from "@/core/domain/pending-msg/repo";
import { createNormalizeSearchString } from "@/core/domain/search/entity";
import { ISearchRepository } from "@/core/domain/search/repo";
import { assertExists, withErrorHandling } from "../error";
import { IEventBus } from "../eventbus";
import { createConvWithParticipants } from "../services";
import { ICommunicationManager, ITransactionManager } from "../services-facade";
import { updateConvLastMessageId } from "../usecase/conv.uc";
import { createMsg, setMsgDelivered, setMsgSent } from "../usecase/msg.uc";
import { getAllPendingMsgs, removePendingMsg } from "../usecase/pending-msg.uc";

class MessageProcessingManager {
  private locks = new Map<string, Promise<void>>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const currentLock = this.locks.get(key);
    if (currentLock) {
      await currentLock;
    }

    let resolve: () => void;
    const newLock = new Promise<void>((res) => {
      resolve = res;
    });
    this.locks.set(key, newLock);

    try {
      return await fn();
    } finally {
      this.locks.delete(key);
      resolve!();
    }
  }

  withUserPairLock<T>(userId1: string, userId2: string, fn: () => Promise<T>) {
    const key = [userId1, userId2].sort().join(":");
    return this.withLock(key, fn);
  }

  withConversationLock<T>(conversationId: string, fn: () => Promise<T>) {
    return this.withLock(`conv:${conversationId}`, fn);
  }

  withMessageLock<T>(messageId: string, fn: () => Promise<T>) {
    return this.withLock(`msg:${messageId}`, fn);
  }

  withServerIdLock<T>(serverId: string, fn: () => Promise<T>) {
    return this.withLock(`server:${serverId}`, fn);
  }

  withLocalIdLock<T>(localId: string, fn: () => Promise<T>) {
    return this.withLock(`local:${localId}`, fn);
  }

  async withDebounce<T>(
    key: string,
    delay: number,
    fn: () => Promise<T>
  ): Promise<T | null> {
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) clearTimeout(existingTimer);

    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(key);
        try {
          resolve(await fn());
        } catch (error) {
          console.error(`Debounced operation failed for key ${key}:`, error);
          resolve(null);
        }
      }, delay);

      this.debounceTimers.set(key, timer);
    });
  }

  cleanup(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.locks.clear();
  }
}

const messageProcessingManager = new MessageProcessingManager();

export const updateLastMsgHandler = (
  eventBus: IEventBus,
  convRepo: IConvRepo
) => {
  return eventBus.subscribe(
    "MsgCreated",
    withErrorHandling(async ({ payload }) => {
      await messageProcessingManager.withConversationLock(
        payload.conversationId,
        async () => {
          const conv = assertExists(
            await convRepo.getConvById(payload.conversationId),
            `Conversation with id ${payload.conversationId} not found for last message update`
          );
          const updatedConv = assertExists(
            await updateConvLastMessageId(convRepo, conv, payload.id),
            `Failed to update last message for conversation ${conv.id}`
          );
          eventBus.publish({
            type: "ConvLastMessageChanged",
            payload: updatedConv,
          });
          return updatedConv;
        }
      );
    }, "updateLastMsgHandler")
  );
};

export const updateMsgAckHandler = (
  eventBus: IEventBus,
  msgRepo: IMsgRepo,
  pendingMsgRepo: IPendingMsgRepo
) => {
  return eventBus.subscribe(
    "msg:ack",
    withErrorHandling(async ({ payload }) => {
      await messageProcessingManager.withLocalIdLock(
        payload.localId,
        async () => {
          // Double-check the message still exists and hasn't been processed
          const msgAck = await msgRepo.getByLocalId(payload.localId);
          if (!msgAck) {
            console.warn(
              `[updateMsgAckHandler] Message with localId ${payload.localId} not found, may have been processed already`
            );
            return;
          }

          // Check if message already has a serverId to avoid duplicate processing
          if (msgAck.serverId && msgAck.serverId === payload.serverId) {
            console.log(
              `[updateMsgAckHandler] Message with localId ${payload.localId} already has serverId ${payload.serverId}, skipping update`
            );
            return;
          }

          const msg = { ...msgAck, serverId: payload.serverId };
          const newMsg = await setMsgSent(msgRepo, msg);

          try {
            await removePendingMsg(pendingMsgRepo, payload.localId);
            eventBus.publish({
              type: "PendingMsgRemoved",
              payload: { localId: payload.localId },
            });
          } catch (error) {
            console.warn(
              `[updateMsgAckHandler] ❌ Failed to remove pending message for localId ${payload.localId}:`,
              error
            );
          }

          eventBus.publish({ type: "MsgUpdated", payload: newMsg });
        }
      );
    }, "updateMsgAckHandler")
  );
};

export const updateMsgDeliveredHandler = (
  eventBus: IEventBus,
  msgRepo: IMsgRepo
) => {
  return eventBus.subscribe(
    "msg:delivered",
    withErrorHandling(async ({ payload }) => {
      await messageProcessingManager.withServerIdLock(
        payload.serverId,
        async () => {
          const msg = assertExists(
            await msgRepo.getByServerId(payload.serverId),
            `Message with serverId ${payload.serverId} not found for delivery update`
          );
          const newMsg = await setMsgDelivered(msgRepo, msg);
          eventBus.publish({ type: "MsgUpdated", payload: newMsg });
          return newMsg;
        }
      );
    }, "updateMsgDeliveredHandler")
  );
};

export const updateMsgIncomingHandler = (
  eventBus: IEventBus,
  msgRepo: IMsgRepo,
  convRepo: IConvRepo,
  convPartRepo: IConvPartRepo,
  transactionManager: ITransactionManager,
  communicationManager: ICommunicationManager
) => {
  return eventBus.subscribe(
    "msg:incoming",
    withErrorHandling(async ({ payload }) => {
      if (payload.serverId) {
        await messageProcessingManager.withServerIdLock(
          payload.serverId,
          async () => {
            const existingMsg = await msgRepo.getByServerId(payload.serverId);
            if (existingMsg) {
              console.log(
                `[MsgIncomingHandler] Message with serverId ${payload.serverId} already exists, skipping creation`
              );
              return;
            }

            await processIncomingMessage(payload, {
              eventBus,
              msgRepo,
              convRepo,
              convPartRepo,
              transactionManager,
              communicationManager,
            });
          }
        );
      } else {
        await messageProcessingManager.withUserPairLock(
          payload.senderId,
          payload.receiverId,
          async () => {
            await processIncomingMessage(payload, {
              eventBus,
              msgRepo,
              convRepo,
              convPartRepo,
              transactionManager,
              communicationManager,
            });
          }
        );
      }
    }, "updateMsgIncomingHandler")
  );
};

async function processIncomingMessage(
  payload: any,
  deps: {
    eventBus: IEventBus;
    msgRepo: IMsgRepo;
    convRepo: IConvRepo;
    convPartRepo: IConvPartRepo;
    transactionManager: ITransactionManager;
    communicationManager: ICommunicationManager;
  }
): Promise<void> {
  const {
    eventBus,
    msgRepo,
    convRepo,
    convPartRepo,
    transactionManager,
    communicationManager,
  } = deps;

  let conv = await convRepo.getConvByUserIds([
    payload.senderId,
    payload.receiverId,
  ]);
  if (!conv) {
    const result = assertExists(
      await createConvWithParticipants(
        { title: "New Conversation" },
        [payload.senderId, payload.receiverId],
        convRepo,
        convPartRepo,
        eventBus,
        transactionManager
      ),
      "Failed to create conversation for incoming message"
    );
    conv = result.conv;
    await eventBus.publishAsync({ type: "ConvCreated", payload: conv });
  }

  const initNewMsg = createInitMsg({
    content: payload.content,
    conversationId: conv.id,
    senderId: payload.senderId,
    receiverId: payload.receiverId,
    serverId: payload.serverId,
    status: EMsgStatus.DELIVERED,
  });

  const newMsg = assertExists(
    await createMsg(msgRepo, initNewMsg),
    "Failed to create incoming message"
  );
  await eventBus.publishAsync({ type: "MsgCreated", payload: newMsg });
  const updatedConv = assertExists(
    await updateConvLastMessageId(convRepo, conv, newMsg.id),
    `Failed to update last message for conversation ${conv.id}`
  );
  await eventBus.publishAsync({
    type: "ConvLastMessageChanged",
    payload: updatedConv,
  });

  if (newMsg.serverId) {
    await communicationManager.deliverMessage({
      serverId: newMsg.serverId,
    });
  }
}

export const retrySendingPendingMessagesHandler = (
  pendingMsgRepo: IPendingMsgRepo,
  eventBus: IEventBus,
  communicationManager: ICommunicationManager
) => {
  return eventBus.subscribe(
    "connect",
    withErrorHandling(async () => {
      await messageProcessingManager.withDebounce(
        "retry-pending-messages",
        1000,
        async () => {
          const pendingMsgs = await getAllPendingMsgs(pendingMsgRepo);
          const errors: Error[] = [];

          for (const pendingMsg of pendingMsgs) {
            const success = await retrySinglePendingMsg(
              pendingMsgRepo,
              communicationManager,
              pendingMsg,
              errors
            );
            if (success) {
              eventBus.publish({
                type: "PendingMsgRemoved",
                payload: { localId: pendingMsg.localId },
              });
            }
          }
          if (errors.length > 0) {
            throw new AggregateError(
              errors,
              `[RetryPendingMessages] ${errors.length} messages failed to resend`
            );
          }
          return {
            processedCount: pendingMsgs.length,
            errorCount: errors.length,
          };
        }
      );
    }, "retrySendingPendingMessagesHandler")
  );
};

async function retrySinglePendingMsg(
  pendingMsgRepo: IPendingMsgRepo,
  communicationManager: ICommunicationManager,
  pendingMsg: IPendingMsgEntity,
  errors: Error[]
): Promise<boolean> {
  return messageProcessingManager.withLocalIdLock(
    pendingMsg.localId,
    async () => {
      try {
        await communicationManager.sendMessage({
          content: pendingMsg.content,
          localId: pendingMsg.localId,
          senderId: pendingMsg.senderId,
          createdAt: pendingMsg.createdAt,
          receiverId: pendingMsg.receiverId,
          conversationId: pendingMsg.conversationId,
        });
        await removePendingMsg(pendingMsgRepo, pendingMsg.localId);
        return true;
      } catch (err) {
        console.error(
          `[RetryPendingMessages] Failed to resend message ${pendingMsg.localId}:`,
          err
        );
        errors.push(err instanceof Error ? err : new Error(String(err)));
        return false;
      }
    }
  );
}

export const autoIndexMessageHandler = (
  eventBus: IEventBus,
  searchRepo: ISearchRepository
) => {
  return eventBus.subscribe(
    "MsgCreated",
    withErrorHandling(async ({ payload: msg }) => {
      const isAlreadyIndexed = await searchRepo.isMessageIndexed(msg.id);
      if (isAlreadyIndexed) {
        throw new Error(`Message ${msg.id} is already indexed`);
      }
      await searchRepo.indexMessage({
        messageId: msg.id,
        content: createNormalizeSearchString(msg.content),
        conversationId: msg.conversationId,
        createdAt: msg.createdAt,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
      });
    }, "autoIndexMessageHandler")
  );
};

export const indexExistingMessages = async (
  msgRepo: IMsgRepo,
  searchRepo: ISearchRepository
) => {
  try {
    console.log("Checking for unindexed messages...");
    const allMessages = await msgRepo.getAll();
    if (!allMessages) {
      console.log("No existing messages found");
      return;
    }
    const indexedIds = await searchRepo.getIndexedMessageIds();
    const indexedIdsSet = new Set(indexedIds);
    const unindexedMessages = allMessages.filter(
      (msg) => !indexedIdsSet.has(msg.id)
    );
    if (unindexedMessages.length === 0) {
      console.log(`All ${allMessages.length} messages are already indexed`);
      return;
    }
    console.log(
      `Found ${unindexedMessages.length} unindexed messages out of ${allMessages.length} total`
    );
    let indexed = 0;
    for (const msg of unindexedMessages) {
      try {
        await searchRepo.indexMessage({
          messageId: msg.id,
          conversationId: msg.conversationId,
          createdAt: msg.createdAt,
          senderId: msg.senderId,
          content: createNormalizeSearchString(msg.content),
          receiverId: msg.receiverId,
        });
        indexed++;
        if (indexed % 100 === 0) {
          console.log(
            `Indexed ${indexed}/${unindexedMessages.length} messages...`
          );
        }
      } catch (error) {
        console.error(`Failed to index existing message ${msg.id}:`, error);
      }
    }
    console.log(
      `Successfully indexed ${indexed} new messages (${indexedIds.length + indexed} total indexed)`
    );
  } catch (error) {
    console.error("Failed to index existing messages:", error);
  }
};

export { messageProcessingManager };
