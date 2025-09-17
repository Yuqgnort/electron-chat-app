import { TID } from "../type";
import { IUserEntity } from "./entity";

export interface IUserRepo {
  findById(id: TID): Promise<IUserEntity | null>;
  findAll({ ignoreId }?: { ignoreId?: TID[] }): Promise<IUserEntity[] | null>;
  findByUserName(
    userName: IUserEntity["userName"]
  ): Promise<IUserEntity | null>;
}
