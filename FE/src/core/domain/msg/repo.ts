import { TID, TPaginationResult, TTimeStamp } from "../type";
import { IMsgEntity, TMsgDirection } from "./entity";

export interface IMsgRepo {
  update(msg: IMsgEntity): Promise<IMsgEntity | null>;
  updateByLocalId(
    localId: IMsgEntity["localId"],
    updateFields: Partial<Omit<IMsgEntity, "id">>
  ): Promise<IMsgEntity | null>;
  findById(id: TID): Promise<IMsgEntity | null>;
  save(msg: Omit<IMsgEntity, "id">): Promise<IMsgEntity | null>;
  findByConversationId(
    conversationId: TID,
    limit: number,
    direction: TMsgDirection,
    cursor: TTimeStamp | null
  ): Promise<TPaginationResult<IMsgEntity, TTimeStamp> | null>;
  findAll(): Promise<IMsgEntity[] | null>;
}
