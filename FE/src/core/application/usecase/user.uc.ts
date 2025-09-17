import { IUserEntity } from "@/core/domain/user/entity";
import { IUserRepo } from "@/core/domain/user/repo";

////////////////////

export async function getUserById(userRepo: IUserRepo, id: IUserEntity["id"]) {
  return userRepo.findById(id);
}

export async function getUserByUsername(
  userRepo: IUserRepo,
  username: IUserEntity["userName"]
) {
  return userRepo.findByUserName(username);
}

export async function getAllUsers(
  userRepo: IUserRepo,
  ignoreId?: IUserEntity["id"][]
) {
  return userRepo.findAll({ ignoreId });
}
