import { IUserEntity } from "./entity";

export interface IUserRepo {
  findAll({
    ignoreId,
  }?: {
    ignoreId?: IUserEntity["id"][];
  }): Promise<IUserEntity[]>;
  findByUserName(userName: IUserEntity["userName"]): Promise<IUserEntity>;
  findById(id: IUserEntity["id"]): Promise<IUserEntity>;
}
