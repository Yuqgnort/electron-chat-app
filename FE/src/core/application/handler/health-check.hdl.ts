import { IMsgRepo } from "@/core/domain/msg/repo";
import { ISearchRepository } from "@/core/domain/search/repo";
import { withErrorHandling } from "../error";
import { indexExistingMessages } from "./msg.hdl";

// Handler 1: Startup Health Check & Rebuild
export const startupHealthCheckHandler = withErrorHandling(
  async (msgRepo: IMsgRepo, searchRepo: ISearchRepository): Promise<void> => {
    console.log("🔍 Startup: Checking search index health...");

    try {
      // Get counts
      const messagesCount = (await msgRepo.countAll()) || 0;
      const ftsCount = await searchRepo.getIndexedMessageCount();

      if (messagesCount === ftsCount) {
        console.log(
          `✅ Search index healthy: ${messagesCount} messages indexed`
        );
        return;
      }

      // Mismatch detected - rebuild
      const difference = Math.abs(messagesCount - ftsCount);
      console.log(
        `⚠️ Index mismatch detected: ${messagesCount} messages vs ${ftsCount} indexed (diff: ${difference})`
      );
      console.log("🔧 Rebuilding search index...");

      await indexExistingMessages(msgRepo, searchRepo);

      // Verify rebuild
      const newFtsCount = await searchRepo.getIndexedMessageCount();
      if (messagesCount === newFtsCount) {
        console.log(`✅ Rebuild successful: ${newFtsCount} messages indexed`);
      } else {
        console.warn(
          `⚠️ Rebuild incomplete: ${messagesCount} messages vs ${newFtsCount} indexed`
        );
      }
    } catch (error) {
      console.error("❌ Startup health check failed:", error);
      // Continue app startup even if health check fails
    }
  },
  "startupHealthCheckHandler"
);

// Handler 2: Periodic Health Check & Rebuild
export const periodicHealthCheckHandler = (
  msgRepo: IMsgRepo,
  searchRepo: ISearchRepository
) => {
  let intervalId: NodeJS.Timeout | null = null;

  const start = () => {
    console.log("📊 Starting periodic health check (every 30 minutes)");

    // Run check every 30 minutes
    intervalId = setInterval(
      async () => {
        await performPeriodicCheck();
      },
      30 * 60 * 1000
    );

    // Run first check after 5 minutes to avoid startup interference
    setTimeout(
      async () => {
        await performPeriodicCheck();
      },
      5 * 60 * 1000
    );
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      console.log("🛑 Periodic health check stopped");
    }
  };

  const performPeriodicCheck = withErrorHandling(async (): Promise<void> => {
    console.log("⏰ Periodic health check started...");

    try {
      // Get counts
      const messagesCount = (await msgRepo.countAll()) || 0;
      const ftsCount = await searchRepo.getIndexedMessageCount();

      if (messagesCount === ftsCount) {
        console.log(
          `✅ Periodic check passed: ${messagesCount} messages in sync`
        );
        return;
      }

      // Mismatch detected - rebuild
      const difference = Math.abs(messagesCount - ftsCount);
      console.log(
        `🔧 Periodic rebuild needed: ${messagesCount} messages vs ${ftsCount} indexed (diff: ${difference})`
      );

      await indexExistingMessages(msgRepo, searchRepo);

      // Verify rebuild
      const newFtsCount = await searchRepo.getIndexedMessageCount();
      if (messagesCount === newFtsCount) {
        console.log(
          `✅ Periodic rebuild successful: ${newFtsCount} messages indexed`
        );
      } else {
        console.warn(
          `⚠️ Periodic rebuild incomplete: ${messagesCount} messages vs ${newFtsCount} indexed`
        );
      }
    } catch (error) {
      console.error("❌ Periodic health check failed:", error);
    }
  }, "performPeriodicCheck");

  return { start, stop };
};
