/// <reference path="./pg.d.ts" />
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set; database calls will fail.");
}

export const pool = new Pool({
  connectionString
});

export const query = async <T>(text: string, params: unknown[] = []) => {
  const result = await pool.query<T>(text, params);
  return result;
};

export const withTransaction = async <T>(fn: (client: Pool) => Promise<T>) => {
  return fn(pool);
};
