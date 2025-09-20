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
  subscribe<K extends keyof TEventMap>(
    type: K,
    handler: (event: TEventMap[K]) => void
  ): () => void;
}

export function createInMemoryEventBus(): IEventBus {
  type Handlers = { [K in keyof TEventMap]?: Array<(e: TEventMap[K]) => void> };
  const handlers: Handlers = {};

  function listOf<K extends keyof TEventMap>(type: K) {
    return (handlers[type] ??= []) as Array<(e: TEventMap[K]) => void>;
  }

  return {
    publish<E extends TEvent>(event: E) {
      const listeners = handlers[event.type] as
        | Array<(e: E) => void>
        | undefined;
      listeners?.forEach((h) => h(event));
    },

    subscribe<K extends keyof TEventMap>(
      type: K,
      handler: (event: TEventMap[K]) => void
    ) {
      listOf(type).push(handler);
      return () => {
        const arr = handlers[type] as
          | Array<(e: TEventMap[K]) => void>
          | undefined;
        if (!arr) return;
        handlers[type] = arr.filter((h) => h !== handler) as Handlers[K];
      };
    },
  };
}
