import { TID } from "../type";
import { IPendingMsgEntity } from "./entity";

export interface IPendingMsgRepo {
  save(
    pendingMsg: Omit<IPendingMsgEntity, "id">
  ): Promise<IPendingMsgEntity | null>;
  update(pendingMsg: IPendingMsgEntity): Promise<IPendingMsgEntity | null>;
  getById(id: TID): Promise<IPendingMsgEntity | null>;
  getByLocalId(localId: string): Promise<IPendingMsgEntity | null>;
  getAll(): Promise<IPendingMsgEntity[]>;
  delete(id: TID): Promise<boolean>;
  deleteByLocalId(localId: string): Promise<boolean>;
  getByConversationId(conversationId: TID): Promise<IPendingMsgEntity[]>;
}
