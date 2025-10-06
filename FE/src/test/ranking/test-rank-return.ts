import { createSearchRepoSQLite } from "../../infratructure/sqlite/repos/search.repo";
import { SQLiteWorkerDB } from "../../infratructure/sqlite/init";
import {
  createRankingColection,
  createSearchQuery,
  ESearchType,
  ISearchQuery,
} from "../../core/domain/search/entity";

/**
 * Quick test để verify rank được trả về trong search results
 */
export const testRankingReturn = async () => {
  console.log("=== Testing Rank Return in Search Results ===\n");

  const db = new SQLiteWorkerDB();
  const searchRepo = createSearchRepoSQLite(db);

  try {
    // Initialize database
    await searchRepo.init();
    console.log("✓ Database initialized");

    // Index some test messages
    const testMessages = [
      {
        messageId: "msg1",
        content: "hello world test message",
        senderId: "user1",
        conversationId: "conv1",
        createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        receiverId: "user2",
      },
      {
        messageId: "msg2",
        content: "another hello message here",
        senderId: "user2",
        conversationId: "conv1",
        createdAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
        receiverId: "user1",
      },
      {
        messageId: "msg3",
        content: "hello from old conversation",
        senderId: "user3",
        conversationId: "conv2",
        createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
        receiverId: "user1",
      },
    ];

    // Bulk index messages
    await searchRepo.bulkIndexMessages(testMessages);
    console.log("✓ Test messages indexed");

    // Create ranking configuration
    const ranking = createRankingColection({
      recencyBoost: { weight: 0.7 },
      conversationActivityBoost: { weight: 0.3 },
    });

    // Search for "hello"
    const searchQuery = createSearchQuery({
      query: "hello",
      currentUserId: "user1",
      limit: 10,
      type: ESearchType.FULL_TEXT,
    });

    const results = await searchRepo.search(searchQuery, ranking);

    console.log("Search Results:");
    console.log("===============");
    console.log(`Found ${results.totalFound} results`);
    console.log(`Execution time: ${results.executionTime}ms`);
    console.log("");

    // Display results with rank
    results.items.forEach((item, index) => {
      console.log(`Result ${index + 1}:`);
      console.log(`  MessageId: ${item.messageId}`);
      console.log(`  Content: "${item.content}"`);
      console.log(`  ConversationId: ${item.conversationId}`);
      console.log(`  CreatedAt: ${new Date(item.createdAt).toISOString()}`);
      console.log(`  🏆 RANK: ${item.rank?.toFixed(4) || "undefined"}`);
      console.log(
        `  Age: ${Math.round((Date.now() - item.createdAt) / (60 * 60 * 1000))}h ago`
      );
      console.log("");
    });

    // Verify rank values
    console.log("Rank Analysis:");
    console.log("==============");

    const rankedItems = results.items.filter((item) => item.rank !== undefined);

    if (rankedItems.length === 0) {
      console.log("❌ NO RANK VALUES FOUND!");
      return;
    }

    console.log(
      `✓ ${rankedItems.length}/${results.items.length} items have rank values`
    );

    // Check if items are properly sorted by rank
    const sortedByRank = [...rankedItems].sort(
      (a, b) => (b.rank || 0) - (a.rank || 0)
    );
    const isRankSorted =
      JSON.stringify(rankedItems) === JSON.stringify(sortedByRank);

    console.log(`✓ Items sorted by rank: ${isRankSorted ? "YES" : "NO"}`);

    // Show rank distribution
    const rankValues = rankedItems.map((item) => item.rank || 0);
    const minRank = Math.min(...rankValues);
    const maxRank = Math.max(...rankValues);
    const avgRank = rankValues.reduce((a, b) => a + b, 0) / rankValues.length;

    console.log(`  Min rank: ${minRank.toFixed(4)}`);
    console.log(`  Max rank: ${maxRank.toFixed(4)}`);
    console.log(`  Avg rank: ${avgRank.toFixed(4)}`);

    // Test conversation metadata
    console.log("\nConversation Metadata:");
    console.log("=====================");

    for (const convId of ["conv1", "conv2"]) {
      const metadata = await searchRepo.getConversationMetadata(convId);
      if (metadata) {
        console.log(`${convId}:`);
        console.log(
          `  Last update: ${new Date(metadata.lastMessagesUpdateAt).toISOString()}`
        );
        console.log(`  Message count: ${metadata.messageCount}`);
        console.log(
          `  Age: ${Math.round((Date.now() - metadata.lastMessagesUpdateAt) / (60 * 60 * 1000))}h ago`
        );
      } else {
        console.log(`${convId}: No metadata found`);
      }
    }

    console.log("\n✅ Rank testing completed successfully!");
  } catch (error) {
    console.error("❌ Error during rank testing:", error);
    throw error;
  }
};

// Export để có thể call từ nơi khác
export default testRankingReturn;
