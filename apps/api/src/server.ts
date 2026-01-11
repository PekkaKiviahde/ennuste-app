import express from "express";
import { handleProjectCoach } from "./routes/projectCoach";

const app = express();
const port = Number(process.env.APP_PORT || process.env.PORT || 3001);

app.get("/api/project-coach", handleProjectCoach);

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
