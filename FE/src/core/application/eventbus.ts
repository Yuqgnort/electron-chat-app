import { TConvPartEvents } from "../domain/conv-part/events";
import { TConvEvents } from "../domain/conv/events";
import { TMsgEvents } from "../domain/msg/events";

export type TDomainEvent = TConvEvents | TMsgEvents | TConvPartEvents;

export interface IEventBus {
  publish(event: TDomainEvent): void;
  subscribe(type: string, handler: (event: TDomainEvent) => void): void;
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
