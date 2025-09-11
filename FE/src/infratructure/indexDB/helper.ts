import {
  ITransactionManager,
  TTransactionTable,
} from "@/core/application/services-facade";
import { ChatDb } from "./init";

type WithId<T> = T & { id: string };
type WithoutId<T> = T extends { id: any } ? never : T;

/////////////////////

export function genUUID<T extends object>(
  record: WithoutId<T> | WithId<T>
): WithId<T> {
  return {
    ...record,
    id: crypto.randomUUID(),
  };
}

export const createIndexedDBTransactionManager = (
  db: ChatDb
): ITransactionManager => {
  return {
    executeInTransaction<T>(
      tableNames: TTransactionTable[],
      callback: () => Promise<T>
    ): Promise<T> {
      const tables = tableNames.map((name) => (db as any)[name]);
      return db.transaction("rw", tables, callback);
    },
  };
};
