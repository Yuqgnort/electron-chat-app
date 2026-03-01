import { IEventBus, TEventMap } from "@/core/application/eventbus";
import { DependencyList, useEffect, useLayoutEffect } from "react";

export function useSubscribeEventBus<K extends keyof TEventMap>(
  eventBus: IEventBus,
  eventType: K,
  triggerFunc: (payload: TEventMap[K]["payload"]) => void | Promise<void>,
  dependencies: DependencyList = []
) {
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(eventType, (event) => {
      Promise.resolve(triggerFunc(event.payload)).catch((err) => {
        console.error("Event handler error:", err);
      });
    });
    return () => unsubscribe();
  }, [eventBus, eventType, triggerFunc, ...dependencies]);
}

export function useSubscribeEventBusLayout<K extends keyof TEventMap>(
  eventBus: IEventBus,
  eventType: K,
  triggerFunc: (payload: TEventMap[K]["payload"]) => void | Promise<void>,
  dependencies: DependencyList = []
) {
  useLayoutEffect(() => {
    const unsubscribe = eventBus.subscribe(eventType, (event) => {
      Promise.resolve(triggerFunc(event.payload)).catch((err) => {
        console.error("Event handler error:", err);
      });
    });
    return () => unsubscribe();
  }, [eventBus, eventType, triggerFunc, ...dependencies]);
}
