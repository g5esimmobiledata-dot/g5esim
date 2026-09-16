import dotenv from "dotenv";
dotenv.config();
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { multiProviderSyncScheduler } from "./services/sync/multi-provider-sync-scheduler";
import { statusScheduler } from "./services/sync/status-scheduler";
import { syncScheduler } from "./services/sync/sync-scheduler";
import path from "path";
import adminRouter from "./routes/admin"; // routes/admin/index.ts
import sipCommercialRouter from "./routes/admin/sip-commercial";
import { registerModularRoutes } from "./routes/index";            // routes/index.ts
import { apiLimiter, authLimiter } from "./middleware/rateLimit";
import { initSocket } from "./socket";
// Register all eSIM providers with the factory (Airalo, eSIM Access, eSIM Go, Maya)
import "./providers/register";
import { startLowDataUsageCron } from "./cron/lowDataUsageCron";
import { startInvoiceCron } from "./cron/invoiceCron";
import { startRoleOptionsAutomationCron } from "./cron/roleOptionsAutomationCron";
import { startIptvExpiryReminderCron } from "./cron/iptvExpiryReminderCron";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ensureKycControls } from "./utils/kycControls";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);






const app = express();

const localDevOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
const allowedOrigins = new Set([
  "http://192.168.68.125:5000",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin &&
    (allowedOrigins.has(origin) || localDevOriginPattern.test(origin))
  ) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"]?.toString() ??
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
// app.use(express.json({
//   verify: (req, _res, buf) => {
//     req.rawBody = buf;
//   }
// }));
app.use(express.json({
  limit: "100mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({
  limit: "100mb",
  extended: true
}));

const uploadDirs = Array.from(new Set([
  path.join(process.cwd(), "uploads"),
  path.join(__dirname, "../uploads"),
]));

uploadDirs.forEach((uploadsDir) => {
  if (fs.existsSync(uploadsDir)) {
    app.use("/uploads", express.static(uploadsDir));
    app.use("/api/uploads", express.static(uploadsDir));
  }
});

console.log("UPLOAD DIRS:", uploadDirs);

startLowDataUsageCron();
startInvoiceCron();
startRoleOptionsAutomationCron();
startIptvExpiryReminderCron();

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});





(async () => {

  app.use(async (_req, _res, next) => {
    try {
      await ensureKycControls();
      next();
    } catch (error) {
      next(error);
    }
  });

  const server = await registerRoutes(app);
  initSocket(server);

  app.use("/api/admin", sipCommercialRouter);
  app.use("/api/admin", adminRouter);

  app.use("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      message: `API route not found: ${req.method} ${req.originalUrl}`,
      code: "API_ROUTE_NOT_FOUND",
    });
  });


  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({
      success: false,
      message,
      code: err.code || "INTERNAL_ERROR",
    });
    console.error(err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  // server.listen({
  //   port,
  //   host: "0.0.0.0",
  //   reusePort: true,
  // }, () => {
  //   log(`serving on port ${port}`);

  //   // Start multi-provider package sync scheduler
  //   multiProviderSyncScheduler.start();

  //   // Start order status polling and retry scheduler
  //   statusScheduler.start();
  // });


  let isShuttingDown = false;

  const shutdown = (signal: NodeJS.Signals) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    log(`received ${signal}, shutting down server`);

    multiProviderSyncScheduler.stop();
    syncScheduler.stop();
    statusScheduler.stop();

    const forceExit = setTimeout(() => {
      console.error("Graceful shutdown timed out; forcing exit");
      process.exit(1);
    }, 10000);
    forceExit.unref();

    server.close((error?: Error) => {
      clearTimeout(forceExit);

      if (error) {
        console.error("Error while closing server:", error);
        process.exit(1);
      }

      if (signal === "SIGUSR2") {
        try {
          process.kill(process.pid, signal);
        } catch {
          process.exit(0);
        }
        return;
      }

      process.exit(0);
    });
  };

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Stop the other eSIM dev server or set PORT to a free port.`);
      process.exit(1);
    }

    throw error;
  });

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  process.once("SIGUSR2", shutdown);

  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    multiProviderSyncScheduler.start();
    syncScheduler.start();
    statusScheduler.start();
  });

})();
