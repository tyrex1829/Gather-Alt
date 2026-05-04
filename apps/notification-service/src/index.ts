import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Worker } from "bullmq";
import nodemailer from "nodemailer";
import { loadEnv } from "@gather/config";
import { logInfo, logError } from "@gather/utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const env = loadEnv(process.env);
const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "notification-service" }));

const redisOptions = env.REDIS_URL ? { connection: new URL(env.REDIS_URL) } : { connection: { host: "localhost", port: 6379 } };

// Mail transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER || "test@ethereal.email",
    pass: process.env.SMTP_PASS || "testpass"
  }
});

const worker = new Worker(
  "inviteQueue",
  async (job) => {
    logInfo(`Processing job ${job.id} of type ${job.name}`);
    if (job.name === "send-invite") {
      const { email, inviteToken, orgName, role } = job.data;
      const acceptUrl = `${env.CORS_ORIGIN.split(",")[0]}/join/${inviteToken}`;
      
      const mailOptions = {
        from: '"Gather Team" <noreply@gather.local>',
        to: email,
        subject: `You've been invited to join ${orgName} on Gather`,
        text: `You have been invited to join ${orgName} as a ${role}.\nClick here to accept: ${acceptUrl}`,
        html: `<p>You have been invited to join <strong>${orgName}</strong> as a ${role}.</p><p><a href="${acceptUrl}">Click here to accept</a></p>`
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        logInfo(`Email sent to ${email}: ${info.messageId}`);
      } catch (err) {
        logError(`Failed to send email to ${email}`, err);
        throw err;
      }
    }
  },
  redisOptions
);

worker.on("completed", (job) => {
  logInfo(`Job ${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  logError(`Job ${job?.id} has failed with ${err.message}`);
});

app.listen(env.NOTIFICATION_PORT, () => {
  logInfo(`Notification service listening on ${env.NOTIFICATION_PORT}`);
});
