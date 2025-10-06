import {
  buildRankingSQL,
  calculateRecencyBoost,
  calculateConversationActivityBoost,
  calculateTotalRankingScore,
  buildRankingOrderBySQL,
  validateRankingConfiguration,
  ensureRankingConfiguration,
} from "../../infratructure/sqlite/ranking-helper";
import {
  createRankingColection,
  TRankingColection,
} from "../../core/domain/search/entity";

/**
 * Test suite for ranking helper functions
 */
export class RankingHelperTests {
  /**
   * Test basic ranking SQL generation
   */
  testBuildRankingSQL() {
    console.log("Testing buildRankingSQL...");

    const ranking = createRankingColection();
    const currentTime = Date.now();
    const sql = buildRankingSQL(ranking, currentTime);

    console.log("Generated SQL:", sql);

    // Verify SQL contains expected components
    const expectedComponents = [
      "0.7", // recency weight
      "0.3", // conversation activity weight
      "f.createdAt",
      "cm.lastMessagesUpdateAt",
      "MAX(0.0",
      "168.0 * 60 * 60 * 1000", // week in milliseconds
    ];

    expectedComponents.forEach((component) => {
      if (!sql.includes(component)) {
        throw new Error(`Missing expected component: ${component}`);
      }
    });

    console.log("✓ buildRankingSQL test passed");
  }

  /**
   * Test recency boost calculation
   */
  testCalculateRecencyBoost() {
    console.log("Testing calculateRecencyBoost...");

    const currentTime = Date.now();
    const weight = 0.7;

    // Test recent message (1 hour ago)
    const recentMessage = currentTime - 1 * 60 * 60 * 1000;
    const recentBoost = calculateRecencyBoost(
      recentMessage,
      currentTime,
      weight
    );
    console.log("Recent message boost:", recentBoost);

    // Should be close to weight (high score)
    if (recentBoost < weight * 0.99) {
      throw new Error("Recent message should have high boost score");
    }

    // Test old message (1 week ago)
    const oldMessage = currentTime - 7 * 24 * 60 * 60 * 1000;
    const oldBoost = calculateRecencyBoost(oldMessage, currentTime, weight);
    console.log("Old message boost:", oldBoost);

    // Should be close to 0
    if (oldBoost > 0.01) {
      throw new Error("Old message should have low boost score");
    }

    // Test very old message (2 weeks ago)
    const veryOldMessage = currentTime - 14 * 24 * 60 * 60 * 1000;
    const veryOldBoost = calculateRecencyBoost(
      veryOldMessage,
      currentTime,
      weight
    );
    console.log("Very old message boost:", veryOldBoost);

    // Should be 0
    if (veryOldBoost !== 0) {
      throw new Error("Very old message should have zero boost score");
    }

    console.log("✓ calculateRecencyBoost test passed");
  }

  /**
   * Test conversation activity boost calculation
   */
  testCalculateConversationActivityBoost() {
    console.log("Testing calculateConversationActivityBoost...");

    const currentTime = Date.now();
    const weight = 0.3;

    // Test active conversation (30 minutes ago)
    const activeConv = currentTime - 30 * 60 * 1000;
    const activeBoost = calculateConversationActivityBoost(
      activeConv,
      currentTime,
      weight
    );
    console.log("Active conversation boost:", activeBoost);

    // Should be close to weight
    if (activeBoost < weight * 0.99) {
      throw new Error("Active conversation should have high boost score");
    }

    // Test inactive conversation (1 week ago)
    const inactiveConv = currentTime - 7 * 24 * 60 * 60 * 1000;
    const inactiveBoost = calculateConversationActivityBoost(
      inactiveConv,
      currentTime,
      weight
    );
    console.log("Inactive conversation boost:", inactiveBoost);

    // Should be close to 0
    if (inactiveBoost > 0.01) {
      throw new Error("Inactive conversation should have low boost score");
    }

    console.log("✓ calculateConversationActivityBoost test passed");
  }

  /**
   * Test total ranking score calculation
   */
  testCalculateTotalRankingScore() {
    console.log("Testing calculateTotalRankingScore...");

    const currentTime = Date.now();
    const ranking = createRankingColection();

    // Test recent message in active conversation
    const recentMessageTime = currentTime - 1 * 60 * 60 * 1000; // 1 hour ago
    const activeConvTime = currentTime - 30 * 60 * 1000; // 30 min ago

    const highScore = calculateTotalRankingScore(
      recentMessageTime,
      activeConvTime,
      ranking,
      currentTime
    );

    console.log("High score (recent + active):", highScore);

    // Should be close to 1.0 (both components high)
    if (highScore < 0.9) {
      throw new Error(
        "Recent message in active conversation should have high score"
      );
    }

    // Test old message in inactive conversation
    const oldMessageTime = currentTime - 7 * 24 * 60 * 60 * 1000; // 1 week ago
    const inactiveConvTime = currentTime - 7 * 24 * 60 * 60 * 1000; // 1 week ago

    const lowScore = calculateTotalRankingScore(
      oldMessageTime,
      inactiveConvTime,
      ranking,
      currentTime
    );

    console.log("Low score (old + inactive):", lowScore);

    // Should be close to 0
    if (lowScore > 0.1) {
      throw new Error(
        "Old message in inactive conversation should have low score"
      );
    }

    console.log("✓ calculateTotalRankingScore test passed");
  }

