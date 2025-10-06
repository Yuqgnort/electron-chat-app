#!/usr/bin/env node

/**
 * Standalone Node.js script to run ranking tests
 * Run: node run-ranking-test-node.js
 */

// Mock browser APIs for Node.js environment
const mockWindow = {
  Worker: class MockWorker {
    constructor() {}
    postMessage() {}
    onmessage() {}
    terminate() {}
  },
  URL: class MockURL {
    constructor(url) {
      this.href = url;
    }
  },
};

// Mock navigator for SQLite
const mockNavigator = {
  storage: {
    getDirectory: async () => ({
      removeEntry: async () => {},
    }),
  },
};

global.window = mockWindow;
global.navigator = mockNavigator;
global.self = mockWindow;

// Import and run tests
import("../examples/ranking-tests.js")
  .then(({ runRankingTests }) => {
    console.log("🧪 Running Ranking Helper Tests in Node.js");
    console.log("===========================================\n");

    try {
      runRankingTests();
      console.log("\n✅ All tests passed!");
      process.exit(0);
    } catch (error) {
      console.error("\n❌ Tests failed:", error);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("Failed to import tests:", error);
    process.exit(1);
  });
