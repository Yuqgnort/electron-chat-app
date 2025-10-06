import { TID, TPaginationResult, TTimeStamp } from "../type";
import { IMsgEntity, TMsgDirection } from "./entity";

export interface IMsgRepo {
  update(msg: IMsgEntity): Promise<IMsgEntity | null>;
  getByLocalId(localId: IMsgEntity["localId"]): Promise<IMsgEntity | null>;
  getById(id: TID): Promise<IMsgEntity | null>;
  getByServerId(serverId: string): Promise<IMsgEntity | null>;
  save(msg: Omit<IMsgEntity, "id">): Promise<IMsgEntity | null>;
  getByConversationId(
    conversationId: TID,
    limit: number,
    direction: TMsgDirection,
    cursor: TTimeStamp | null
  ): Promise<TPaginationResult<IMsgEntity, TTimeStamp> | null>;
  getAll(): Promise<IMsgEntity[] | null>;
  countAll(): Promise<number | null>;
}
