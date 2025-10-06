import { testRankingReturn } from "./test-rank-return";

/**
 * Entry point để chạy ranking tests trong Electron app
 */
export const runRankingTestInApp = async () => {
  console.log("🚀 Starting Ranking Test in Electron App...\n");

  try {
    await testRankingReturn();
    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
  }
};

// Auto-run khi file được import (chỉ trong development)
if (process.env.NODE_ENV === "development") {
  // Delay để đảm bảo app đã load xong
  setTimeout(() => {
    runRankingTestInApp();
  }, 2000);
}
