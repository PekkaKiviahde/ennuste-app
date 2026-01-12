import express from "express";
import { handleProjectCoach } from "./routes/projectCoach";
import agentRouter from "./routes/agent.routes";
import { checkEnv } from "./config/env";

const app = express();
const required = checkEnv(["DATABASE_URL", "AGENT_INTERNAL_TOKEN"]);
if (!required.ok) {
  console.error(`Missing required env vars: ${required.missing.join(", ")}`);
  process.exit(1);
}

const host = process.env.APP_HOST?.trim() || "127.0.0.1";
const port = Number(process.env.APP_PORT || 3011);

app.use(express.json());

app.use("/agent", agentRouter);
app.get("/api/project-coach", handleProjectCoach);

app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`);
});
