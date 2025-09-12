import { TConvPartEvents } from "../domain/conv-part/events";
import { TConvEvents } from "../domain/conv/events";
import { TMsgEvents } from "../domain/msg/events";

export type TDomainEvent = TConvEvents | TMsgEvents | TConvPartEvents;

type EventMap = {
  [E in TDomainEvent as E["type"]]: E;
};

export interface IEventBus {
  publish<E extends TDomainEvent>(event: E): void;
  subscribe<K extends keyof EventMap>(
    type: K,
    handler: (event: EventMap[K]) => void
  ): void;
}

export function createInMemoryEventBus(): IEventBus {
  const handlers: { [type: string]: ((e: TDomainEvent) => void)[] } = {};

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
