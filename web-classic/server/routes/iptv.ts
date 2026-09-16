import { Router } from "express";
import { requireAuth } from "server/middleware/auth";
import * as ApiResponse from "server/utils/response";
import {
  canAssignIptvOrderToUser,
  createIptvOrder,
  ensureIptvSchema,
  filterIptvPackagesForAccount,
  buildIptvM3uUrl,
  buildIptvM3uPlaylist,
  getIptvAccountSettings,
  getIptvContentCatalog,
  getIptvOrderById,
  listIptvRetailPrices,
  getIptvSettings,
  listIptvM3uFormats,
  listIptvOrders,
  listIptvAssignableUsers,
  listIptvPackages,
  lookupIptvDevice,
  mergeIptvSettingsForAccount,
  renewIptvOrder,
  updateIptvOrderCredentials,
  updateIptvOrderStatus,
  updateIptvAccountSettings,
  updateIptvRetailPrice,
} from "server/services/iptv-service";

const router = Router();

router.use(async (_req, _res, next) => {
  try {
    await ensureIptvSchema();
    next();
  } catch (error) {
    next(error);
  }
});

router.get("/catalog", requireAuth, async (req, res) => {
  try {
    const [baseSettings, content] = await Promise.all([
      getIptvSettings(),
      getIptvContentCatalog(),
    ]);
    const settings = await mergeIptvSettingsForAccount(baseSettings, req.userId, req.role);
    const platform = String(req.query.platform || "web").toLowerCase();
    const showAll = platform === "mobile" ? settings.showAllProviderPackagesMobile : settings.showAllProviderPackagesWeb;
    const audienceRole = req.role === "reseller" || req.role === "agent" ? req.role : "user";
    const rawPackages = await listIptvPackages({ includeInactive: showAll, role: audienceRole });
    const packages = await filterIptvPackagesForAccount(rawPackages, req.userId, req.role);
    return ApiResponse.success(res, "IPTV catalog loaded successfully", { settings, packages, content, audienceRole });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load IPTV catalog");
  }
});

router.get("/content", requireAuth, async (_req, res) => {
  try {
    const content = await getIptvContentCatalog();
    return ApiResponse.success(res, "IPTV content catalog loaded successfully", content);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load IPTV content catalog");
  }
});

router.get("/orders", requireAuth, async (req: any, res) => {
  try {
    const orders = await listIptvOrders({ userId: req.userId, limit: 100 });
    return ApiResponse.success(res, "IPTV subscriptions loaded successfully", orders);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load IPTV subscriptions");
  }
});

router.get("/assignable-users", requireAuth, async (req: any, res) => {
  try {
    const users = await listIptvAssignableUsers(req.userId, req.role);
    return ApiResponse.success(res, "Assignable IPTV users loaded successfully", users);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load assignable IPTV users");
  }
});

router.get("/retail-prices", requireAuth, async (req: any, res) => {
  try {
    const data = await listIptvRetailPrices(req.userId, req.role);
    return ApiResponse.success(res, "IPTV retail prices loaded successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to load IPTV retail prices");
  }
});

router.get("/workspace/settings", requireAuth, async (req: any, res) => {
  try {
    const data = await getIptvAccountSettings(req.userId, req.role);
    return ApiResponse.success(res, "IPTV workspace settings loaded successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to load IPTV workspace settings");
  }
});

router.patch("/workspace/settings", requireAuth, async (req: any, res) => {
  try {
    const data = await updateIptvAccountSettings(req.userId, req.role, req.body || {});
    return ApiResponse.success(res, "IPTV workspace settings saved successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to save IPTV workspace settings");
  }
});

router.patch("/retail-prices/:packageId", requireAuth, async (req: any, res) => {
  try {
    const data = await updateIptvRetailPrice(req.userId, req.role, req.params.packageId, req.body || {});
    return ApiResponse.success(res, "IPTV retail prices saved successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to save IPTV retail prices");
  }
});

router.post("/orders", requireAuth, async (req: any, res) => {
  try {
    const assignedUserId = String(req.body?.assignedUserId || "").trim();
    if (assignedUserId) {
      const canAssign = await canAssignIptvOrderToUser(req.userId, req.role, assignedUserId);
      if (!canAssign) return ApiResponse.badRequest(res, "Selected user is not available for IPTV assignment");
    }
    const order = await createIptvOrder(req.userId, { ...(req.body || {}), clientPlatform: req.body?.clientPlatform || "web", requesterRole: req.role, assignedUserId: assignedUserId || undefined });
    return ApiResponse.created(res, "IPTV subscription created successfully", order);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to create IPTV subscription");
  }
});

