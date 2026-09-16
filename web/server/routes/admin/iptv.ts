import { Router } from "express";
import { requireAdmin } from "server/lib/middleware";
import * as ApiResponse from "server/utils/response";
import {
  buildIptvM3uPlaylist,
  buildIptvM3uUrl,
  ensureIptvSchema,
  getIptvContentCatalog,
  getIptvOrderById,
  getIptvProviderCatalogSummary,
  getIptvResellerInfo,
  getTvplusProviderCatalogSummary,
  getIptvSettings,
  importIptvProviderLine,
  listIptvBouquetContent,
  listEditableIptvChannels,
  listIptvChannelProviders,
  listIptvCurrencyRates,
  listIptvM3uFormats,
  listIptvOrders,
  listIptvPackages,
  listIptvSettingPackages,
  renewIptvOrder,
  sendIptvPromotionMessage,
  syncIptvCurrencyRatesFromFreeProvider,
  syncIptvPackages,
  syncIptvResellerHubContentCatalog,
  syncTvplusDinoContentCatalog,
  syncTvplusContentCatalog,
  updateIptvOrderStatus,
  updateIptvOrderCredentials,
  updateIptvCategoryStatus,
  updateEditableIptvChannel,
  updateIptvPackage,
  updateIptvSettings,
} from "server/services/iptv-service";

const router = Router();

router.use(requireAdmin);

