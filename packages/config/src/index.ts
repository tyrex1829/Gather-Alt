import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  JWT_SECRET: z.string().min(8),
  MONGO_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  GATEWAY_PORT: z.coerce.number().default(4000),
  WS_PORT: z.coerce.number().default(4001),
  MEDIA_PORT: z.coerce.number().default(4002),
  AI_PORT: z.coerce.number().default(4003),
  MAP_PORT: z.coerce.number().default(4004),
  NOTIFICATION_PORT: z.coerce.number().default(4005),
  CORS_ORIGIN: z.string().default("http://localhost:3000")
});

export function loadEnv(env: NodeJS.ProcessEnv) {
  return EnvSchema.parse(env);
}