router.post("/orders/:id/renew", requireAuth, async (req: any, res) => {
  try {
    const order = await renewIptvOrder(req.params.id, req.userId, { ...(req.body || {}), requesterRole: req.role });
    return ApiResponse.success(res, "IPTV subscription renewed successfully", order);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to renew IPTV subscription");
  }
});

router.patch("/orders/:id/status", requireAuth, async (req: any, res) => {
  try {
    const existing = await getIptvOrderById(req.params.id, req.userId);
    if (!existing) return ApiResponse.notFound(res, "IPTV order not found");
    const order = await updateIptvOrderStatus(req.params.id, req.body?.status || "active", req.body?.adminNote);
    return ApiResponse.success(res, "IPTV subscription status updated successfully", order);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to update IPTV subscription status");
  }
});

router.patch("/orders/:id/credentials", requireAuth, async (req: any, res) => {
  try {
    const existing = await getIptvOrderById(req.params.id, req.userId);
    if (!existing) return ApiResponse.notFound(res, "IPTV order not found");
    const order = await updateIptvOrderCredentials(req.params.id, req.body || {});
    return ApiResponse.success(res, "IPTV subscription credentials updated successfully", order);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to update IPTV subscription credentials");
  }
});

router.patch("/orders/:id/password", requireAuth, async (req: any, res) => {
  const order: any = await getIptvOrderById(req.params.id, req.userId);
  if (!order) return ApiResponse.notFound(res, "IPTV order not found");
  return ApiResponse.badRequest(res, "IPTV credentials are managed by TVPLUS and cannot be changed locally");
});

router.post("/orders/:id/password", requireAuth, async (req: any, res) => {
  const order: any = await getIptvOrderById(req.params.id, req.userId);
  if (!order) return ApiResponse.notFound(res, "IPTV order not found");
  return ApiResponse.badRequest(res, "IPTV credentials are managed by TVPLUS and cannot be changed locally");
});

router.get("/orders/:id/m3u-download", requireAuth, async (req: any, res) => {
  try {
    const order: any = await getIptvOrderById(req.params.id, req.userId);
    if (!order) return ApiResponse.notFound(res, "IPTV order not found");
    if (!order.m3uUrl) return ApiResponse.badRequest(res, "This IPTV subscription does not have an M3U list");
    const m3uUrl = buildIptvM3uUrl(order, req.query.format);
    const format = String(req.query.format || "m3u_plus_ts").replace(/[^a-z0-9_-]+/gi, "-");

    const filename = `${String(order.packageName || "tvplus-iptv")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "tvplus-iptv"}-${format}-${order.id}.m3u`;

    res.setHeader("Content-Type", "audio/x-mpegurl; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    if (String(m3uUrl || order.m3uUrl).includes("demo.tvplus.local")) {
      return res.send(buildIptvM3uPlaylist(order));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const providerResponse = await fetch(m3uUrl || order.m3uUrl, { signal: controller.signal });
      if (!providerResponse.ok) throw new Error(`Provider returned ${providerResponse.status}`);
      const text = await providerResponse.text();
      if (!text.trim() || !text.includes("#EXTM3U")) {
        return res.send(buildIptvM3uPlaylist(order));
      }
      return res.send(text);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    const order: any = await getIptvOrderById(req.params.id, req.userId);
    if (order) return res.send(buildIptvM3uPlaylist(order));
    return ApiResponse.badRequest(res, error.message || "Failed to download M3U list");
  }
});

router.get("/orders/:id/m3u-formats", requireAuth, async (req: any, res) => {
  try {
    const order: any = await getIptvOrderById(req.params.id, req.userId);
    if (!order) return ApiResponse.notFound(res, "IPTV order not found");
    if (!order.m3uUrl) return ApiResponse.badRequest(res, "This IPTV subscription does not have an M3U list");
    return ApiResponse.success(res, "M3U formats loaded successfully", listIptvM3uFormats(order));
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to load M3U formats");
  }
});

router.post("/device-info", requireAuth, async (req, res) => {
  try {
    const data = await lookupIptvDevice(req.body || {});
    return ApiResponse.success(res, "IPTV device information loaded successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to load IPTV device information");
  }
});

export default router;
