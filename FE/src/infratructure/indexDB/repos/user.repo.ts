import { IUserRepo } from "@/core/domain/user/repo";
import { ChatDb } from "../init";

//////////////////////

export const createUserRepoIdb = (db: ChatDb): IUserRepo => {
  return {
    async getAll({ ignoreId } = {}) {
      if (ignoreId) {
        return await db.users.where("id").noneOf(ignoreId).toArray();
      }
      return await db.users.toArray();
    },
    async getById(id) {
      return (await db.users.get(id)) || null;
    },
    async getByUserName(username) {
      return (
        (await db.users.where("username").equals(username).first()) || null
      );
    },
    async getManyByIds(ids) {
      const rs = await db.users.bulkGet(ids);
      return (
        rs.filter((u): u is NonNullable<typeof u> => u !== undefined) || null
      );
    },
  };
};
