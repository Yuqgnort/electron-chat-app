import { IUserEntity } from "@/core/domain/user/entity";
import { IUserRepo } from "@/core/domain/user/repo";

////////////////////

export async function getUserById(userRepo: IUserRepo, id: IUserEntity["id"]) {
  return userRepo.getById(id);
}

export async function getUserByUsername(
  userRepo: IUserRepo,
  username: IUserEntity["userName"]
) {
  return userRepo.getByUserName(username);
}

export async function getAllUsers(
  userRepo: IUserRepo,
  ignoreId?: IUserEntity["id"][]
) {
  return userRepo.getAll({ ignoreId });
}
