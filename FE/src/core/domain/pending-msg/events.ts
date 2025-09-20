import { IPendingMsgEntity } from "./entity";

export type TPendingMsgEvents =
  | { type: "PendingMsgCreated"; payload: IPendingMsgEntity }
  | { type: "PendingMsgRetried"; payload: IPendingMsgEntity }
  | { type: "PendingMsgRemoved"; payload: { localId: string } };
