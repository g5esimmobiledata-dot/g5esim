import { promises as dns } from "dns";
import net from "net";
import tls from "tls";
import { Router, type Request, type Response } from "express";
import { requireAdmin } from "server/lib/middleware";
import { ensureAsteriskRealtimeSchema, getFreePbxConfig } from "server/services/freepbx-service";
import { testAstppConnection } from "server/services/astpp-service";
import { provisionMissingUserSipAccounts } from "server/services/user-sip-service";
import { storage } from "server/storage";
import * as ApiResponse from "server/utils/response";

const router = Router();

function trim(value: unknown) {
  return String(value || "").trim();
}

function normalizeSipTransport(value: unknown) {
  const raw = trim(value).toLowerCase();
  if (raw.includes("tls")) return "tls";
  if (raw.includes("tcp")) return "tcp";
  if (raw.includes("udp")) return "udp";
  return raw || "udp";
}

function normalizeSipHost(value: string) {
  const raw = trim(value);
  const withoutScheme = raw.replace(/^sips?:/i, "");
  const withoutParams = withoutScheme.split(";")[0] || withoutScheme;
  const withoutUser = withoutParams.includes("@") ? withoutParams.split("@").pop() || withoutParams : withoutParams;
  return withoutUser.replace(/^\/+/, "").split(":")[0] || raw;
}

function defaultSipPort(transport: string) {
  return transport === "tls" ? 5061 : 5060;
}

function parsePort(value: unknown, transport: string) {
  const port = Number(value || defaultSipPort(transport));
  return Number.isFinite(port) && port > 0 && port <= 65535 ? Math.trunc(port) : defaultSipPort(transport);
}

async function saveSipTestStatus(prefix: string, status: "online" | "offline", message: string, checkedAt: string) {
  await Promise.all([
    storage.setSetting({ key: `${prefix}_status`, value: status, category: "concierge" }),
    storage.setSetting({ key: `${prefix}_status_message`, value: message, category: "concierge" }),
    storage.setSetting({ key: `${prefix}_last_checked_at`, value: checkedAt, category: "concierge" }),
  ]);
}

async function testTcpConnection(domain: string, port: number, transport: string) {
  return new Promise<void>((resolve, reject) => {
    const timeoutMs = 5000;
    const socket =
      transport === "tls"
        ? tls.connect({ host: domain, port, servername: domain, rejectUnauthorized: false })
        : net.connect({ host: domain, port });

    const done = (error?: Error) => {
      socket.removeAllListeners();
      socket.destroy();
      error ? reject(error) : resolve();
    };

    socket.setTimeout(timeoutMs, () => done(new Error(`Connection timed out after ${timeoutMs / 1000}s`)));
    socket.once(transport === "tls" ? "secureConnect" : "connect", () => done());
    socket.once("error", done);
  });
}

router.get("/concierge/overview", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await storage.getAllSettings();
    const settings = rows.reduce<Record<string, string>>((current, setting) => {
      current[setting.key] = setting.value;
      return current;
    }, {});

    return ApiResponse.success(res, "Concierge overview fetched successfully", { settings });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Unable to load concierge overview.");
  }
});

router.post("/concierge/sip/test", requireAdmin, async (req: Request, res: Response) => {
  const checkedAt = new Date().toISOString();
  const transport = normalizeSipTransport(req.body?.transport);
  const port = parsePort(req.body?.port, transport);
  const host = normalizeSipHost(trim(req.body?.server) || trim(req.body?.uri));

  try {
    if (!host) {
      const message = "SIP server is not configured.";
      await saveSipTestStatus("concierge_sip", "offline", message, checkedAt);
      return ApiResponse.success(res, "SIP connection test completed", {
        online: false,
        status: "offline",
        message,
        checkedAt,
      });
    }

    await dns.lookup(host);

    let message = `Domain resolved for ${transport.toUpperCase()} SIP on ${host}:${port}.`;
    if (transport !== "udp") {
      await testTcpConnection(host, port, transport);
      message = `Connected to ${host}:${port} using ${transport.toUpperCase()}.`;
    }

    await saveSipTestStatus("concierge_sip", "online", message, checkedAt);
    return ApiResponse.success(res, "SIP connection test completed", {
      online: true,
      status: "online",
      message,
      checkedAt,
    });
  } catch (error: any) {
    const message = error.message || "Unable to reach the SIP server.";
    await saveSipTestStatus("concierge_sip", "offline", message, checkedAt);
    return ApiResponse.success(res, "SIP connection test completed", {
      online: false,
      status: "offline",
      message,
      checkedAt,
    });
  }
});

router.post("/freepbx/test", requireAdmin, async (_req: Request, res: Response) => {
  const checkedAt = new Date().toISOString();

  try {
    const config = await getFreePbxConfig();
    if (!config.enabled) {
      const message = "FreePBX realtime provisioning is disabled.";
      await saveSipTestStatus("freepbx", "offline", message, checkedAt);
      return ApiResponse.success(res, "FreePBX test completed", {
        online: false,
        status: "offline",
        message,
        checkedAt,
      });
    }

    if (config.mode !== "realtime") {
      const message = `FreePBX provisioning mode is ${config.mode}; realtime mode is required for automatic SIP accounts.`;
      await saveSipTestStatus("freepbx", "offline", message, checkedAt);
      return ApiResponse.success(res, "FreePBX test completed", {
        online: false,
        status: "offline",
        message,
        checkedAt,
      });
    }

    if (!config.domain) {
      const message = "FreePBX SIP domain is not configured.";
      await saveSipTestStatus("freepbx", "offline", message, checkedAt);
      return ApiResponse.success(res, "FreePBX test completed", {
        online: false,
        status: "offline",
        message,
        checkedAt,
      });
    }

    await ensureAsteriskRealtimeSchema();
    const message = `FreePBX realtime tables are reachable for ${config.domain}.`;
    await saveSipTestStatus("freepbx", "online", message, checkedAt);
    return ApiResponse.success(res, "FreePBX test completed", {
      online: true,
      status: "online",
      message,
      checkedAt,
    });
  } catch (error: any) {
    const message = error.message || "Unable to verify FreePBX realtime provisioning.";
    await saveSipTestStatus("freepbx", "offline", message, checkedAt);
    return ApiResponse.success(res, "FreePBX test completed", {
      online: false,
      status: "offline",
      message,
      checkedAt,
    });
  }
});

router.post("/astpp/test", requireAdmin, async (_req: Request, res: Response) => {
  const checkedAt = new Date().toISOString();

  try {
    const result = await testAstppConnection();
    const status = result.online ? "online" : "offline";
    await saveSipTestStatus("astpp", status, result.message, checkedAt);
    return ApiResponse.success(res, "ASTPP test completed", {
      online: result.online,
      status,
      message: result.message,
      checkedAt,
    });
  } catch (error: any) {
    const message = error.message || "Unable to verify ASTPP provisioning.";
    await saveSipTestStatus("astpp", "offline", message, checkedAt);
    return ApiResponse.success(res, "ASTPP test completed", {
      online: false,
      status: "offline",
      message,
      checkedAt,
    });
  }
});

router.post("/astpp/provision-missing", requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = req.body?.limit ?? req.query?.limit ?? 100;
    const result = await provisionMissingUserSipAccounts(Number(limit));
    return ApiResponse.success(res, "Missing customer SIP accounts provisioned", result);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Unable to provision missing SIP accounts.");
  }
});

export default router;
