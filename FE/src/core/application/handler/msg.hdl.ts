import { IConvPartRepo } from "@/core/domain/conv-part/repo";
import { IConvRepo } from "@/core/domain/conv/repo";
import { createInitMsg, EMsgStatus } from "@/core/domain/msg/entity";
import { IMsgRepo } from "@/core/domain/msg/repo";
import { IPendingMsgEntity } from "@/core/domain/pending-msg/entity";
import { IPendingMsgRepo } from "@/core/domain/pending-msg/repo";
import { IUserRepo } from "@/core/domain/user/repo";
import { ISearchRepository } from "@/core/domain/search/repo";
import { assertExists, withErrorHandling } from "../error";
import { IEventBus } from "../eventbus";
import { createConvWithParticipants } from "../services";
import { ICommunicationManager, ITransactionManager } from "../services-facade";
import { updateConvLastMessageId } from "../usecase/conv.uc";
import { createMsg, setMsgDelivered, setMsgSent } from "../usecase/msg.uc";
import { getAllPendingMsgs, removePendingMsg } from "../usecase/pending-msg.uc";
import { globalHandlerRegistry } from "../handler-registry";

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
  const handlerName = "updateLastMsgHandler";

  if (globalHandlerRegistry.isRegistered(handlerName)) {
    console.log(
      `[${handlerName}] Already registered, skipping duplicate registration`
    );
    return;
  }

  const unsubscriber = eventBus.subscribe(
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

  globalHandlerRegistry.register(handlerName, unsubscriber);
};

export const updateMsgAckHandler = (
  eventBus: IEventBus,
  msgRepo: IMsgRepo,
  pendingMsgRepo: IPendingMsgRepo
) => {
  const handlerName = "updateMsgAckHandler";

  if (globalHandlerRegistry.isRegistered(handlerName)) {
    console.log(
      `[${handlerName}] Already registered, skipping duplicate registration`
    );
    return;
  }

  const unsubscriber = eventBus.subscribe(
    "msg:ack",
    withErrorHandling(async ({ payload }) => {
      console.log(
        `[updateMsgAckHandler] Processing ack for localId: ${payload.localId}, serverId: ${payload.serverId}`
      );

      await messageProcessingManager.withLocalIdLock(
        payload.localId,
        async () => {
          const msgAck = assertExists(
            await msgRepo.getByLocalId(payload.localId),
            `Message with localId ${payload.localId} not found for ack update`
          );
          const msg = { ...msgAck, serverId: payload.serverId };
          const newMsg = await setMsgSent(msgRepo, msg);

          // Remove pending message since it's now successfully sent
          try {
            console.log(
              `[updateMsgAckHandler] Attempting to remove pending message for localId: ${payload.localId}`
            );
            await removePendingMsg(pendingMsgRepo, payload.localId);
            console.log(
              `[updateMsgAckHandler] ✅ Successfully removed pending message for localId: ${payload.localId}`
            );
            eventBus.publish({
              type: "PendingMsgRemoved",
              payload: { localId: payload.localId },
            });
          } catch (error) {
            console.warn(
              `[updateMsgAckHandler] ❌ Failed to remove pending message for localId ${payload.localId}:`,
              error
            );
            // Don't fail the entire operation if pending message removal fails
          }

          eventBus.publish({ type: "MsgUpdated", payload: newMsg });
          console.log(
            `[updateMsgAckHandler] ✅ Message ${payload.localId} marked as sent`
          );
          return newMsg;
        }
      );
    }, "updateMsgAckHandler")
  );

  globalHandlerRegistry.register(handlerName, unsubscriber);
};

