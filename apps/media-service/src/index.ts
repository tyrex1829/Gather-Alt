import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { AccessToken } from "livekit-server-sdk";
import { z } from "zod";
import { loadEnv } from "@gather/config";
import { authMiddleware, logInfo, logError } from "@gather/utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const env = loadEnv(process.env);
const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));
app.use(express.json());

const auth = authMiddleware(env.JWT_SECRET);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "media-service",
    livekitEnabled: !!(env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET && env.LIVEKIT_URL)
  });
});

const TokenRequestSchema = z.object({
  mapId: z.string(),
  name: z.string().optional()
});

app.post("/tokens", auth, (req: any, res: any) => {
  try {
    if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
      return res.status(500).json({ error: "LiveKit credentials not configured" });
    }

    const { mapId, name } = TokenRequestSchema.parse(req.body);
    const userId = req.user.userId;
    const participantName = name || req.user.name || "Unknown Player";

    const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: userId,
      name: participantName,
    });

    // The LiveKit room name corresponds to the mapId
    at.addGrant({
      roomJoin: true,
      room: mapId,
      canPublish: true,
      canSubscribe: true,
    });

    const token = at.toJwt();
    res.json({ token, url: env.LIVEKIT_URL });
  } catch (err) {
    logError("Token generation failed", err);
    res.status(400).json({ error: "Invalid request or token generation failed" });
  }
});

app.listen(env.MEDIA_PORT, () => {
  logInfo(`Media service listening on ${env.MEDIA_PORT}`);
});
