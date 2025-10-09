import { TRankingColection } from "@/core/domain/search/entity";
import { TTimeStamp } from "@/core/domain/type";

/**
 * Convert TRankingCollection to SQL ranking expression
 */
export const buildRankingSQL = (
  ranking: TRankingColection,
  currentTime: TTimeStamp = Date.now()
): string => {
  const recencyWeight = ranking.recencyBoost.weight || 0.7;
  const conversationActivityWeight =
    ranking.conversationActivityBoost.weight || 0.3;

  // Calculate recency boost - more recent messages get higher scores
  const recencyBoostSQL = `
    (${recencyWeight} * CASE 
      WHEN (${currentTime} - CAST(f.createdAt AS INTEGER)) <= 0 THEN 1.0
      ELSE MAX(0.0, 1.0 - ((${currentTime} - CAST(f.createdAt AS INTEGER)) / (168.0 * 60 * 60 * 1000)))
    END)
  `;

  // Calculate conversation activity boost - more active conversations get higher scores
  const conversationActivityBoostSQL = `
    (${conversationActivityWeight} * CASE 
      WHEN cm.lastMessagesUpdateAt IS NULL THEN 0.0
      WHEN (${currentTime} - cm.lastMessagesUpdateAt) <= 0 THEN 1.0
      ELSE MAX(0.0, 1.0 - ((${currentTime} - cm.lastMessagesUpdateAt) / (168.0 * 60 * 60 * 1000)))
    END)
  `;

  return `(${recencyBoostSQL} + ${conversationActivityBoostSQL})`;
};

/**
 * Calculate recency boost for a given timestamp
 */
export const calculateRecencyBoost = (
  createdAt: TTimeStamp,
  currentTime: TTimeStamp = Date.now(),
  weight: number = 0.7
): number => {
  const ageInHours = (currentTime - createdAt) / (1000 * 60 * 60);
  const boost = Math.max(0, 1 - ageInHours / 168); // 168 hours = 1 week
  return weight * boost;
};

/**
 * Calculate conversation activity boost for a given timestamp
 */
export const calculateConversationActivityBoost = (
  lastMessagesUpdateAt: TTimeStamp,
  currentTime: TTimeStamp = Date.now(),
  weight: number = 0.3
): number => {
  const ageInHours = (currentTime - lastMessagesUpdateAt) / (1000 * 60 * 60);
  const boost = Math.max(0, 1 - ageInHours / 168); // 168 hours = 1 week
  return weight * boost;
};

/**
 * Calculate total ranking score
 */
export const calculateTotalRankingScore = (
  createdAt: TTimeStamp,
  lastMessagesUpdateAt: TTimeStamp,
  ranking: TRankingColection,
  currentTime: TTimeStamp = Date.now()
): number => {
  const recencyBoost = calculateRecencyBoost(
    createdAt,
    currentTime,
    ranking.recencyBoost.weight
  );

  const conversationActivityBoost = calculateConversationActivityBoost(
    lastMessagesUpdateAt,
    currentTime,
    ranking.conversationActivityBoost.weight
  );

  return recencyBoost + conversationActivityBoost;
};

/**
 * Build ORDER BY clause with ranking
 */
export const buildRankingOrderBySQL = (
  ranking: TRankingColection,
  fallbackOrder: string = "f.createdAt DESC"
): string => {
  const rankingSQL = buildRankingSQL(ranking);
  return `${rankingSQL} DESC, ${fallbackOrder}`;
};

/**
 * Build the JOIN clause for conversation metadata
 */
export const buildConversationMetadataJoinSQL = (): string => {
  return `
    LEFT JOIN conversation_metadata cm ON f.conversationId = cm.conversationId
  `;
};

/**
 * Build the SELECT clause with ranking score
 */
export const buildRankingSelectSQL = (
  ranking: TRankingColection,
  currentTime?: number
): string => {
  const rankingSQL = buildRankingSQL(ranking, currentTime);
  return `f.messageId, f.content, f.senderId, f.conversationId, f.createdAt, f.receiverId,
          ${rankingSQL} as rank, '' as highlight`;
};

/**
 * Validate ranking configuration
 */
export const validateRankingConfiguration = (
  ranking: TRankingColection
): boolean => {
  const recencyWeight = ranking.recencyBoost.weight || 0;
  const conversationActivityWeight =
    ranking.conversationActivityBoost.weight || 0;

  // Weights should be non-negative and sum should be reasonable
  return (
    recencyWeight >= 0 &&
    conversationActivityWeight >= 0 &&
    recencyWeight + conversationActivityWeight > 0
  );
};

/**
 * Create default ranking configuration if not provided
 */
export const ensureRankingConfiguration = (
  ranking?: TRankingColection
): TRankingColection => {
  if (!ranking) {
    return {
      recencyBoost: { weight: 0.7 },
      conversationActivityBoost: { weight: 0.3 },
    };
  }

  return {
    recencyBoost: {
      weight: ranking.recencyBoost.weight ?? 0.7,
      calFunction: ranking.recencyBoost.calFunction,
    },
    conversationActivityBoost: {
      weight: ranking.conversationActivityBoost.weight ?? 0.3,
      calFunction: ranking.conversationActivityBoost.calFunction,
    },
  };
};
