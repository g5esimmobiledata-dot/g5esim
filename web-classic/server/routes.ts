import type { Express } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { createServer, type Server } from "http";
import { pool } from "./db";
import { registerModularRoutes } from "./routes/index";
import bannerRouter from "./routes/banner.routes";
import conciergeRouter from "./routes/concierge";
import iapRouter from "./routes/iap";
import iptvRouter from "./routes/iptv";
import optionsRouter from "./routes/options";
import securityRouter from "./routes/security";
import supportTicketsRouter from "./routes/support.tickets";
import uploadRouter from "./routes/upload";
import voiceRouter from "./routes/voice";
import vonageRouter from "./routes/vonage";
import whatsappCloudRouter from "./routes/whatsapp-cloud";

function configureSession(app: Express) {
  const PgSessionStore = connectPgSimple(session);
  const sessionSecret =
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    "development-session-secret-change-me";

  app.set("trust proxy", 1);
  app.use(
    session({
      store: new PgSessionStore({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      name: "esimconnect.sid",
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.COOKIE_SECURE === "true",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    }),
  );
}

export async function registerRoutes(app: Express): Promise<Server> {
  configureSession(app);

  registerModularRoutes(app);
  app.use("/api/banner", bannerRouter);
  app.use("/api/concierge", conciergeRouter);
  app.use("/api/iap", iapRouter);
  app.use("/api/iptv", iptvRouter);
  app.use("/api/options", optionsRouter);
  app.use("/api/security", securityRouter);
  app.use("/api/support-tickets", supportTicketsRouter);
  app.use("/api/upload", uploadRouter);
  app.use("/api/voice", voiceRouter);
  app.use("/api/vonage", vonageRouter);
  app.use("/api/webhooks/vonage", vonageRouter);
  app.use("/api/whatsapp", whatsappCloudRouter);

  return createServer(app);
}
