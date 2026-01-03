import { readFileSync, readdirSync } from "node:fs";
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

const run = async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  for (const file of migrations) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Running ${file}`);
    await client.query(sql);
  }

  await client.end();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
