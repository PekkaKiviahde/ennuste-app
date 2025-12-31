import { Pool } from "pg";

function resolveDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_DOCKER ||
    process.env.DATABASE_URL_HOST ||
    ""
  );
}

const databaseUrl = resolveDatabaseUrl();
if (!databaseUrl) {
  throw new Error("DATABASE_URL puuttuu. Aseta se .env-tiedostoon tai ympäristöön.");
}

const pool = new Pool({ connectionString: databaseUrl });

export async function query(text, params) {
  return pool.query(text, params);
}

export async function withClient(fn) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
