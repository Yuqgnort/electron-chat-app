import { IUserRepo } from "@/core/domain/user/repo";
import { ChatDb } from "../init";

//////////////////////

export const createUserRepoIdb = (db: ChatDb): IUserRepo => {
  return {
    async findAll({ ignoreId } = {}) {
      if (ignoreId) {
        return await db.users.where("id").noneOf(ignoreId).toArray();
      }
      return await db.users.toArray();
    },
    async findById(id) {
      return (await db.users.get(id)) || null;
    },
    async findByUserName(username) {
      return (
        (await db.users.where("username").equals(username).first()) || null
      );
    },
  };
};
