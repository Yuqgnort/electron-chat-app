import { TConvPartEvents } from "../domain/conv-part/events";
import { TConvEvents } from "../domain/conv/events";
import { TMsgEvents } from "../domain/msg/events";
import { TIntegrationReceivedEvent } from "./event";

///////////////////////

export type TEvent =
  | TConvEvents
  | TMsgEvents
  | TConvPartEvents
  | TIntegrationReceivedEvent;

type TEventMap = {
  [E in TEvent as E["type"]]: E;
};

///////////////////////

export interface IEventBus {
  publish<E extends TEvent>(event: E): void;
  subscribe<K extends keyof TEventMap>(
    type: K,
    handler: (event: TEventMap[K]) => void
  ): void;
}

///////////////////////

export function createInMemoryEventBus(): IEventBus {
  const handlers: { [type: string]: ((e: TEvent) => void)[] } = {};

  return {
    publish(event) {
      (handlers[event.type] || []).forEach((h) => h(event));
    },
    subscribe(type, handler) {
      if (!handlers[type]) handlers[type] = [];
      handlers[type].push(handler);
    },
  };
}
