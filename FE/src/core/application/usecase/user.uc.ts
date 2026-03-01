import { IUserEntity } from "@/core/domain/user/entity";
import { IUserRepo } from "@/core/domain/user/repo";
import { withErrorHandling } from "../error";

////////////////////

export const getUserById = withErrorHandling(
  (userRepo: IUserRepo, id: IUserEntity["id"]) => {
    return userRepo.getById(id);
  },
  "getUserById"
);

export const getUserByUsername = withErrorHandling(
  (userRepo: IUserRepo, username: IUserEntity["userName"]) => {
    return userRepo.getByUserName(username);
  },
  "getUserByUsername"
);

export const getAllUsers = withErrorHandling(
  (userRepo: IUserRepo, ignoreId?: IUserEntity["id"][]) => {
    return userRepo.getAll({ ignoreId });
  },
  "getAllUsers"
);
