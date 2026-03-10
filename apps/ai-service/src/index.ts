import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { loadEnv } from "@gather/config";
import { logInfo } from "@gather/utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const env = loadEnv(process.env);
const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ai-service",
    message: "RAG and AI agent endpoints will be added incrementally"
  });
});

app.listen(env.AI_PORT, () => {
  logInfo(`AI service listening on ${env.AI_PORT}`);
});
