const required = ["DATABASE_URL", "SESSION_SECRET"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  const list = missing.join(", ");
  console.error(`Missing required env vars for integration tests: ${list}`);
  console.error("Set them before running tests to avoid skips.");
  process.exit(1);
}
