import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Client } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.DATABASE_URL_DOCKER ||
  process.env.DATABASE_URL_HOST ||
  "";

if (!databaseUrl) {
  console.error("DATABASE_URL puuttuu (.env tai env).");
  process.exit(1);
}

const migrationsDir = path.join(__dirname, "..", "..", "migrations");

async function main() {
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error("Ei migraatioita löytynyt migrations/-kansiosta.");
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      const sql = await fs.readFile(fullPath, "utf8");
      process.stdout.write(`Ajetaan ${file}... `);
      await client.query(sql);
      process.stdout.write("OK\n");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("db:setup epäonnistui:", err);
  process.exit(1);
});
