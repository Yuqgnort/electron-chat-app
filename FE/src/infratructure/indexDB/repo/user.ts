import { IUserRepo } from "@/core/domain/user/repo";
import { ChatDb } from "../init";

//////////////////////

export const createUserRepoIdb = (db: ChatDb): IUserRepo => {
  return {
    async findAll() {
      return await db.users.toArray();
    },
    async findById(id) {
      const user = await db.users.get(id);
      return user ?? null;
    },
    async findByUserName(username) {
      const user = await db.users.where("username").equals(username).first();
      return user ?? null;
    },
  };
};
