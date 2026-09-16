import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAdmin } from "server/lib/middleware";
import * as ApiResponse from "server/utils/response";
import {
  getDefaultSudoAfricaConfig,
  getSudoAfricaConfig,
  maskSudoAfricaConfig,
  saveSudoAfricaConfig,
  sudoAfricaRequest,
  type SudoAfricaEndpointKey,
} from "server/services/sudoafrica-service";

const router = Router();

router.use(requireAdmin);

const configSchema = z.object({
  enabled: z.coerce.boolean().optional(),
  mode: z.enum(["sandbox", "live"]).optional(),
  apiBaseUrl: z.string().trim().min(1).optional(),
  apiKey: z.string().optional(),
  endpoints: z.record(z.string()).optional(),
});

const callSchema = z.object({
  endpoint: z.string().min(1),
  payload: z.record(z.any()).default({}),
});

const requiredFields: Record<string, string[]> = {
  "cards.details": ["cardId"],
  "cards.update": ["cardId"],
  "cards.token": ["cardId"],
  "cards.transactions": ["cardId"],
  "cards.authorizations": ["cardId"],
};

const allowedEndpoints = new Set<SudoAfricaEndpointKey>([
  "customers.create",
  "customers.list",
  "cards.create",
  "cards.list",
  "cards.details",
  "cards.update",
  "cards.token",
  "cards.transactions",
  "cards.authorizations",
]);

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

router.get("/settings", async (_req: Request, res: Response) => {
  try {
    const config = await getSudoAfricaConfig();
    return ApiResponse.success(res, "Sudo Africa settings loaded successfully", {
      config: maskSudoAfricaConfig(config),
      defaults: getDefaultSudoAfricaConfig(),
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load Sudo Africa settings");
  }
});

router.put("/settings", async (req: Request, res: Response) => {
  try {
    const data = configSchema.parse(req.body);
    const config = await saveSudoAfricaConfig(data, req.session.adminId || null);
    return ApiResponse.success(res, "Sudo Africa settings saved successfully", maskSudoAfricaConfig(config));
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to save Sudo Africa settings");
  }
});

router.get("/status", async (_req: Request, res: Response) => {
  try {
    const config = await getSudoAfricaConfig();
    return ApiResponse.success(res, "Sudo Africa status loaded successfully", {
      enabled: config.enabled,
      connected: Boolean(config.enabled && config.apiKey),
      hasApiKey: Boolean(config.apiKey),
      mode: config.mode,
      apiBaseUrl: config.apiBaseUrl,
    });
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Sudo Africa provider is not ready");
  }
});

router.post("/call", async (req: Request, res: Response) => {
  try {
    const { endpoint, payload } = callSchema.parse(req.body);
    if (!allowedEndpoints.has(endpoint as SudoAfricaEndpointKey)) {
      return ApiResponse.badRequest(res, "Unsupported Sudo Africa endpoint");
    }
    const missing = (requiredFields[endpoint] || []).filter((field) => !hasValue(payload[field]));
    if (missing.length > 0) {
      return ApiResponse.badRequest(res, `Missing required parameter${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
    }
    const data = await sudoAfricaRequest(endpoint as SudoAfricaEndpointKey, payload);
    return ApiResponse.success(res, "Sudo Africa API call completed successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Sudo Africa API call failed");
  }
});

export default router;