  /**
   * Test ranking configuration validation
   */
  testValidateRankingConfiguration() {
    console.log("Testing validateRankingConfiguration...");

    // Valid configuration
    const validRanking: TRankingColection = {
      recencyBoost: { weight: 0.7 },
      conversationActivityBoost: { weight: 0.3 },
    };

    if (!validateRankingConfiguration(validRanking)) {
      throw new Error("Valid ranking configuration should pass validation");
    }

    // Invalid configuration (negative weight)
    const invalidRanking: TRankingColection = {
      recencyBoost: { weight: -0.1 },
      conversationActivityBoost: { weight: 0.3 },
    };

    if (validateRankingConfiguration(invalidRanking)) {
      throw new Error("Invalid ranking configuration should fail validation");
    }

    // Invalid configuration (zero total weight)
    const zeroWeightRanking: TRankingColection = {
      recencyBoost: { weight: 0 },
      conversationActivityBoost: { weight: 0 },
    };

    if (validateRankingConfiguration(zeroWeightRanking)) {
      throw new Error(
        "Zero weight ranking configuration should fail validation"
      );
    }

    console.log("✓ validateRankingConfiguration test passed");
  }

  /**
   * Test ensuring ranking configuration defaults
   */
  testEnsureRankingConfiguration() {
    console.log("Testing ensureRankingConfiguration...");

    // Test with undefined
    const defaultRanking = ensureRankingConfiguration();
    if (
      defaultRanking.recencyBoost.weight !== 0.7 ||
      defaultRanking.conversationActivityBoost.weight !== 0.3
    ) {
      throw new Error(
        "Default ranking configuration should have expected weights"
      );
    }

    // Test with partial configuration
    const partialRanking = ensureRankingConfiguration({
      recencyBoost: { weight: 0.8 },
      conversationActivityBoost: {}, // Missing weight
    } as any);

    if (
      partialRanking.recencyBoost.weight !== 0.8 ||
      partialRanking.conversationActivityBoost.weight !== 0.3
    ) {
      throw new Error(
        "Partial ranking configuration should be filled with defaults"
      );
    }

    console.log("✓ ensureRankingConfiguration test passed");
  }

  /**
   * Test ORDER BY SQL generation
   */
  testBuildRankingOrderBySQL() {
    console.log("Testing buildRankingOrderBySQL...");

    const ranking = createRankingColection();
    const orderBySQL = buildRankingOrderBySQL(ranking, "f.createdAt DESC");

    console.log("Generated ORDER BY SQL:", orderBySQL);

    // Should contain ranking calculation and fallback
    if (!orderBySQL.includes("DESC") || !orderBySQL.includes("f.createdAt")) {
      throw new Error("ORDER BY SQL should contain ranking and fallback");
    }

    console.log("✓ buildRankingOrderBySQL test passed");
  }

  /**
   * Run all tests
   */
  runAllTests() {
    console.log("=== Running Ranking Helper Tests ===\n");

    try {
      this.testBuildRankingSQL();
      this.testCalculateRecencyBoost();
      this.testCalculateConversationActivityBoost();
      this.testCalculateTotalRankingScore();
      this.testValidateRankingConfiguration();
      this.testEnsureRankingConfiguration();
      this.testBuildRankingOrderBySQL();

      console.log("\n✅ All ranking helper tests passed!");
    } catch (error) {
      console.error("\n❌ Test failed:", error);
      throw error;
    }
  }

  /**
   * Performance test for ranking calculations
   */
  performanceTest() {
    console.log("=== Running Performance Tests ===\n");

    const ranking = createRankingColection();
    const currentTime = Date.now();
    const iterations = 10000;

    // Test recency boost calculation performance
    console.time("Recency boost calculation");
    for (let i = 0; i < iterations; i++) {
      const messageTime = currentTime - Math.random() * 7 * 24 * 60 * 60 * 1000;
      calculateRecencyBoost(messageTime, currentTime, 0.7);
    }
    console.timeEnd("Recency boost calculation");

    // Test total ranking calculation performance
    console.time("Total ranking calculation");
    for (let i = 0; i < iterations; i++) {
      const messageTime = currentTime - Math.random() * 7 * 24 * 60 * 60 * 1000;
      const convTime = currentTime - Math.random() * 7 * 24 * 60 * 60 * 1000;
      calculateTotalRankingScore(messageTime, convTime, ranking, currentTime);
    }
    console.timeEnd("Total ranking calculation");

    // Test SQL generation performance
    console.time("SQL generation");
    for (let i = 0; i < iterations; i++) {
      buildRankingSQL(ranking, currentTime);
    }
    console.timeEnd("SQL generation");

    console.log("✅ Performance tests completed");
  }
}

// Export function to run tests
export const runRankingTests = () => {
  const tests = new RankingHelperTests();
  tests.runAllTests();
  tests.performanceTest();
};
