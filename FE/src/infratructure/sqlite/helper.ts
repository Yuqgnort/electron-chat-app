import {
  ITransactionManager,
  TTransactionTable,
} from "@/core/application/services-facade";
import { SQLiteWorkerDB } from "./init";
import { createNormalizeSearchString } from "@/core/domain/search/entity";

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

export function sanitizeString(str: string): string {
  return createNormalizeSearchString(str);
}

export function formatTimestamp(timestamp: number): string {
  return timestamp.toString();
}

export function parseTimestamp(timestampStr: string | number): number {
  return typeof timestampStr === "string"
    ? parseInt(timestampStr)
    : timestampStr;
}

export function buildWhereClause(conditions: Record<string, any>): string {
  const clauses = Object.entries(conditions)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (typeof value === "string") {
        return `${key} = '${sanitizeString(value)}'`;
      }
      return `${key} = ${value}`;
    });

  return clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
}

export function buildOrderByClause(
  orderBy?: string,
  direction: "ASC" | "DESC" = "DESC"
): string {
  return orderBy ? `ORDER BY ${orderBy} ${direction}` : "";
}

export function buildLimitClause(limit?: number, offset?: number): string {
  let clause = "";
  if (limit) {
    clause = `LIMIT ${limit}`;
    if (offset) {
      clause += ` OFFSET ${offset}`;
    }
  }
  return clause;
}

export const createSQLiteTransactionManager = (
  sqliteDb: SQLiteWorkerDB
): ITransactionManager => {
  return {
    async executeInTransaction<T>(
      tableNames: TTransactionTable[],
      callback: () => Promise<T>
    ): Promise<T> {
      try {
        await sqliteDb.exec("BEGIN TRANSACTION");
        const result = await callback();
        await sqliteDb.exec("COMMIT");
        return result;
      } catch (error) {
        await sqliteDb.exec("ROLLBACK");
        throw error;
      }
    },
  };
};

export function mapSQLiteRow<T>(row: any, mapper: (row: any) => T): T {
  return mapper(row);
}

export function mapSQLiteRows<T>(rows: any[], mapper: (row: any) => T): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => mapper(row));
}

export function createInsertSQL(
  tableName: string,
  data: Record<string, any>
): { sql: string; values: any[] } {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => "?").join(", ");
  const sql = `INSERT INTO ${tableName} (${keys.join(", ")}) VALUES (${placeholders})`;
  const values = keys.map((key) => data[key]);

  return { sql, values };
}

export function createUpdateSQL(
  tableName: string,
  data: Record<string, any>,
  whereCondition: string
): { sql: string; values: any[] } {
  const keys = Object.keys(data);
  const setClause = keys.map((key) => `${key} = ?`).join(", ");
  const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereCondition}`;
  const values = keys.map((key) => data[key]);

  return { sql, values };
}

export function createSelectSQL(
  tableName: string,
  columns: string[] = ["*"],
  whereClause?: string,
  orderByClause?: string,
  limitClause?: string
): string {
  let sql = `SELECT ${columns.join(", ")} FROM ${tableName}`;

  if (whereClause) sql += ` ${whereClause}`;
  if (orderByClause) sql += ` ${orderByClause}`;
  if (limitClause) sql += ` ${limitClause}`;

  return sql;
}

export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missingFields = requiredFields.filter(
    (field) => data[field] === undefined || data[field] === null
  );

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }
}
