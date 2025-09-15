import { IConvEntity } from "../conv/entity";
import { IMsgEntity } from "./entity";

export interface IMsgRepo {
  update(msg: IMsgEntity): Promise<IMsgEntity>;
  findById(id: IMsgEntity["id"]): Promise<IMsgEntity | null>;
  save(msg: Omit<IMsgEntity, "id">): Promise<IMsgEntity>;
  findByConversationId(
    conversationId: IConvEntity["id"]
  ): Promise<IMsgEntity[]>;
  findAll(): Promise<IMsgEntity[]>;
}
