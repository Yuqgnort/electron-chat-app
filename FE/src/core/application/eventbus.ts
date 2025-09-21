import { TConvPartEvents } from "../domain/conv-part/events";
import { TConvEvents } from "../domain/conv/events";
import { TMsgEvents } from "../domain/msg/events";
import { TPendingMsgEvents } from "../domain/pending-msg/events";
import { TIntegrationReceivedEvent } from "./event";

export type TEvent =
  | TConvEvents
  | TMsgEvents
  | TConvPartEvents
  | TPendingMsgEvents
  | TIntegrationReceivedEvent;

export type TEventMap = {
  [E in TEvent as E["type"]]: E;
};

export interface IEventBus {
  publish<E extends TEvent>(event: E): void;
  publishAsync<E extends TEvent>(event: E): Promise<void>;

  subscribe<K extends keyof TEventMap>(
    type: K,
    handler: (event: TEventMap[K]) => void | Promise<void>
  ): () => void;
  cleanup(): void;
}

interface EventQueueItem {
  event: TEvent;
  timestamp: number;
  id: string;
}

export function createInMemoryEventBus(): IEventBus {
  type Handlers = {
    [K in keyof TEventMap]?: Array<(e: TEventMap[K]) => void | Promise<void>>;
  };
  const handlers: Handlers = {};

  const eventQueue: EventQueueItem[] = [];
  let isProcessing = false;
  let eventCounter = 0;

  const debounceTimers = new Map<string, NodeJS.Timeout>();

  const timeouts = new Set<NodeJS.Timeout>();

  function listOf<K extends keyof TEventMap>(type: K) {
    return (handlers[type] ??= []) as Array<
      (e: TEventMap[K]) => void | Promise<void>
    >;
  }

  async function processEventQueue() {
    if (isProcessing || eventQueue.length === 0) {
      return;
    }

    isProcessing = true;

    try {
      while (eventQueue.length > 0) {
        const item = eventQueue.shift();
        if (!item) break;

        await processEvent(item.event);
      }
    } catch (error) {
      console.error("[EventBus] Error processing event queue:", error);
    } finally {
      isProcessing = false;
    }
  }

  async function processEvent(event: TEvent) {
    const listeners = handlers[event.type] as
      | Array<(e: TEvent) => void | Promise<void>>
      | undefined;

    if (!listeners || listeners.length === 0) {
      return;
    }

    // Xử lý tất cả handlers song song nhưng chờ tất cả hoàn thành
    const promises = listeners.map(async (handler) => {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        console.error(
          `[EventBus] Handler error for event ${event.type}:`,
          error
        );
      }
    });

    await Promise.all(promises);
  }

  return {
    publish<E extends TEvent>(event: E) {
      // Asynchronous publish - add to queue và trigger processing
      // Non-blocking: caller doesn't wait for event processing
      const item: EventQueueItem = {
        event,
        timestamp: Date.now(),
        id: `${event.type}-${++eventCounter}`,
      };

      eventQueue.push(item);

      // Non-blocking queue processing
      const timeout = setTimeout(() => {
        processEventQueue().catch((error) => {
          console.error("[EventBus] Queue processing error:", error);
        });
        timeouts.delete(timeout);
      }, 0);

      timeouts.add(timeout);
    },

    async publishAsync<E extends TEvent>(event: E) {
      // Synchronous publish - process immediately và wait for completion
      // Blocking: caller waits for all handlers to complete
      await processEvent(event);
    },

    subscribe<K extends keyof TEventMap>(
      type: K,
      handler: (event: TEventMap[K]) => void | Promise<void>
    ) {
      listOf(type).push(handler);

      return () => {
        const arr = handlers[type] as
          | Array<(e: TEventMap[K]) => void | Promise<void>>
          | undefined;
        if (!arr) return;
        handlers[type] = arr.filter((h) => h !== handler) as Handlers[K];
      };
    },

    cleanup() {
      // Clear all timeouts
      for (const timeout of timeouts) {
        clearTimeout(timeout);
      }
      timeouts.clear();

      // Clear debounce timers
      for (const timer of debounceTimers.values()) {
        clearTimeout(timer);
      }
      debounceTimers.clear();

      // Clear event queue
      eventQueue.length = 0;

      // Clear handlers
      Object.keys(handlers).forEach((key) => {
        delete handlers[key as keyof TEventMap];
      });

      isProcessing = false;
    },
  };
}
