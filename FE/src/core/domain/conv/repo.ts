import { IUserEntity } from "../user/entity";
import { IConvEntity } from "./entity";

/////////////////

export interface IConvRepo {
  updateConv(conv: IConvEntity): Promise<IConvEntity>;
  createConv(conv: Omit<IConvEntity, "id">): Promise<IConvEntity>;
  getConvById(id: IConvEntity["id"]): Promise<IConvEntity | null>;
  getConvsByUserId(userId: IUserEntity["id"]): Promise<IConvEntity[]>;
}
