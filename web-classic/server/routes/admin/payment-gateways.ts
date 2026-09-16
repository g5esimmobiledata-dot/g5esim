import { Router } from 'express';
import { and, eq, isNull, asc } from 'drizzle-orm';
import { db } from 'server/db';
import {
  paymentGateways,
  createPaymentGatewaySchema,
  updatePaymentGatewaySchema,
  supportedCurrency,
} from '@shared/schema';
import { requireAdmin } from 'server/lib/middleware';
import { ensurePaymentGatewayOwnershipColumn } from 'server/utils/paymentGatewayOwnership';

const router = Router();

/* ======================================================
   GET: All payment gateways (Admin)
====================================================== */
router.get('/', requireAdmin, async (_req, res) => {
  await ensurePaymentGatewayOwnershipColumn();

  const rows = await db
    .select({
      gatewayId: paymentGateways.id,
      provider: paymentGateways.provider,
      displayName: paymentGateways.displayName,
      isEnabled: paymentGateways.isEnabled,
      publicKey: paymentGateways.publicKey,
      secretKey: paymentGateways.secretKey,
      webhookSecret: paymentGateways.webhookSecret,
      config: paymentGateways.config,
      currencyId: supportedCurrency.currencyId,
    })
    .from(paymentGateways)
    .leftJoin(supportedCurrency, eq(paymentGateways.id, supportedCurrency.paymentGatewayId))
    .where(isNull(paymentGateways.resellerId))
    .orderBy(asc(paymentGateways.provider), asc(paymentGateways.displayName));

  // 🧠 Group currencies per gateway
  const gatewaysMap = new Map<string, any>();

  for (const row of rows) {
    if (!gatewaysMap.has(row.gatewayId)) {
      gatewaysMap.set(row.gatewayId, {
        id: row.gatewayId,
        provider: row.provider,
        displayName: row.displayName,
        isEnabled: row.isEnabled,
        publicKey: row.publicKey,
        secretKey: row.secretKey,
        webhookSecret: row.webhookSecret,
        config: row.config,
        supportedCurrencies: [],
      });
    }

    if (row.currencyId) {
      gatewaysMap.get(row.gatewayId).supportedCurrencies.push({
        currencyId: row.currencyId,
      });
    }

  }

  res.json({
    success: true,
    data: Array.from(gatewaysMap.values()),
  });
});

/* ======================================================
   POST: Create payment gateway
====================================================== */
router.post('/', requireAdmin, async (req, res) => {
  await ensurePaymentGatewayOwnershipColumn();
  const data = createPaymentGatewaySchema.parse(req.body);

  // ❗ Prevent duplicate displayName per provider
  const existing = await db
    .select({ id: paymentGateways.id })
    .from(paymentGateways)
    .where(
      and(
        eq(paymentGateways.provider, data.provider),
        eq(paymentGateways.displayName, data.displayName),
        isNull(paymentGateways.resellerId),
      ),
    );

  if (existing.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Display name already exists for this provider',
    });
  }

  const gateway = await db.transaction(async (tx) => {
    // 1️⃣ Insert gateway
    const [gateway] = await tx
      .insert(paymentGateways)
      .values({
        provider: data.provider,
        displayName: data.displayName,
        publicKey: data.publicKey ?? null,
        secretKey: data.secretKey ?? null,
        webhookSecret: data.webhookSecret ?? null,
        config: data.config ?? {},
        isEnabled: data.isEnabled ?? false,
      })
      .returning();

    // 2️⃣ Insert supported currencies
    await tx.insert(supportedCurrency).values(
      data.supportedCurrencies.map((item) => ({
        paymentGatewayId: gateway.id,
        currencyId: item.currencyId, // <-- VARCHAR
      })),
    );

    return gateway;
  });

  res.status(201).json({
    success: true,
    message: 'Payment gateway added',
    data: gateway,
  });
});

/* ======================================================
   PUT: Update payment gateway
====================================================== */
router.put('/:id', requireAdmin, async (req, res) => {
  await ensurePaymentGatewayOwnershipColumn();
  const { id } = req.params;
  const data = updatePaymentGatewaySchema.parse(req.body);

  const updatedGateway = await db.transaction(async (tx) => {
    // 1️⃣ Update payment gateway
    const [updated] = await tx
      .update(paymentGateways)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(paymentGateways.id, id), isNull(paymentGateways.resellerId)))
      .returning();

    if (!updated) {
      return null;
    }

    // 2️⃣ Sync supported currencies (if provided)
    if (data.supportedCurrencies) {
      // Remove old currencies
      await tx.delete(supportedCurrency).where(eq(supportedCurrency.paymentGatewayId, id));

      // Insert new currencies
      await tx.insert(supportedCurrency).values(
        data.supportedCurrencies.map((item) => ({
          paymentGatewayId: id,
          currencyId: item.currencyId, // VARCHAR
        })),
      );
    }

    return updated;
  });

  if (!updatedGateway) {
    return res.status(404).json({
      success: false,
      message: 'Gateway not found',
    });
  }

  res.json({
    success: true,
    message: 'Payment gateway updated',
    data: updatedGateway,
  });
});

/* ======================================================
   PATCH: Enable / Disable gateway
====================================================== */
router.patch('/:id/status', requireAdmin, async (req, res) => {
  await ensurePaymentGatewayOwnershipColumn();
  const { id } = req.params;
  const { isEnabled } = req.body;

  if (typeof isEnabled !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'isEnabled must be boolean',
    });
  }

  const result = await db
    .update(paymentGateways)
    .set({
      isEnabled,
      updatedAt: new Date(),
    })
    .where(and(eq(paymentGateways.id, id), isNull(paymentGateways.resellerId)))
    .returning({ id: paymentGateways.id });

  if (result.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Gateway not found',
    });
  }

  res.json({
    success: true,
    message: 'Gateway status updated',
  });
});

/* ======================================================
   DELETE: Delete gateway
====================================================== */
router.delete('/:id', requireAdmin, async (req, res) => {
  await ensurePaymentGatewayOwnershipColumn();
  const { id } = req.params;

  const deleted = await db
    .delete(paymentGateways)
    .where(and(eq(paymentGateways.id, id), isNull(paymentGateways.resellerId)))
    .returning({ id: paymentGateways.id });

  if (deleted.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Gateway not found',
    });
  }

  res.json({
    success: true,
    message: 'Payment gateway deleted',
  });
});

export default router;
