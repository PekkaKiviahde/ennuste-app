import { readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL puuttuu");
  process.exit(1);
}

const migrationsDir = join(process.cwd(), "migrations");
const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const parseDbId = (urlValue) => {
  try {
    const url = new URL(urlValue);
    const host = url.hostname || "unknown-host";
    const dbName = url.pathname?.replace("/", "") || "unknown-db";
    return `${host}/${dbName}`;
  } catch {
    return "unknown-host/unknown-db";
  }
};

const run = async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const schemaCheck = await client.query(
    "SELECT to_regclass('public.schema_migrations') AS table_name"
  );
  const hasSchemaTable = Boolean(schemaCheck.rows[0]?.table_name);

  let applied = new Set();
  if (hasSchemaTable) {
    const appliedResult = await client.query("SELECT filename FROM schema_migrations");
    applied = new Set(appliedResult.rows.map((row) => row.filename));
  }

  const pending = migrations.filter((file) => !applied.has(file));
  const nextPending = pending[0] ?? "none";

  console.log(`DB: ${parseDbId(databaseUrl)}`);
  console.log(`Applied: ${applied.size}`);
  console.log(`Pending: ${pending.length}`);
  console.log(`Next: ${nextPending}`);

  await client.end();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
