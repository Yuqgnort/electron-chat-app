import { updateLastMessageId } from "@/core/domain/conv/entity";
import { IConvRepo } from "@/core/domain/conv/repo";
import { EMsgStatus, IMsgEntity } from "@/core/domain/msg/entity";
import { createNormalizeSearchString } from "@/core/domain/search/entity";
import { ISearchRepository } from "@/core/domain/search/repo";
import { ChatDb } from "@/infratructure/indexDB/init";
import { topic1, topic2 } from ".";
import { TTimeStamp } from "@/core/domain/type";

export async function bulkInsertTestMessages(
  db: ChatDb,
  searchRepo: ISearchRepository,
  convRepo: IConvRepo,
  contentArray: string[] = [],
  conversationId = "test-conv-1",
  senderId = "1-alice",
  receiverId = "2-bob",
  startTime?: TTimeStamp
): Promise<IMsgEntity[]> {
  const total = contentArray.length;

  const createdAt = startTime || Date.now();

  console.log(`Starting bulk insert of ${total} messages...`);
  if (total === 0) return [];
  const createdMessages: IMsgEntity[] = [];
  const messages: IMsgEntity[] = new Array(total);
  for (let i = 0; i < total; i++) {
    messages[i] = {
      id: crypto.randomUUID(),
      localId: crypto.randomUUID(),
      serverId: crypto.randomUUID(),
      senderId,
      receiverId,
      conversationId,
      content: `Message ${i + 1}: ${contentArray[i]}`,
      createdAt: createdAt + i,
      status: EMsgStatus.DELIVERED,
    };
  }
  try {
    await db.messages.bulkAdd(messages);
  } catch (err) {
    console.error("Bulk insert failed:", err);
  }
  try {
    const searchIndexData = messages.map((msg) => ({
      messageId: msg.id,
      conversationId: msg.conversationId,
      createdAt: msg.createdAt,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      content: createNormalizeSearchString(msg.content),
    }));
    await searchRepo.bulkIndexMessages(searchIndexData);
  } catch (err) {
    console.error("Bulk indexing failed:", err);
  }
  createdMessages.push(...messages);
  if (createdMessages.length > 0) {
    const latest = createdMessages.reduce((a, b) =>
      a.createdAt > b.createdAt ? a : b
    );
    const conv = await convRepo.getConvById(conversationId);
    if (conv) {
      const updated = updateLastMessageId(conv, latest.id);
      await convRepo.updateConv(updated);
      console.log(`✅ Updated conversation ${conversationId}`);
    }
  }
  console.log(`✅ Done inserting ${createdMessages.length} messages`);
  window.location.reload();
  return createdMessages;
}

export async function insertCustomTestMessages(
  db: ChatDb,
  searchRepo: ISearchRepository,
  convRepo: IConvRepo,
  conversationId: string,
  senderId: string,
  receiverId: string,
  messageCount: number = 1000,
  startIndex: number = 0,
  startTime?: TTimeStamp
): Promise<IMsgEntity[]> {
  const allContents = [...(topic1 as string[]), ...(topic2 as string[])];
  const selectedContents = allContents.slice(
    startIndex,
    startIndex + messageCount
  );

  return bulkInsertTestMessages(
    db,
    searchRepo,
    convRepo,
    selectedContents,
    conversationId,
    senderId,
    receiverId,
    startTime
  );
}
