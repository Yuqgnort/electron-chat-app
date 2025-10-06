import { testRankingReturn } from "./test-rank-return";
import { runRankingTests } from "./ranking-tests";

/**
 * Expose ranking test functions to window object để có thể chạy từ browser console
 */
declare global {
  interface Window {
    rankingTest: {
      testReturn: () => Promise<void>;
      testHelpers: () => void;
      runAll: () => Promise<void>;
    };
  }
}

// Setup window functions
if (typeof window !== "undefined") {
  window.rankingTest = {
    // Test rank return trong search results
    testReturn: async () => {
      console.log("🧪 Running Rank Return Test...");
      try {
        await testRankingReturn();
        console.log("✅ Rank Return Test completed!");
      } catch (error) {
        console.error("❌ Test failed:", error);
      }
    },

    // Test helper functions
    testHelpers: () => {
      console.log("🧪 Running Helper Functions Test...");
      try {
        runRankingTests();
        console.log("✅ Helper Tests completed!");
      } catch (error) {
        console.error("❌ Test failed:", error);
      }
    },

    // Run all tests
    runAll: async () => {
      console.log("🧪 Running All Ranking Tests...");
      console.log("==========================================\n");

      try {
        // Test helper functions first
        console.log("1. Testing Helper Functions:");
        runRankingTests();

        console.log("\n2. Testing Rank Return:");
        await testRankingReturn();

        console.log("\n✅ All tests completed successfully!");
      } catch (error) {
        console.error("❌ Tests failed:", error);
      }
    },
  };

  console.log(`
🧪 Ranking Tests Available in Console:

📝 Commands:
  window.rankingTest.testReturn()  - Test rank values in search results
  window.rankingTest.testHelpers() - Test ranking helper functions  
  window.rankingTest.runAll()      - Run all tests

💡 Example:
  await window.rankingTest.testReturn()
  `);
}

export default window.rankingTest;
