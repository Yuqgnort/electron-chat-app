import { IConvEntity } from "../conv/entity";
import { IUserEntity } from "../user/entity";
import { IConvPartEntity } from "./entity";

/////////////////

export interface IConvPartRepo {
  createConvPart(
    convPart: Omit<IConvPartEntity, "id">
  ): Promise<IConvPartEntity>;
  getConvPartById(id: IConvPartEntity["id"]): Promise<IConvPartEntity | null>;
  getConvPartsByConvId(convId: IConvEntity["id"]): Promise<IConvPartEntity[]>;
  getConvPartsByUserId(userId: IUserEntity["id"]): Promise<IConvPartEntity[]>;
}
