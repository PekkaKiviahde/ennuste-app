import type { HealthPort } from "@ennuste/application";
import { pool } from "./db";

export const healthRepository = (): HealthPort => ({
  async check() {
    await pool.query("SELECT 1");
    return { ok: true };
  }
});
