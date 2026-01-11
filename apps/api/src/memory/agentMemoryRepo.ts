import crypto from "node:crypto";
import { Pool } from "pg";

const MAX_PAYLOAD_CHARS = 20000;
const REDACT_KEYS = ["apikey", "token", "secret", "password", "patch", "prompt", "stdout", "stderr"];

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function hashPayload(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function redactPayload(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => redactPayload(item));

  if (typeof value === "object") {
    const out: Record<string, JsonValue> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const keyLower = key.toLowerCase();
      if (REDACT_KEYS.some((k) => keyLower.includes(k))) {
        out[key] = "[redacted]";
      } else {
        out[key] = redactPayload(val);
      }
    }
    return out;
  }

  return "[redacted]";
}

function limitPayload(payload: unknown): JsonValue {
  const redacted = redactPayload(payload);
  const json = JSON.stringify(redacted);
  if (json.length <= MAX_PAYLOAD_CHARS) return redacted;
  return {
    truncated: true,
    chars: json.length,
    sha256: hashPayload(json),
  } as JsonValue;
}

export class AgentMemoryRepo {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async createSession(projectId: string | null): Promise<string> {
    const { rows } = await this.pool.query(
      "INSERT INTO agent_sessions (project_id) VALUES ($1) RETURNING agent_session_id",
      [projectId]
    );
    return rows[0].agent_session_id;
  }

  async addEvent(sessionId: string, eventType: string, payload: unknown): Promise<void> {
    const safePayload = limitPayload(payload);
    await this.pool.query(
      "INSERT INTO agent_events (agent_session_id, event_type, payload) VALUES ($1, $2, $3::jsonb)",
      [sessionId, eventType, JSON.stringify(safePayload)]
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
