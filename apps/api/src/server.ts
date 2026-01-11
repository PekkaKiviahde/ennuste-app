import express from "express";
import { handleProjectCoach } from "./routes/projectCoach";
import agentRouter from "./routes/agent.routes";

const app = express();
const port = Number(process.env.APP_PORT || process.env.PORT || 3001);
const host = process.env.APP_HOST || "127.0.0.1";

app.use(express.json());

app.use("/agent", agentRouter);
app.get("/api/project-coach", handleProjectCoach);

app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`);
});
