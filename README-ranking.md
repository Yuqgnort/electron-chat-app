# SQLite Ranking Implementation cho Chat Search

Tài liệu này mô tả cách implement ranking vào SQLite dựa trên thuật toán tính toán của search entity.

## Tổng quan

Ranking system được thiết kế để cải thiện chất lượng kết quả search bằng cách tính toán điểm số dựa trên:

1. **Recency Boost** - Tin nhắn mới sẽ có điểm cao hơn
2. **Conversation Activity Boost** - Tin nhắn từ conversation hoạt động gần đây sẽ có điểm cao hơn

## Cấu trúc Database

### 1. FTS Table (fts_index_global)

```sql
CREATE VIRTUAL TABLE fts_index_global USING fts5(
  messageId UNINDEXED,
  conversationId UNINDEXED,
  senderId UNINDEXED,
  receiverId UNINDEXED,
  content,
  createdAt UNINDEXED,
  tokenize = 'unicode61 remove_diacritics 2',
  prefix = 1,
  prefix = 2,
  prefix = 3
);
```

### 2. Conversation Metadata Table

```sql
CREATE TABLE conversation_metadata (
  conversationId TEXT PRIMARY KEY,
  lastMessagesUpdateAt INTEGER NOT NULL,
  messageCount INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

## Thuật toán Ranking

### Formula chính:

```
Total Rank = (Recency Weight × Recency Score) + (Activity Weight × Activity Score)
```

### Recency Score Calculation:

```javascript
const ageInHours = (currentTime - messageCreatedAt) / (1000 * 60 * 60);
const recencyScore = Math.max(0, 1 - ageInHours / 168); // 168 hours = 1 week
```

### Activity Score Calculation:

```javascript
const ageInHours = (currentTime - lastConversationUpdate) / (1000 * 60 * 60);
const activityScore = Math.max(0, 1 - ageInHours / 168); // 168 hours = 1 week
```

### SQL Implementation:

```sql
SELECT
  f.messageId, f.content, f.senderId, f.conversationId, f.createdAt, f.receiverId,
  (
    (0.7 * CASE
      WHEN (1640995200000 - CAST(f.createdAt AS INTEGER)) <= 0 THEN 1.0
      ELSE MAX(0.0, 1.0 - ((1640995200000 - CAST(f.createdAt AS INTEGER)) / (168.0 * 60 * 60 * 1000)))
    END) +
    (0.3 * CASE
      WHEN cm.lastMessagesUpdateAt IS NULL THEN 0.0
      WHEN (1640995200000 - cm.lastMessagesUpdateAt) <= 0 THEN 1.0
      ELSE MAX(0.0, 1.0 - ((1640995200000 - cm.lastMessagesUpdateAt) / (168.0 * 60 * 60 * 1000)))
    END)
  ) as rank,
  '' as highlight
FROM fts_index_global f
LEFT JOIN conversation_metadata cm ON f.conversationId = cm.conversationId
WHERE f.fts_index_global MATCH 'search_query*'
ORDER BY rank DESC, f.createdAt DESC;
```

## Cách sử dụng

### 1. Tạo Ranking Configuration

```typescript
import { createRankingColection } from "@/core/domain/search/entity";

// Default configuration
const ranking = createRankingColection();

// Custom configuration
const customRanking = createRankingColection({
  recencyBoost: {
    weight: 0.8, // 80% weight cho recency
  },
  conversationActivityBoost: {
    weight: 0.2, // 20% weight cho activity
  },
});
```

### 2. Thực hiện Search với Ranking

```typescript
import { createSearchQuery, ESearchType } from "@/core/domain/search/entity";

const searchQuery = createSearchQuery({
  query: "hello world",
  currentUserId: "user123",
  limit: 10,
  type: ESearchType.FULL_TEXT,
});

const results = await searchRepo.search(searchQuery, ranking);
```

### 3. Indexing Messages với Metadata Update

```typescript
// Single message indexing
await searchRepo.indexMessage({
  messageId: "msg123",
  content: "Hello world",
  senderId: "user123",
  conversationId: "conv456",
  createdAt: Date.now(),
  receiverId: "user789",
});

// Bulk indexing (recommended for performance)
await searchRepo.bulkIndexMessages(messages);
```

## Advanced Features

### 1. Custom Ranking Functions

```typescript
const advancedRanking = createRankingColection({
  recencyBoost: {
    weight: 0.6,
    calFunction: (createdAt: TTimeStamp) => {
      // Custom decay function (30 days instead of 7)
      const ageInDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
      return Math.max(0, 1 - ageInDays / 30);
    },
  },
  conversationActivityBoost: {
    weight: 0.4,
    calFunction: (lastUpdate: TTimeStamp) => {
      // Exponential decay
      const ageInHours = (Date.now() - lastUpdate) / (1000 * 60 * 60);
      return Math.exp(-ageInHours / 48); // 48 hours half-life
    },
  },
});
```

### 2. Conversation Metadata Management

```typescript
// Get conversation metadata
const metadata = await searchRepo.getConversationMetadata("conv123");

// Cleanup orphaned metadata
await searchRepo.cleanupConversationMetadata();

// Manual metadata update
await searchRepo.updateConversationMetadata("conv123", Date.now());
```

### 3. Performance Optimization

```typescript
// Optimize FTS index
await searchRepo.optimizeIndex();

// Validate index integrity
const isValid = await searchRepo.validateIndex();
```

## Performance Considerations

### 1. Index Management

- FTS index với multiple prefix sizes (1, 2, 3) để support partial matching
- Conversation metadata có dedicated indexes cho performance
- Regular optimization để maintain query speed

### 2. Bulk Operations

- `bulkIndexMessages()` groups metadata updates by conversation
- Reduces database transactions and improves performance
- Recommended cho initial data load hoặc large imports

### 3. Query Optimization

- LEFT JOIN với conversation metadata để avoid missing data
- Proper use of table aliases (f, cm)
- Efficient ORDER BY với ranking score trước, fallback về createdAt

## Troubleshooting

### Common Issues:

1. **Missing ranking scores**: Ensure conversation metadata được properly maintained
2. **Poor performance**: Run `optimizeIndex()` regularly
3. **Inconsistent results**: Check index validity với `validateIndex()`
4. **Memory issues**: Use `cleanupConversationMetadata()` để remove orphaned data

### Debug Queries:

```sql
-- Check conversation metadata coverage
SELECT
  COUNT(DISTINCT f.conversationId) as total_conversations,
  COUNT(DISTINCT cm.conversationId) as conversations_with_metadata
FROM fts_index_global f
LEFT JOIN conversation_metadata cm ON f.conversationId = cm.conversationId;

-- View ranking scores for specific query
SELECT
  f.messageId, f.content,
  (ranking_formula) as rank,
  f.createdAt, cm.lastMessagesUpdateAt
FROM fts_index_global f
LEFT JOIN conversation_metadata cm ON f.conversationId = cm.conversationId
WHERE f.fts_index_global MATCH 'your_query*'
ORDER BY rank DESC
LIMIT 10;
```
