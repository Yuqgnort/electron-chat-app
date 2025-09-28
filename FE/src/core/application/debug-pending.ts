import { IPendingMsgRepo } from "@/core/domain/pending-msg/repo";

export const debugPendingMessages = async (pendingMsgRepo: IPendingMsgRepo) => {
  try {
    const pendingMsgs = await pendingMsgRepo.getAll();
    console.log(`[Debug] Total pending messages: ${pendingMsgs?.length || 0}`);

    if (pendingMsgs && pendingMsgs.length > 0) {
      console.table(
        pendingMsgs.map((msg) => ({
          localId: msg.localId,
          content: msg.content.substring(0, 50) + "...",
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          createdAt: new Date(msg.createdAt).toLocaleTimeString(),
        }))
      );
    }

    return pendingMsgs;
  } catch (error) {
    console.error("[Debug] Failed to get pending messages:", error);
    return null;
  }
};

// Add to window for easy debugging
if (typeof window !== "undefined") {
  (window as any).debugPendingMessages = debugPendingMessages;
}
