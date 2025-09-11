import { IUserEntity } from "@/core/domain/user/entity";
import { IUserRepo } from "@/core/domain/user/repo";

////////////////////

export async function getUserById(
  userRepo: IUserRepo,
  id: IUserEntity["id"]
): Promise<IUserEntity | null> {
  return userRepo.findById(id);
}

export async function getUserByUsername(
  userRepo: IUserRepo,
  username: IUserEntity["userName"]
): Promise<IUserEntity | null> {
  return userRepo.findByUserName(username);
}

export async function getAllUsers(userRepo: IUserRepo): Promise<IUserEntity[]> {
  return userRepo.findAll();
}
