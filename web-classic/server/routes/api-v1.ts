import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { apiKeys, unifiedPackages, destinations, orders, providers } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { orderingEngine } from "../services/ordering";
import { resolvePackage } from "../services/packages/package-resolver";
import crypto from "crypto";
import bcrypt from "bcrypt";

const router = Router();

interface AuthenticatedRequest extends Request {
  apiKey?: {
    id: string;
    name: string;
    enterpriseId: string | null;
    permissions: Record<string, boolean>;
    rateLimit: number;
  };
}

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function apiKeyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKeyHeader = req.headers["x-api-key"] as string;
  const apiSecretHeader = req.headers["x-api-secret"] as string;

  if (!apiKeyHeader || !apiSecretHeader) {
    res.status(401).json({
      success: false,
      error: "Missing API credentials",
      message: "X-API-Key and X-API-Secret headers are required",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const keyHash = hashApiKey(apiKeyHeader);

  const apiKeyRecord = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.apiKeyHash, keyHash),
  });

  if (!apiKeyRecord) {
    res.status(401).json({
      success: false,
      error: "Invalid API key",
      message: "The provided API key is not valid",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (!apiKeyRecord.isActive) {
    res.status(403).json({
      success: false,
      error: "API key disabled",
      message: "This API key has been disabled",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) < new Date()) {
    res.status(403).json({
      success: false,
      error: "API key expired",
      message: "This API key has expired",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const secretValid = await bcrypt.compare(apiSecretHeader, apiKeyRecord.apiSecretHash);
  if (!secretValid) {
    res.status(401).json({
      success: false,
      error: "Invalid API secret",
      message: "The provided API secret is not valid",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  await db
    .update(apiKeys)
    .set({
      lastUsedAt: new Date(),
      requestCount: sql`${apiKeys.requestCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(apiKeys.id, apiKeyRecord.id));

  req.apiKey = {
    id: apiKeyRecord.id,
    name: apiKeyRecord.name,
    enterpriseId: apiKeyRecord.enterpriseId,
    permissions: (apiKeyRecord.permissions as Record<string, boolean>) || {},
    rateLimit: apiKeyRecord.rateLimit,
  };

  next();
}

router.get("/packages", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { destination, type, limit = 50, offset = 0 } = req.query;

    let query = db.query.unifiedPackages.findMany({
      where: eq(unifiedPackages.isEnabled, true),
      with: {
        provider: true,
        destination: true,
      },
      limit: Math.min(Number(limit), 100),
      offset: Number(offset),
      orderBy: [desc(unifiedPackages.isPopular)],
    });

    const packages = await query;

    let filtered = packages;
    if (destination) {
      filtered = packages.filter(
        (p) => p.destination?.slug === destination || p.destination?.countryCode === destination
      );
    }
    if (type) {
      filtered = filtered.filter((p) => p.type === type);
    }

    const result = filtered.map((pkg) => ({
      id: pkg.id,
      slug: pkg.slug,
      title: pkg.title,
      dataAmount: pkg.dataAmount,
      validity: pkg.validity,
      price: pkg.retailPrice,
      currency: pkg.currency,
      type: pkg.type,
      destination: pkg.destination?.name,
      destinationCode: pkg.destination?.countryCode,
      provider: pkg.provider?.name,
      isUnlimited: pkg.isUnlimited,
      voiceCredits: pkg.voiceCredits,
      smsCredits: pkg.smsCredits,
    }));

    res.json({
      success: true,
      data: result,
      pagination: {
        total: result.length,
        limit: Number(limit),
        offset: Number(offset),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch Packages",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/packages/:id", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const pkg = await db.query.unifiedPackages.findFirst({
      where: eq(unifiedPackages.id, id),
      with: {
        provider: true,
        destination: true,
      },
    });

    if (!pkg) {
      res.status(404).json({
        success: false,
        error: "Package not found",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: pkg.id,
        slug: pkg.slug,
        title: pkg.title,
        dataAmount: pkg.dataAmount,
        validity: pkg.validity,
        price: pkg.retailPrice,
        currency: pkg.currency,
        type: pkg.type,
        destination: pkg.destination?.name,
        destinationCode: pkg.destination?.countryCode,
        provider: pkg.provider?.name,
        isUnlimited: pkg.isUnlimited,
        voiceCredits: pkg.voiceCredits,
        smsCredits: pkg.smsCredits,
        coverage: pkg.coverage,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch package",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/destinations", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allDestinations = await db.query.destinations.findMany({
      where: eq(destinations.active, true),
      orderBy: [destinations.name],
    });

    res.json({
      success: true,
      data: allDestinations.map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        countryCode: d.countryCode,
        flagEmoji: d.flagEmoji,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch destinations",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/destinations/:slug", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slug } = req.params;

    const destination = await db.query.destinations.findFirst({
      where: eq(destinations.slug, slug),
    });

    if (!destination) {
      res.status(404).json({
        success: false,
        error: "Destination not found",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const packages = await db.query.unifiedPackages.findMany({
      where: and(
        eq(unifiedPackages.destinationId, destination.id),
        eq(unifiedPackages.isEnabled, true)
      ),
      with: {
        provider: true,
      },
      orderBy: [unifiedPackages.retailPrice],
    });

    res.json({
      success: true,
      data: {
        destination: {
          id: destination.id,
          name: destination.name,
          slug: destination.slug,
          countryCode: destination.countryCode,
          flagEmoji: destination.flagEmoji,
        },
        packages: packages.map((pkg) => ({
          id: pkg.id,
          slug: pkg.slug,
          title: pkg.title,
          dataAmount: pkg.dataAmount,
          validity: pkg.validity,
          price: pkg.retailPrice,
          currency: pkg.currency,
          provider: pkg.provider?.name,
          isUnlimited: pkg.isUnlimited,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch destination",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/orders", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { packageId, quantity = 1, customer, webhookUrl, reference } = req.body;

    if (!packageId) {
      res.status(400).json({
        success: false,
        error: "Missing packageId",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!customer?.email) {
      res.status(400).json({
        success: false,
        error: "Missing customer email",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (quantity < 1 || quantity > 10) {
      res.status(400).json({
        success: false,
        error: "Quantity must be between 1 and 10",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const packageInfo = await resolvePackage(packageId);
    if (!packageInfo) {
      res.status(404).json({
        success: false,
        error: "Package not found",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const orderResult = await orderingEngine.createOrder({
      packageId: packageInfo.id,
      unifiedPackageId: packageInfo.id,
      quantity,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      source: "api",
      apiKeyId: req.apiKey?.id,
      webhookUrl,
      partnerReference: reference,
    });

    if (!orderResult.success) {
      res.status(500).json({
        success: false,
        error: orderResult.error || "Order creation failed",
        errorCode: orderResult.errorCode,
        failoverAttempts: orderResult.attempts.length,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const totalRetailPrice = orderResult.totalRetailPrice || 0;
    const totalWholesalePrice = orderResult.totalWholesalePrice || 0;

    const newOrder = await db
      .insert(orders)
      .values({
        packageId: packageInfo.id,
        providerId: orderResult.finalProviderId,
        providerOrderId: orderResult.providerOrderId,
        orderType: quantity > 1 ? "batch" : "single",
        quantity,
        iccid: orderResult.esimDetails?.[0]?.iccid,
        qrCode: orderResult.esimDetails?.[0]?.qrCode,
        qrCodeUrl: orderResult.esimDetails?.[0]?.qrCodeUrl,
        lpaCode: orderResult.esimDetails?.[0]?.lpaCode,
        smdpAddress: orderResult.esimDetails?.[0]?.smdpAddress,
        activationCode: orderResult.esimDetails?.[0]?.activationCode,
        status: "completed",
        price: totalRetailPrice.toFixed(2),
        wholesalePrice: totalWholesalePrice.toFixed(2),
        currency: packageInfo.currency,
        orderCurrency: packageInfo.currency,
        dataAmount: packageInfo.dataAmount,
        validity: packageInfo.validity,
        guestEmail: customer.email,
        guestPhone: customer.phone,
        orderSource: "api",
        originalProviderId: orderResult.originalProviderId,
        finalProviderId: orderResult.finalProviderId,
        failoverAttempts: orderResult.attempts,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: {
        orderId: newOrder[0].id,
        displayOrderId: newOrder[0].displayOrderId,
        status: newOrder[0].status,
        packageId: packageInfo.id,
        quantity,
        totalPrice: totalRetailPrice,
        currency: packageInfo.currency,
        esims: orderResult.esimDetails?.map((esim) => ({
          iccid: esim.iccid,
          qrCode: esim.qrCode,
          qrCodeUrl: esim.qrCodeUrl,
          smdpAddress: esim.smdpAddress,
          activationCode: esim.activationCode,
        })),
        failoverUsed: orderResult.failoverUsed,
        reference,
      },
      message: "Order created successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("API v1 create order error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create order",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/orders", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 20, offset = 0, status } = req.query;

    const allOrders = await db.query.orders.findMany({
      where: eq(orders.orderSource, "api"),
      orderBy: [desc(orders.createdAt)],
      limit: Math.min(Number(limit), 100),
      offset: Number(offset),
    });

    let filtered = allOrders;
    if (status) {
      filtered = allOrders.filter((o) => o.status === status);
    }

    res.json({
      success: true,
      data: filtered.map((order) => ({
        orderId: order.id,
        displayOrderId: order.displayOrderId,
        status: order.status,
        quantity: order.quantity,
        price: order.price,
        currency: order.currency,
        iccid: order.iccid,
        createdAt: order.createdAt,
      })),
      pagination: {
        total: filtered.length,
        limit: Number(limit),
        offset: Number(offset),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch Orders",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/orders/:id", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        package: true,
      },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: "Order not found",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      data: {
        orderId: order.id,
        displayOrderId: order.displayOrderId,
        status: order.status,
        quantity: order.quantity,
        price: order.price,
        currency: order.currency,
        dataAmount: order.dataAmount,
        validity: order.validity,
        iccid: order.iccid,
        qrCode: order.qrCode,
        qrCodeUrl: order.qrCodeUrl,
        smdpAddress: order.smdpAddress,
        activationCode: order.activationCode,
        directAppleUrl: order.directAppleUrl,
        apnType: order.apnType,
        apnValue: order.apnValue,
        activatedAt: order.activatedAt,
        expiresAt: order.expiresAt,
        usageData: order.usageData,
        failoverUsed: order.originalProviderId !== order.finalProviderId,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch order",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/orders/:id/cancel", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: "Order not found",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (order.status !== "pending" && order.status !== "processing") {
      res.status(400).json({
        success: false,
        error: "Order cannot be cancelled",
        message: `Order status is ${order.status}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await db
      .update(orders)
      .set({
        status: "cancelled",
        failureReason: reason || "Cancelled via API",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    res.json({
      success: true,
      data: {
        orderId: id,
        status: "cancelled",
      },
      message: "Order cancellation requested",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to cancel order",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/account", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const apiKeyRecord = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.id, req.apiKey!.id),
    });

    if (!apiKeyRecord) {
      res.status(404).json({
        success: false,
        error: "API key not found",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      data: {
        name: apiKeyRecord.name,
        keyPrefix: apiKeyRecord.apiKeyPrefix,
        isActive: apiKeyRecord.isActive,
        rateLimit: apiKeyRecord.rateLimit,
        permissions: apiKeyRecord.permissions,
        requestCount: apiKeyRecord.requestCount,
        lastUsedAt: apiKeyRecord.lastUsedAt,
        expiresAt: apiKeyRecord.expiresAt,
        createdAt: apiKeyRecord.createdAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch account info",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/account/usage", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const apiKeyRecord = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.id, req.apiKey!.id),
    });

    const totalOrders = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.orderSource, "api"));

    res.json({
      success: true,
      data: {
        totalRequests: apiKeyRecord?.requestCount || 0,
        totalOrders: Number(totalOrders[0]?.count || 0),
        rateLimit: apiKeyRecord?.rateLimit || 100,
        lastUsedAt: apiKeyRecord?.lastUsedAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch usage stats",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
