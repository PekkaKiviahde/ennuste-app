const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://codex:codex@db:5432/codex';

async function connectWithRetry(client, attempts = 20) {
  let lastError;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await client.connect();
      return;
    } catch (error) {
      lastError = error;
      const waitMs = Math.min(1000 * i, 5000);
      console.warn(`DB connection failed (attempt ${i}/${attempts}), retrying in ${waitMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastError;
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  await connectWithRetry(client);
  const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running ${file}...`);
    try {
      await client.query(sql);
    } catch (error) {
      console.error(`Failed ${file}: ${error.message}`);
      throw error;
    }
  }

  await client.end();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
