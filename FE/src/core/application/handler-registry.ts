// Global handler registry to prevent duplicate handlers during HMR
class HandlerRegistry {
  private registeredHandlers = new Set<string>();
  private unsubscribers = new Map<string, () => void>();
  private registrationTimes = new Map<string, number>();

  isRegistered(handlerName: string): boolean {
    return this.registeredHandlers.has(handlerName);
  }

  register(handlerName: string, unsubscriber: () => void): void {
    if (this.registeredHandlers.has(handlerName)) {
      console.log(
        `[HandlerRegistry] Cleaning up existing handler: ${handlerName}`
      );
      this.cleanup(handlerName);
    }
    this.registeredHandlers.add(handlerName);
    this.unsubscribers.set(handlerName, unsubscriber);
    this.registrationTimes.set(handlerName, Date.now());
  }

  cleanup(handlerName: string): void {
    const unsubscriber = this.unsubscribers.get(handlerName);
    if (unsubscriber) {
      try {
        unsubscriber();
        console.log(
          `[HandlerRegistry] Successfully cleaned up handler: ${handlerName}`
        );
      } catch (error) {
        console.error(
          `[HandlerRegistry] Error cleaning up handler ${handlerName}:`,
          error
        );
      }
      this.unsubscribers.delete(handlerName);
    }
    this.registeredHandlers.delete(handlerName);
    this.registrationTimes.delete(handlerName);
  }

  cleanupAll(): void {
    console.log(
      `[HandlerRegistry] Cleaning up all ${this.registeredHandlers.size} handlers`
    );
    for (const [handlerName, unsubscriber] of this.unsubscribers) {
      try {
        unsubscriber();
      } catch (error) {
        console.error(
          `[HandlerRegistry] Error cleaning up handler ${handlerName}:`,
          error
        );
      }
    }
    this.registeredHandlers.clear();
    this.unsubscribers.clear();
    this.registrationTimes.clear();
  }

  getRegisteredHandlers(): string[] {
    return Array.from(this.registeredHandlers);
  }

  getRegistrationInfo(): Array<{ name: string; registeredAt: number }> {
    return this.getRegisteredHandlers().map((name) => ({
      name,
      registeredAt: this.registrationTimes.get(name) || 0,
    }));
  }
}

// Global instance
const globalHandlerRegistry = new HandlerRegistry();

// Hot module replacement cleanup for development
if (typeof window !== "undefined" && (window as any).module?.hot) {
  (window as any).module.hot.dispose(() => {
    console.log("[HandlerRegistry] HMR dispose triggered");
    globalHandlerRegistry.cleanupAll();
  });
}

// Clean up on process exit for Electron
if (typeof process !== "undefined") {
  process.on("beforeExit", () => {
    console.log("[HandlerRegistry] Process beforeExit triggered");
    globalHandlerRegistry.cleanupAll();
  });
}

export { globalHandlerRegistry };
