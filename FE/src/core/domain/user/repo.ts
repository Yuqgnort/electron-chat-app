import { TID } from "../type";
import { IUserEntity } from "./entity";

export interface IUserRepo {
  getById(id: TID): Promise<IUserEntity | null>;
  getAll(params?: { ignoreId?: TID[] }): Promise<IUserEntity[] | null>;
  getByUserName(userName: IUserEntity["userName"]): Promise<IUserEntity | null>;
}
