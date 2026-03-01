import { TID } from "../type";
import { IConvEntity } from "./entity";

/////////////////

export interface IConvRepo {
  getConvById(id: TID): Promise<IConvEntity | null>;
  updateConv(conv: IConvEntity): Promise<IConvEntity | null>;
  getConvByUserIds(userIds: TID[]): Promise<IConvEntity | null>;
  createConv(conv: Omit<IConvEntity, "id">): Promise<IConvEntity | null>;
}
