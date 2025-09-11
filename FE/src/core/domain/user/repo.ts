import { IUserEntity } from "./entity";

export interface IUserRepo {
  findAll(): Promise<IUserEntity[]>;
  findByUserName(
    userName: IUserEntity["userName"]
  ): Promise<IUserEntity | null>;
  findById(id: IUserEntity["id"]): Promise<IUserEntity | null>;
}
