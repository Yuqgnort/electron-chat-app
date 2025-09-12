import { IUserRepo } from "@/core/domain/user/repo";
import { ChatDb } from "../init";

//////////////////////

export const createUserRepoIdb = (db: ChatDb): IUserRepo => {
  return {
    async findAll() {
      return await db.users.toArray();
    },
    async findById(id) {
      return await db.users.get(id);
    },
    async findByUserName(username) {
      return await db.users.where("username").equals(username).first();
    },
  };
};
