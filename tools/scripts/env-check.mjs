const required = ["DATABASE_URL", "SESSION_SECRET"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.log("SKIP integration tests: missing DATABASE_URL/SESSION_SECRET");
  process.exit(0);
}

// Env ok -> signal caller to run integration tests.
process.exit(1);