export const updateMsgDeliveredHandler = (
  eventBus: IEventBus,
  msgRepo: IMsgRepo
) => {
  const handlerName = "updateMsgDeliveredHandler";

  if (globalHandlerRegistry.isRegistered(handlerName)) {
    console.log(
      `[${handlerName}] Already registered, skipping duplicate registration`
    );
    return;
  }

  const unsubscriber = eventBus.subscribe(
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

  globalHandlerRegistry.register(handlerName, unsubscriber);
};

export const updateMsgIncomingHandler = (
  eventBus: IEventBus,
  msgRepo: IMsgRepo,
  convRepo: IConvRepo,
  convPartRepo: IConvPartRepo,
  transactionManager: ITransactionManager,
  communicationManager: ICommunicationManager
) => {
  const handlerName = "updateMsgIncomingHandler";

  if (globalHandlerRegistry.isRegistered(handlerName)) {
    console.log(
      `[${handlerName}] Already registered, skipping duplicate registration`
    );
    return;
  }

  const unsubscriber = eventBus.subscribe(
    "msg:incoming",
    withErrorHandling(async ({ payload }) => {
      console.log("[MsgIncomingHandler] Received incoming message:", payload);

      await messageProcessingManager.withUserPairLock(
        payload.senderId,
        payload.receiverId,
        async () => {
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

          // Check if message already exists by serverId to avoid duplicates
          if (payload.serverId) {
            const existingMsg = await msgRepo.getByServerId(payload.serverId);
            if (existingMsg) {
              console.log(
                `[MsgIncomingHandler] Message with serverId ${payload.serverId} already exists, skipping creation`
              );
              return { newMsg: existingMsg, updatedConv: conv };
            }
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

          return { newMsg, updatedConv };
        }
      );
    }, "updateMsgIncomingHandler")
  );

  globalHandlerRegistry.register(handlerName, unsubscriber);
};

export const retrySendingPendingMessagesHandler = (
  pendingMsgRepo: IPendingMsgRepo,
  eventBus: IEventBus,
  communicationManager: ICommunicationManager
) => {
  const handlerName = "retrySendingPendingMessagesHandler";

  if (globalHandlerRegistry.isRegistered(handlerName)) {
    console.log(
      `[${handlerName}] Already registered, skipping duplicate registration`
    );
    return;
  }

  const unsubscriber = eventBus.subscribe(
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

  globalHandlerRegistry.register(handlerName, unsubscriber);
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

const normalizeForSearch = (s: string) =>
  s
    .normalize("NFD") // tách dấu
    .replace(/[\u0300-\u036f]/g, "") // xoá dấu
    .replace(/đ/g, "d") // đ → d
    .replace(/Đ/g, "D");

export const autoIndexMessageHandler = (
  eventBus: IEventBus,
  searchRepo: ISearchRepository,
  userRepo: IUserRepo
) => {
  const handlerName = "autoIndexMessageHandler";

  if (globalHandlerRegistry.isRegistered(handlerName)) {
    console.log(
      `[${handlerName}] Already registered, skipping duplicate registration`
    );
    return;
  }

  const unsubscriber = eventBus.subscribe(
    "MsgCreated",
    withErrorHandling(async ({ payload: msg }) => {
      try {
        // Check if message is already indexed to avoid duplicates
        const isAlreadyIndexed = await searchRepo.isMessageIndexed(msg.id);

        if (isAlreadyIndexed) {
          console.log(`Message ${msg.id} already indexed, skipping`);
          return;
        }

        const sender = await userRepo.getById(msg.senderId);
        const senderName = sender?.userName || "Unknown";

        await searchRepo.indexMessage({
          messageId: msg.id,
          content: normalizeForSearch(msg.content),
          senderName,
          senderId: msg.senderId,
          conversationId: msg.conversationId,
          createdAt: msg.createdAt,
        });

        console.log(`Message ${msg.id} indexed in FTS`);
      } catch (error) {
        console.error("Failed to index message in FTS:", error);
      }
    }, "autoIndexMessageHandler")
  );

  globalHandlerRegistry.register(handlerName, unsubscriber);
};

export const indexExistingMessages = async (
  msgRepo: IMsgRepo,
  userRepo: IUserRepo,
  searchRepo: ISearchRepository
) => {
  try {
    console.log("Checking for unindexed messages...");

    const allMessages = await msgRepo.getAll();
    if (!allMessages) {
      console.log("No existing messages found");
      return;
    }

    // Get already indexed message IDs
    const indexedIds = await searchRepo.getIndexedMessageIds();
    const indexedIdsSet = new Set(indexedIds);

    // Filter out already indexed messages
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
        const sender = await userRepo.getById(msg.senderId);
        const senderName = sender?.userName || "Unknown";

        await searchRepo.indexMessage({
          messageId: msg.id,
          content: normalizeForSearch(msg.content),
          senderName,
          senderId: msg.senderId,
          conversationId: msg.conversationId,
          createdAt: msg.createdAt,
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
