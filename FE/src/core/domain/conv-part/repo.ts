import { TID } from "../type";
import { IConvPartEntity } from "./entity";

/////////////////

export interface IConvPartRepo {
  createConvPart(
    convPart: Omit<IConvPartEntity, "id">
  ): Promise<IConvPartEntity | null>;
  getConvPartById(id: TID): Promise<IConvPartEntity | null>;
  getConvPartsByConvId(convId: TID): Promise<IConvPartEntity[] | null>;
  getConvPartsByUserId(userId: TID): Promise<IConvPartEntity[] | null>;
}