router.use(async (_req, _res, next) => {
  try {
    await ensureIptvSchema();
    next();
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard", async (_req, res) => {
  try {
    const [settings, packages, orders, content, currencyRates, providerCatalog, tvplusCatalog] = await Promise.all([
      getIptvSettings(),
      listIptvSettingPackages(),
      listIptvOrders({ limit: 200 }),
      getIptvContentCatalog(),
      listIptvCurrencyRates(),
      getIptvProviderCatalogSummary(),
      getTvplusProviderCatalogSummary(),
    ]);

    const activeOrders = orders.filter((order: any) => order.status === "active").length;
    const failedOrders = orders.filter((order: any) => order.status === "failed").length;

    return ApiResponse.success(res, "IPTV dashboard loaded successfully", {
      settings,
      packages,
      orders,
      content,
      currencyRates,
      providerCatalog,
      tvplusCatalog,
      stats: {
        totalPackages: packages.filter((pkg: any) => !pkg.metadata?.virtualTrial).length,
        activeOrders,
        failedOrders,
        totalOrders: orders.length,
      },
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load IPTV dashboard");
  }
});

router.put("/settings", async (req, res) => {
  try {
    const settings = await updateIptvSettings(req.body || {});
    return ApiResponse.success(res, "IPTV settings updated successfully", settings);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to update IPTV settings");
  }
});

router.post("/promotions/send", async (req, res) => {
  try {
    const result = await sendIptvPromotionMessage(req.body || {});
    return ApiResponse.success(res, "IPTV promotion message sent successfully", result);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to send IPTV promotion message");
  }
});

router.post("/sync-packages", async (_req, res) => {
  try {
    const packages = await syncIptvPackages();
    return ApiResponse.success(res, "IPTV packages synced successfully", packages);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to sync IPTV packages");
  }
});

router.post("/currency-rates/sync", async (_req, res) => {
  try {
    const result = await syncIptvCurrencyRatesFromFreeProvider();
    return ApiResponse.success(res, "IPTV currency rates synced successfully", result);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to sync IPTV currency rates");
  }
});

router.patch("/packages/:id", async (req, res) => {
  try {
    const pkg = await updateIptvPackage(req.params.id, req.body || {});
    return ApiResponse.success(res, "IPTV package updated successfully", pkg);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to update IPTV package");
  }
});

router.get("/bouquets/content", async (req, res) => {
  try {
    const data = await listIptvBouquetContent(req.query || {});
    return ApiResponse.success(res, "IPTV bouquet content loaded successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to load IPTV bouquet content");
  }
});

router.patch("/bouquets/category", async (req, res) => {
  try {
    const data = await updateIptvCategoryStatus(req.body || {});
    return ApiResponse.success(res, "IPTV bouquet category updated successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to update IPTV bouquet category");
  }
});

router.get("/channels", async (req, res) => {
  try {
    const provider = String(req.query.provider || "iotv");
    const [providers, channels] = await Promise.all([
      listIptvChannelProviders(),
      listEditableIptvChannels(provider),
    ]);
    return ApiResponse.success(res, "IPTV channels loaded successfully", { providers, channels });
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to load IPTV channels");
  }
});

router.patch("/channels/:id", async (req, res) => {
  try {
    const channel = await updateEditableIptvChannel(req.params.id, req.body || {});
    return ApiResponse.success(res, "IPTV channel updated successfully", channel);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to update IPTV channel");
  }
});

router.post("/channels/sync", async (req, res) => {
  try {
    const provider = String(req.body?.provider || req.query.provider || "tvplus").toLowerCase();
    if (!["tvplus", "iotv"].includes(provider)) return ApiResponse.badRequest(res, "Unknown IPTV provider");
    if (provider === "iotv") {
      const result = await syncIptvResellerHubContentCatalog();
      return ApiResponse.success(res, "IPTV Reseller Hub channels, VOD, and series synced successfully", result);
    }
    const source = String(req.body?.source || req.query.source || "player").toLowerCase();
    if (source === "dino") {
      return ApiResponse.badRequest(res, "TVPLUS website category scraping is disabled because it is not a clean channel API. Use Sync TVPLUS Player API with a real TVPLUS M3U account.");
    }
    const result = source === "dino"
      ? await syncTvplusDinoContentCatalog()
      : await syncTvplusContentCatalog();
    return ApiResponse.success(res, "TVPLUS channels, VOD, and series synced successfully", result);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to sync TVPLUS content");
  }
});

router.patch("/orders/:id/status", async (req, res) => {
  try {
    const order = await updateIptvOrderStatus(
      req.params.id,
      req.body?.status || "active",
      req.body?.adminNote,
    );
    return ApiResponse.success(res, "IPTV order updated successfully", order);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to update IPTV order");
  }
});

router.post("/orders/import", async (req, res) => {
  try {
    const order = await importIptvProviderLine(req.body || {});
    return ApiResponse.created(res, "TVPLUS line imported successfully", order);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to import TVPLUS line");
  }
});

router.post("/orders/:id/renew", async (req, res) => {
  try {
    const order = await renewIptvOrder(req.params.id, null, req.body || { subscriptionMonths: 12 });
    return ApiResponse.success(res, "IPTV order renewed successfully", order);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to renew IPTV order");
  }
});

router.patch("/orders/:id/credentials", async (req, res) => {
  try {
    const order = await updateIptvOrderCredentials(req.params.id, req.body || {});
    return ApiResponse.success(res, "IPTV credentials updated successfully", order);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to update IPTV credentials");
  }
});

router.get("/orders/:id/m3u-download", async (req, res) => {
  try {
    const order: any = await getIptvOrderById(req.params.id);
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
    const order: any = await getIptvOrderById(req.params.id);
    if (order) return res.send(buildIptvM3uPlaylist(order));
    return ApiResponse.badRequest(res, error.message || "Failed to download M3U list");
  }
});

router.get("/orders/:id/m3u-formats", async (req, res) => {
  try {
    const order: any = await getIptvOrderById(req.params.id);
    if (!order) return ApiResponse.notFound(res, "IPTV order not found");
    if (!order.m3uUrl) return ApiResponse.badRequest(res, "This IPTV subscription does not have an M3U list");
    return ApiResponse.success(res, "M3U formats loaded successfully", listIptvM3uFormats(order));
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to load M3U formats");
  }
});

router.get("/reseller-info", async (_req, res) => {
  try {
    const data = await getIptvResellerInfo();
    return ApiResponse.success(res, "IPTV reseller information loaded successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to load IPTV reseller information");
  }
});

export default router;
