import { globalHandlerRegistry } from "./handler-registry";

export const debugHandlerRegistry = () => {
  const info = globalHandlerRegistry.getRegistrationInfo();
  console.group("[HandlerRegistry Debug]");
  console.log(`Total registered handlers: ${info.length}`);

  if (info.length > 0) {
    console.table(
      info.map((item) => ({
        Handler: item.name,
        RegisteredAt: new Date(item.registeredAt).toLocaleTimeString(),
      }))
    );
  }

  console.groupEnd();
};
if (typeof window !== "undefined") {
  (window as any).debugHandlers = debugHandlerRegistry;
}

export { globalHandlerRegistry };
