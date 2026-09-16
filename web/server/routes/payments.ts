import { Router, type Request, type Response } from 'express';
import { eq, asc, desc, and, isNull, or, sql } from 'drizzle-orm';
import { db } from 'server/db';
import { paymentGateways, supportedCurrency, currencyRates, orders, users, walletTransactions } from '@shared/schema';
import { initStripePayment } from '../helpers/payments/stripe';
import { initRazorpayPayment } from '../helpers/payments/razorpay';
import { initPaypalPayment } from '../helpers/payments/paypal';
import { initPaystackPayment } from '../helpers/payments/paystack';
import { requireAuth, optionalAuth } from 'server/lib/middleware';
import { calculateFinalPrice } from 'server/helpers/calculatePricing';
import verifyPaypal from 'server/helpers/payments/verify/paypal';
import verifyPaystack from 'server/helpers/payments/verify/paystack';
import verifyRazorpay from 'server/helpers/payments/verify/razorpay';
import verifyStripe from 'server/helpers/payments/verify/stripe';
import {
  initNowPaymentsPayment,
  verifyNowPaymentsIpnSignature,
  verifyNowPaymentsPayment,
} from 'server/helpers/payments/nowpayments';
import {
  initCryptomusPayment,
  verifyCryptomusPayment,
  verifyCryptomusWebhookSignature,
} from 'server/helpers/payments/cryptomus';
import {
  initAyaMerchantPayment,
  verifyAyaMerchantPayment,
} from 'server/helpers/payments/ayamerchant';
import crypto from 'crypto';
import { storage } from 'server/storage';
import { confirmPowertranzPayment, initPowertranzSpiSale } from 'server/services/powertranz.service';
import { initPowertranzHpp } from 'server/services/powertranz-hpp.service';
import { getRequestPricingRole } from 'server/helpers/packagePricing';
import { ensurePaymentGatewayOwnershipColumn } from 'server/utils/paymentGatewayOwnership';
import { isSandboxDemoModeForUser } from 'server/utils/sandboxDemo';
import { awardMemberReward } from 'server/services/member-rewards-service';
import { orderingEngine } from 'server/services/ordering';
import {
  fetchProviderTopupPackages,
  findProviderTopupPackage,
  getTopupWholesalePrice,
} from 'server/services/topup-packages';
import {
  generateInstallationEmail,
  generateInstallationQrAttachment,
  generateOrderConfirmationEmail,
  sendEmail,
} from 'server/email';
// import { confirmPowertranzPayment } from 'server/helpers/payments/verify/confirmPowertranzPayment';
// import { initPowertranzSpiSale } from 'server/helpers/payments/powertranz';

const router = Router();

function getInternalApiBaseUrl() {
  const rawUrl = (
    process.env.INTERNAL_API_BASE_URL ||
    `http://127.0.0.1:${process.env.PORT || 5000}`
  ).trim().replace(/\/$/, '');
  return /^https?:\/\//i.test(rawUrl) ? rawUrl : `http://${rawUrl}`;
}

router.use(async (_req, _res, next) => {
  try {
    await ensurePaymentGatewayOwnershipColumn();
    next();
  } catch (error) {
    next(error);
  }
});

async function loadEnabledGatewaysForOwner({
  currencyId,
  ownerResellerId,
}: {
  currencyId?: string;
  ownerResellerId?: string | null;
}) {
  const ownerCondition = ownerResellerId
    ? eq(paymentGateways.resellerId, ownerResellerId)
    : isNull(paymentGateways.resellerId);

  if (!currencyId) {
    return db
      .select({
        id: paymentGateways.id,
        provider: paymentGateways.provider,
        displayName: paymentGateways.displayName,
        publicKey: paymentGateways.publicKey,
        secretKey: paymentGateways.secretKey,
      })
      .from(paymentGateways)
      .where(and(eq(paymentGateways.isEnabled, true), ownerCondition))
      .orderBy(asc(paymentGateways.provider), asc(paymentGateways.displayName));
  }

  return db
    .select({
      id: paymentGateways.id,
      provider: paymentGateways.provider,
      displayName: paymentGateways.displayName,
      publicKey: paymentGateways.publicKey,
      secretKey: paymentGateways.secretKey,
    })
    .from(paymentGateways)
    .innerJoin(supportedCurrency, eq(paymentGateways.id, supportedCurrency.paymentGatewayId))
    .where(
      and(
        eq(paymentGateways.isEnabled, true),
        ownerCondition,
        eq(supportedCurrency.currencyId, currencyId),
      ),
    )
    .orderBy(asc(paymentGateways.provider), asc(paymentGateways.displayName));
}

function isGatewayReadyForCheckout(gateway: {
  provider: string;
  publicKey?: string | null;
  secretKey?: string | null;
}) {
  const publicKey = String(gateway.publicKey || "").trim();
  const secretKey = String(gateway.secretKey || "").trim();

  if (gateway.provider === "stripe" || gateway.provider === "paypal") {
    return Boolean(publicKey && secretKey);
  }

  if (gateway.provider === "nowpayments") {
    return Boolean(secretKey);
  }

  if (gateway.provider === "ayamerchant") {
    return Boolean(secretKey);
  }

  if (gateway.provider === "cryptomus") {
    return Boolean(publicKey && secretKey);
  }

  return true;
}

function preparePublicGateways<T extends { secretKey?: string | null; provider: string; publicKey?: string | null }>(
  gateways: T[],
) {
  return gateways
    .filter(isGatewayReadyForCheckout)
    .map(({ secretKey: _secretKey, ...gateway }) => gateway);
}

function allowsCryptoGateways(scope: string) {
  return ['wallet', 'checkout', 'package'].includes(scope.toLowerCase());
}

function toMoney(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : NaN;
}

function money(value: number): string {
  return value.toFixed(2);
}

function normalizeCurrency(value: unknown): string {
  const currency = String(value ?? '').trim();
  if (!currency || currency.toLowerCase() === 'null' || currency.toLowerCase() === 'undefined') {
    return 'USD';
  }
  return currency.toUpperCase();
}

function hasCurrencyFilter(value: unknown): boolean {
  const currency = String(value ?? '').trim().toLowerCase();
  return Boolean(currency && currency !== 'null' && currency !== 'undefined');
}

function getRequestBaseUrl(req: any) {
  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const proto = forwardedProto || req.protocol || 'https';
  const host = req.get('host');
  return `${proto}://${host}`;
}

function buildPaymentProcessingUrl(req: any, params: Record<string, unknown>) {
  const url = new URL(`${getRequestBaseUrl(req)}/order/processing`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function buildPackagePaymentMetadata({
  packageId,
  quantity,
  orderId,
  userId,
  email,
  phone,
  promoCode,
  promoType,
  voucherId,
  giftCardId,
  referralCredits,
  promoDiscount,
  resellerId,
  storefrontHost,
  storefrontSubdomain,
  priceType,
  paymentMethodType,
  checkoutAmount,
  checkoutCurrency,
  walletDebitAmountUsd,
  existingOrderId,
}: Record<string, any>) {
  return {
    type: userId ? 'package_purchase' : 'guest_purchase',
    packageId,
    quantity: String(quantity || 1),
    orderId,
    userId: userId || '',
    guestEmail: email || '',
    guestPhone: phone || '',
    promoCode: promoCode || '',
    promoType: promoType || '',
    voucherId: voucherId || '',
    giftCardId: giftCardId || '',
    referralCredits: String(referralCredits || 0),
    promoDiscount: String(promoDiscount || 0),
    resellerId: resellerId || '',
    storefrontHost: storefrontHost || '',
    storefrontSubdomain: storefrontSubdomain || '',
    priceType: priceType || 'retail',
    paymentMethodType,
    checkoutAmount: String(checkoutAmount ?? ''),
    checkoutCurrency: checkoutCurrency || 'USD',
    walletDebitAmountUsd: walletDebitAmountUsd ? String(walletDebitAmountUsd) : '',
    existingOrderId: existingOrderId || '',
  };
}

function hasProviderFulfillment(order: any) {
  return Boolean(order?.iccid) && (
    Boolean(order?.providerOrderId) ||
    Boolean(order?.airaloOrderId) ||
    Boolean(order?.qrCode) ||
    Boolean(order?.qrCodeUrl) ||
    Boolean(order?.activationCode) ||
    Boolean(order?.smdpAddress)
  );
}

function buildLpaCode(value: any) {
  const lpaCode = typeof value?.lpaCode === 'string' ? value.lpaCode.trim() : '';
  if (lpaCode.startsWith('LPA:')) return lpaCode;

  const qrCode = typeof value?.qrCode === 'string' ? value.qrCode.trim() : '';
  if (qrCode.startsWith('LPA:')) return qrCode;

  const activationCode =
    typeof value?.activationCode === 'string'
      ? value.activationCode.replace(/^LPA:1\$[^$]+\$/i, '').trim()
      : '';
  const smdpAddress =
    typeof value?.smdpAddress === 'string' ? value.smdpAddress.trim() : '';

  return smdpAddress && activationCode
    ? `LPA:1$${smdpAddress}$${activationCode}`
    : '';
}

async function normalizeStoredInstallationData(order: any) {
  const lpaCode = buildLpaCode(order);
  if (!lpaCode) return order;

  const needsUpdate =
    order.lpaCode !== lpaCode ||
    !order.qrCode ||
    !String(order.qrCode).startsWith('LPA:');

  if (!needsUpdate) return order;

  return storage.updateOrder(order.id, {
    lpaCode,
    qrCode: lpaCode,
  });
}

async function loadOrderEmailContext(order: any, metadata: Record<string, any>) {
  const pkg = order?.packageId
    ? await storage.getUnifiedPackageById(order.packageId).catch(() => null)
    : null;
  const destination = pkg?.destinationId
    ? await storage.getDestinationById(pkg.destinationId).catch(() => null)
    : null;
  const pkgAny: any = pkg || {};
  const dataAmount = order?.dataAmount || pkg?.dataAmount || metadata.dataAmount || 'N/A';
  const validity = order?.validity || pkg?.validity || metadata.validity || 'N/A';
  const packageName =
    pkgAny.title ||
    pkgAny.name ||
    metadata.packageName ||
    (dataAmount !== 'N/A' && validity !== 'N/A'
      ? `${dataAmount} - ${validity} Days`
      : 'Your eSIM package');

  return {
    pkg,
    destination,
    dataAmount,
    validity,
    packageName,
    destinationName:
      metadata.destination ||
      metadata.country ||
      destination?.name ||
      pkg?.countryCode ||
      'Destination',
  };
}

async function sendInstallationEmailForOrder(order: any, metadata: Record<string, any>) {
  if (!order?.id || order.installationSent) return order;

  const normalizedOrder = await normalizeStoredInstallationData(order);
  const customer = normalizedOrder.userId
    ? await storage.getUser(normalizedOrder.userId)
    : null;
  const email =
    customer?.email ||
    normalizedOrder.guestEmail ||
    metadata.guestEmail ||
    metadata.email ||
    '';

  if (!email || !hasProviderFulfillment(normalizedOrder)) {
    return normalizedOrder;
  }

  try {
    const emailContext = await loadOrderEmailContext(normalizedOrder, metadata);
    const customerName = customer?.name || metadata.name || 'Customer';
    const confirmationEmail = await generateOrderConfirmationEmail({
      id: normalizedOrder.displayOrderId || normalizedOrder.id,
      displayId: normalizedOrder.displayOrderId || normalizedOrder.id,
      customerName,
      destination: emailContext.destinationName,
      dataAmount: emailContext.dataAmount,
      validity: emailContext.validity,
      price: normalizedOrder.price,
      iccid: normalizedOrder.iccid,
      qrCodeUrl: normalizedOrder.qrCodeUrl,
    });

    await sendEmail({
      to: email,
      subject: confirmationEmail.subject,
      html: confirmationEmail.html,
      requireDelivery: true,
    });

    const qrCodeCid = 'esim-qr-code';
    const qrAttachment = await generateInstallationQrAttachment(normalizedOrder, qrCodeCid);
    const installEmail = await generateInstallationEmail({
      name: customerName,
      packageName: emailContext.packageName,
      qrCodeCid: qrAttachment ? qrCodeCid : undefined,
      qrCodeUrl: normalizedOrder.qrCodeUrl,
      iccid: normalizedOrder.iccid,
      activationCode: normalizedOrder.activationCode,
      smdpAddress: normalizedOrder.smdpAddress,
      qrCode: normalizedOrder.qrCode,
      lpaCode: normalizedOrder.lpaCode,
    });

    await sendEmail({
      to: email,
      subject: installEmail.subject,
      html: installEmail.html,
      attachments: qrAttachment ? [qrAttachment] : undefined,
      requireDelivery: true,
    });

    return storage.updateOrder(normalizedOrder.id, { installationSent: true });
  } catch (emailError) {
    console.warn('Installation email failed:', emailError);
    return normalizedOrder;
  }
}

async function finalizeExistingPackageOrder({
  orderId,
  metadata,
  paymentProvider,
  transactionId,
}: {
  orderId: string;
  metadata: Record<string, any>;
  paymentProvider: string;
  transactionId: string;
}) {
  const existingOrder = orderId ? await storage.getOrderById(orderId) : null;
  if (!existingOrder) {
    throw new Error('Paid order was not found');
  }

  if (hasProviderFulfillment(existingOrder)) {
    return sendInstallationEmailForOrder(existingOrder, metadata);
  }

  await storage.updateOrder(existingOrder.id, {
    status: 'processing',
    paymentMethod: paymentProvider,
  });

  const customer = existingOrder.userId
    ? await storage.getUser(existingOrder.userId)
    : null;

  const providerResult = await orderingEngine.createOrder({
    packageId: existingOrder.packageId,
    unifiedPackageId: existingOrder.packageId,
    quantity: Number(existingOrder.quantity || metadata.quantity || 1) || 1,
    customerEmail:
      customer?.email ||
      existingOrder.guestEmail ||
      metadata.guestEmail ||
      metadata.email ||
      `paid-order-${existingOrder.id}@local`,
    customerPhone:
      customer?.phone ||
      existingOrder.guestPhone ||
      metadata.guestPhone ||
      metadata.phone ||
      undefined,
    transactionId: transactionId || `PAYMENT-${existingOrder.id}-${Date.now()}`,
    source: 'mobile',
    userId: existingOrder.userId,
    orderId: existingOrder.id,
    partnerReference: `Order ${existingOrder.id}`,
  });

  if (!providerResult.success) {
    await storage.updateOrder(existingOrder.id, {
      status: 'failed',
      failureReason: providerResult.error || 'Provider order failed',
    });
    throw new Error(providerResult.error || 'Provider order failed');
  }

  const esimDetails = providerResult.esimDetails?.[0];
  const lpaCode = buildLpaCode(esimDetails);
  const fulfilledOrder = await storage.updateOrder(existingOrder.id, {
    status: 'completed',
    providerOrderId: providerResult.providerOrderId || providerResult.orderId,
    airaloOrderId: providerResult.providerOrderId || providerResult.orderId,
    originalProviderId: providerResult.originalProviderId,
    finalProviderId: providerResult.finalProviderId,
    failoverAttempts: providerResult.attempts,
    iccid: esimDetails?.iccid,
    qrCode: lpaCode || esimDetails?.qrCode,
    qrCodeUrl: esimDetails?.qrCodeUrl,
    lpaCode: lpaCode || esimDetails?.lpaCode || esimDetails?.qrCode,
    activationCode: esimDetails?.activationCode,
    smdpAddress: esimDetails?.smdpAddress,
    directAppleUrl: esimDetails?.directAppleUrl,
    apnType: esimDetails?.apnType,
    apnValue: esimDetails?.apnValue,
  });

  const emailedOrder = await sendInstallationEmailForOrder(fulfilledOrder, metadata);

  if (existingOrder.userId) {
    await storage.createNotification({
      userId: existingOrder.userId,
      type: 'purchase',
      title: 'Order Confirmed',
      message: 'Your eSIM order is ready.',
      read: false,
      metadata: {
        orderId: existingOrder.id,
        iccid: esimDetails?.iccid,
      },
    }).catch((error) => {
      console.warn('Order confirmation notification failed:', error);
    });
  }

  return emailedOrder;
}

router.get('/gateways', async (req, res) => {
  const currencyCode = hasCurrencyFilter(req.query.currency)
    ? normalizeCurrency(req.query.currency)
    : undefined;
  const scope = String(req.query.scope || '');
  const pricingRole = await getRequestPricingRole(req);
  const storefrontResellerId = pricingRole.source === 'storefront' ? pricingRole.resellerId : null;

  const inAppPurchaseSetting = await storage.getSettingByKey('in_app_purchase') || false;
  const inAppPurchase = inAppPurchaseSetting?.value === 'true';

  // gateways is an array
  let gateways;

  // 👉 CASE 1: currency NOT provided → show all enabled gateways
  if (!currencyCode) {
    gateways = preparePublicGateways(await loadEnabledGatewaysForOwner({ ownerResellerId: storefrontResellerId }));

    if (storefrontResellerId && gateways.length === 0) {
      gateways = preparePublicGateways(await loadEnabledGatewaysForOwner({ ownerResellerId: null }));
    }

    if (!allowsCryptoGateways(scope)) {
      gateways = gateways.filter((gateway) => !['nowpayments', 'cryptomus'].includes(gateway.provider));
    }

    return res.json({
      success: true,
      data: gateways,
      inAppPurchase,
      note: 'All enabled gateways (no currency filter)',
    });
  }

  // 👉 CASE 2: currency provided → validate
  const [currency] = await db
    .select({ id: currencyRates.id })
    .from(currencyRates)
    .where(eq(currencyRates.code, currencyCode));

  if (!currency) {
    return res.status(400).json({
      success: false,
      message: `Unsupported currency: ${currencyCode}`,
    });
  }

  // 👉 CASE 3: currency based filtering
  gateways = preparePublicGateways(await loadEnabledGatewaysForOwner({
    currencyId: currency.id,
    ownerResellerId: storefrontResellerId,
  }));

  if (storefrontResellerId && gateways.length === 0) {
    gateways = preparePublicGateways(await loadEnabledGatewaysForOwner({
      currencyId: currency.id,
      ownerResellerId: null,
    }));
  }

  if (!allowsCryptoGateways(scope)) {
    gateways = gateways.filter((gateway) => !['nowpayments', 'cryptomus'].includes(gateway.provider));
  }

  res.json({
    success: true,
    data: gateways,
    inAppPurchase,
    currency: currencyCode,
  });
});


// router.post('/init', optionalAuth, async (req, res) => {
//   try {
//     const {
//       gatewayId,
//       packageId,
//       quantity = 1,
//       currency,
//       orderId,
//       promoCode,
//       promoType,
//       voucherId,
//       giftCardId,
//       referralCredits,
//       email,
//       name,
//       phone,
//     } = req.body;

//     const guestAccessToken = req.userId ? null : crypto.randomUUID();

//     /* ---------------- Validation ---------------- */
//     if (!packageId || !orderId || !currency) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required fields',
//       });
//     }

//     if (!req.userId && !email) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email is required for guest checkout',
//       });
//     }

//     /* ---------------- Pricing ---------------- */
//     const pricing = await calculateFinalPrice({
//       packageId,
//       quantity,
//       requestedCurrency: currency,
//       promoCode,
//       promoType,
//       voucherId,
//       giftCardId,
//       referralCredits,
//       userId: req.userId,
//     });

//     /* ---------------- Gateway ---------------- */
//     const [gateway] = await db
//       .select()
//       .from(paymentGateways)
//       .where(eq(paymentGateways.id, gatewayId));

//     if (!gateway || !gateway.isEnabled) {
//       return res.status(400).json({
//         success: false,
//         message: 'Selected payment gateway is disabled',
//       });
//     }

//     let result: any;

//     const payment = {
//       provider: gateway.provider,
//       clientSecret: null as string | null,
//       paymentIntentId: null as string | null,
//       orderId: null as string | null,
//       redirectUrl: null as string | null,
//       publicKey: null as string | null,
//       guestAccessToken: guestAccessToken,
//       amount: null as number | null,
//       currency: currency,
//     };

//     /* ---------------- Init Payment ---------------- */
//     switch (gateway.provider) {

//       case 'stripe':
//         result = await initStripePayment({
//           secretKey: gateway.secretKey!,
//           amount: pricing.total,
//           currency,
//           packageId,
//           quantity,
//           orderId,
//           userId: req.userId,
//           email,
//           name,
//           phone,
//           metadata: {
//             promoCode,
//             promoType,
//             voucherId,
//             giftCardId,
//             referralCredits,
//             promoDiscount: pricing?.discount,
//           },
//         });

//         payment.clientSecret = result.clientSecret;
//         payment.paymentIntentId = result.paymentIntentId;
//         payment.guestAccessToken = result.guestAccessToken ?? null;
//         payment.amount = pricing.total;
//         payment.currency = currency;
//         break;
//       case 'razorpay':
//         result = await initRazorpayPayment({
//           keyId: gateway.publicKey!,
//           secretKey: gateway.secretKey!,
//           amount: pricing.total,
//           currency,
//           orderId,
//           packageId,
//           quantity,
//           email: email || undefined,
//           phone,
//           guestAccessToken: payment.guestAccessToken,
//           userId: req.userId,
//           promoCode,
//           promoType,
//           voucherId,
//           giftCardId,
//           referralCredits,
//           promoDiscount: pricing?.discount,
//         });

//         payment.orderId = result.orderId;
//         payment.publicKey = result.keyId;
//         payment.amount = Math.round(pricing.total * 100);
//         payment.currency = currency;
//         break;

//       case 'paypal':
//         result = await initPaypalPayment({
//           clientId: gateway.publicKey!,
//           secretKey: gateway.secretKey!,
//           amount: pricing.total,
//           currency,
//           packageId,
//           quantity,
//           email: email || undefined,
//           phone: phone,
//           guestAccessToken: payment.guestAccessToken,
//           userId: req.userId,
//           promoCode,
//           promoType,
//           voucherId,
//           giftCardId,
//           referralCredits,
//           promoDiscount: pricing?.discount,
//         });

//         payment.orderId = result.orderId;
//         payment.amount = pricing.total;
//         payment.currency = currency;
//         break;

//       case 'paystack':
//         if (!email) {
//           return res.status(400).json({
//             success: false,
//             message: 'Email is required for Paystack payment',
//           });
//         }

//         result = await initPaystackPayment({
//           secretKey: gateway.secretKey!,
//           email,
//           amount: pricing.total,
//           currency,
//           promoCode,
//           promoType,
//           voucherId,
//           giftCardId,
//           referralCredits,
//         });

//         payment.orderId = result.reference;
//         payment.redirectUrl = result.authorizationUrl;
//         payment.amount = Math.round(pricing.total * 100);
//         payment.currency = currency;
//         break;


//       case "powertranz":
//         result = await initPowertranzSpiSale({
//           merchantId: gateway.publicKey!,
//           merchantPassword: gateway.secretKey!,
//           amount: pricing.total,
//           orderId,
//           currency,
//           email,
//           name,
//           // card: req.body.card, // 🔥 REQUIRED
//           card: {
//             pan: "4012000000020006",
//             cvv: "323",
//             expiry: "2310",
//           },
//         });

//         payment.provider = "powertranz";
//         payment.amount = pricing.total;
//         payment.currency = currency;

//         return res.json({
//           success: true,
//           message: "3DS authentication required",
//           pricing,
//           powertranz: {
//             orderId,
//             redirectData: result.redirectData, // 🔥 frontend iframe
//             spiToken: result.spiToken,         // store client-side for confirm
//           },
//         });
//       default:
//         return res.status(400).json({
//           success: false,
//           message: 'Unsupported payment provider',
//         });
//     }
//     /* ---------------- Final Response ---------------- */
//     return res.json({
//       success: true,
//       message: 'Payment initialized successfully',
//       pricing,
//       payment,
//     });
//   } catch (error: any) {
//     console.error('Payment init error:', error);

//     return res.status(500).json({
//       success: false,
//       message: error?.message || error?.error || 'Payment initialization failed',
//     });
//   }
// });


/**
 * Initialize Payment
 * Supports: Stripe, Razorpay, PayPal, Paystack, PowerTranz (SPI), PowerTranz (HPP)
 */
router.post('/init', optionalAuth, async (req, res) => {
  try {
    const {
      gatewayId,
      packageId,
      quantity = 1,
      currency: rawCurrency,
      orderId,
      promoCode,
      promoType,
      voucherId,
      giftCardId,
      referralCredits,
      email,
      name,
      phone,
      card, // 🔥 Card data from frontend (only for PowerTranz SPI)
      paymentMethod = 'spi', // 'spi' or 'hpp' for PowerTranz
    } = req.body;

    const currency = normalizeCurrency(rawCurrency);
    const guestAccessToken = req.userId ? null : crypto.randomUUID();

    /* ---------------- Validation ---------------- */
    if (!packageId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    if (!req.userId && !email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for guest checkout',
      });
    }

    const pricingRole = await getRequestPricingRole(req);

    /* ---------------- Pricing ---------------- */
    const pricing = await calculateFinalPrice({
      packageId,
      quantity,
      requestedCurrency: currency,
      promoCode,
      promoType,
      voucherId,
      giftCardId,
      referralCredits,
      userId: req.userId,
      resellerId: pricingRole.resellerId,
    });

    /* ---------------- FREE ORDER BYPASS ---------------- */
    // If entire order is covered by promo/credits, directly confirm without gateway
    if (pricing.total <= 0) {
      console.log('🎉 Processing FREE order via giftcard/promo:', orderId);
      return res.json({
        success: true,
        builtInComplete: true,
        message: 'Order fully covered by promotions',
        payment: {
          provider: 'free',
          guestAccessToken,
          amount: 0,
          currency,
          orderId,
        },
        pricing,
      });
    }

    const sandboxMode = await isSandboxDemoModeForUser(req.userId);
    if (sandboxMode && paymentMethod !== 'wallet') {
      return res.status(400).json({
        success: false,
        message: 'Sandbox mode is active. Add sandbox wallet funds and pay with wallet.',
      });
    }

    if (paymentMethod === 'wallet') {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Login is required to pay from wallet',
        });
      }

      const normalizedCurrency = normalizeCurrency(currency);
      const checkoutAmount = toMoney(pricing.total);
      const walletDebitAmountUsd = toMoney(pricing.totalUSD ?? pricing.total);

      if (
        !Number.isFinite(checkoutAmount) ||
        checkoutAmount <= 0 ||
        !Number.isFinite(walletDebitAmountUsd) ||
        walletDebitAmountUsd <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid wallet payment amount',
        });
      }

      const pkg = await storage.getUnifiedPackageById(packageId);
      if (!pkg) {
        return res.status(404).json({ success: false, message: 'Package not found' });
      }

      const [existingWalletPayment] = await db
        .select({
          order: orders,
          transaction: walletTransactions,
        })
        .from(walletTransactions)
        .innerJoin(orders, eq(walletTransactions.referenceId, orders.id))
        .where(
          and(
            eq(walletTransactions.userId, req.userId!),
            eq(walletTransactions.type, 'purchase_debit'),
            eq(walletTransactions.status, 'completed'),
            eq(orders.packageId, pkg.id),
            isNull(orders.iccid),
            or(
              eq(orders.status, 'pending'),
              eq(orders.status, 'processing'),
              eq(orders.status, 'failed'),
            ),
            sql`${orders.createdAt} > now() - interval '60 minutes'`,
          ),
        )
        .orderBy(desc(walletTransactions.createdAt))
        .limit(1);

      if (existingWalletPayment) {
        const user = await storage.getUser(req.userId);
        const existingMetadata =
          (existingWalletPayment.transaction.metadata as Record<string, unknown>) || {};

        return res.json({
          success: true,
          builtInComplete: false,
          message: 'Existing wallet payment found. Confirming eSIM order...',
          payment: {
            provider: 'wallet',
            walletTransactionId: existingWalletPayment.transaction.id,
            orderId: existingWalletPayment.order.id,
            amount: checkoutAmount,
            currency: normalizedCurrency,
            walletDebitAmountUsd: toMoney(existingWalletPayment.transaction.amount),
            balance: money(toMoney(user?.walletBalance || '0.00')),
            metadata: existingMetadata,
          },
          pricing,
        });
      }

      const result = await db.transaction(async (tx) => {
        const [updatedUser] = await tx
          .update(users)
          .set({
            walletBalance: sql`${users.walletBalance}::numeric - ${walletDebitAmountUsd}`,
            updatedAt: new Date(),
          })
          .where(and(eq(users.id, req.userId!), sql`${users.walletBalance}::numeric >= ${walletDebitAmountUsd}`))
          .returning();

        if (!updatedUser) {
          throw new Error('Insufficient wallet balance');
        }

        const balanceAfter = toMoney(updatedUser.walletBalance || '0.00');
        const balanceBefore = balanceAfter + walletDebitAmountUsd;

        const [pendingOrder] = await tx
          .insert(orders)
          .values({
            userId: req.userId,
            packageId: pkg.id,
            providerId: pkg.providerId,
            orderType: Number(quantity) > 1 ? 'batch' : 'single',
            quantity: Math.max(1, Number(quantity) || 1),
            status: 'pending',
            price: money(checkoutAmount),
            airaloPrice: (pkg as any).airaloPrice || (pkg as any).wholesalePrice || null,
            wholesalePrice: (pkg as any).wholesalePrice || null,
            currency: normalizedCurrency,
            orderCurrency: normalizedCurrency,
            dataAmount: pkg.dataAmount,
            validity: pkg.validity,
            installationSent: false,
            paymentMethod: 'wallet',
            resellerId: pricingRole.resellerId || null,
            storefrontHost: pricingRole.storefrontHost || null,
          })
          .returning();

        const metadata = buildPackagePaymentMetadata({
          packageId,
          quantity,
          orderId,
          userId: req.userId,
          email,
          phone,
          promoCode,
          promoType,
          voucherId,
          giftCardId,
          referralCredits,
          promoDiscount: pricing?.discount,
          resellerId: pricingRole.resellerId || '',
          storefrontHost: pricingRole.storefrontHost || '',
          storefrontSubdomain: pricingRole.storefrontSubdomain || '',
          priceType: pricingRole.priceType,
          paymentMethodType: 'wallet',
          checkoutAmount,
          checkoutCurrency: normalizedCurrency,
          walletDebitAmountUsd,
          existingOrderId: pendingOrder.id,
        });

        const [transaction] = await tx
          .insert(walletTransactions)
          .values({
            userId: req.userId!,
            type: 'purchase_debit',
            status: 'completed',
            amount: money(walletDebitAmountUsd),
            currency: 'USD',
            balanceBefore: money(balanceBefore),
            balanceAfter: money(balanceAfter),
            provider: 'wallet',
            referenceId: pendingOrder.id,
            description: `Package purchase paid from wallet (${pendingOrder.id})`,
            metadata,
            completedAt: new Date(),
          })
          .returning();

        return {
          balance: money(balanceAfter),
          order: pendingOrder,
          transaction,
          metadata,
        };
      });

      try {
        await storage.createNotification({
          userId: req.userId,
          type: 'wallet',
          title: 'Wallet payment completed',
          message: `$${money(walletDebitAmountUsd)} was used for your eSIM order.`,
          read: false,
          metadata: {
            orderId: result.order.id,
            walletTransactionId: result.transaction.id,
          },
        });
      } catch (notificationError) {
        console.warn('Wallet payment notification failed:', notificationError);
      }

      try {
        await awardMemberReward({
          userId: req.userId,
          sourceAmount: walletDebitAmountUsd,
          sourceType: 'wallet_package_purchase',
          sourceId: result.order.id,
          description: `Reward earned from wallet package order ${result.order.id}`,
          metadata: {
            orderId: result.order.id,
            walletTransactionId: result.transaction.id,
            paymentMethod: 'wallet',
          },
        });
      } catch (rewardError) {
        console.warn('Member reward earning failed:', rewardError);
      }

      return res.json({
        success: true,
        builtInComplete: false,
        message: 'Wallet payment captured. Confirming eSIM order...',
        payment: {
          provider: 'wallet',
          walletTransactionId: result.transaction.id,
          orderId: result.order.id,
          amount: checkoutAmount,
          currency: normalizedCurrency,
          walletDebitAmountUsd,
          balance: result.balance,
          metadata: result.metadata,
        },
        pricing,
      });
    }

    /* ---------------- Gateway Validation ---------------- */
    const [gateway] = await db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.id, gatewayId));

    if (!gateway || !gateway.isEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Selected payment gateway is disabled',
      });
    }

    const storefrontResellerId = pricingRole.source === 'storefront' ? pricingRole.resellerId : null;
    if (gateway.resellerId && gateway.resellerId !== storefrontResellerId) {
      return res.status(400).json({
        success: false,
        message: 'Selected payment gateway is unavailable for this storefront',
      });
    }

    if (!storefrontResellerId && gateway.resellerId) {
      return res.status(400).json({
        success: false,
        message: 'Selected payment gateway is only available on its reseller storefront',
      });
    }

    let result: any;

    const payment = {
      provider: gateway.provider,
      clientSecret: null as string | null,
      paymentIntentId: null as string | null,
      orderId: null as string | null,
      redirectUrl: null as string | null,
      publicKey: null as string | null,
      guestAccessToken: guestAccessToken,
      amount: null as number | null,
      currency: currency,
      paymentMethod: null as string | null, // 'spi' or 'hpp'
    };

    /* ========================
       PAYMENT GATEWAY ROUTING
       ======================== */

    switch (gateway.provider) {
      case 'stripe':
        result = await initStripePayment({
          secretKey: gateway.secretKey!,
          amount: pricing.total,
          currency,
          packageId,
          quantity,
          orderId,
          userId: req.userId,
          email,
          name,
          phone,
          metadata: {
            promoCode,
            promoType,
            voucherId,
            giftCardId,
            referralCredits,
            promoDiscount: pricing?.discount,
            resellerId: pricingRole.resellerId || '',
            storefrontHost: pricingRole.storefrontHost || '',
            storefrontSubdomain: pricingRole.storefrontSubdomain || '',
            priceType: pricingRole.priceType,
          },
        });

        payment.clientSecret = result.clientSecret;
        payment.publicKey = gateway.publicKey!;
        payment.paymentIntentId = result.paymentIntentId;
        payment.guestAccessToken = result.guestAccessToken ?? null;
        payment.amount = pricing.total;
        payment.currency = currency;
        break;

      case 'razorpay':
        result = await initRazorpayPayment({
          keyId: gateway.publicKey!,
          secretKey: gateway.secretKey!,
          amount: pricing.total,
          currency,
          orderId,
          packageId,
          quantity,
          email: email || undefined,
          phone,
          guestAccessToken: payment.guestAccessToken || undefined,
          userId: req.userId,
          promoCode,
          promoType,
          voucherId,
          giftCardId,
          referralCredits,
          promoDiscount: String(pricing?.discount ?? ""),
          metadata: {
            resellerId: pricingRole.resellerId || '',
            storefrontHost: pricingRole.storefrontHost || '',
            storefrontSubdomain: pricingRole.storefrontSubdomain || '',
            priceType: pricingRole.priceType,
          },
        });

        payment.orderId = result.orderId;
        payment.publicKey = result.keyId;
        payment.amount = Math.round(pricing.total * 100);
        payment.currency = currency;
        break;

      case 'paypal':
        result = await initPaypalPayment({
          clientId: gateway.publicKey!,
          secretKey: gateway.secretKey!,
          mode: (gateway.config as any)?.mode || 'sandbox',
          amount: pricing.total,
          currency,
          packageId,
          quantity,
          email: email || undefined,
          phone: phone,
          guestAccessToken: payment.guestAccessToken || undefined,
          userId: req.userId,
          metadata: {
            promoCode,
            promoType,
            voucherId,
            giftCardId,
            referralCredits,
          promoDiscount: String(pricing?.discount ?? ""),
            resellerId: pricingRole.resellerId || '',
            storefrontHost: pricingRole.storefrontHost || '',
            storefrontSubdomain: pricingRole.storefrontSubdomain || '',
            priceType: pricingRole.priceType,
          },
        });

        payment.orderId = result.orderId;
        payment.amount = pricing.total;
        payment.currency = currency;
        payment.publicKey = gateway.publicKey;
        payment.clientSecret = gateway.secretKey;
        (payment as any).config = gateway.config;
        break;

      case 'paystack':
        if (!email) {
          return res.status(400).json({
            success: false,
            message: 'Email is required for Paystack payment',
          });
        }

        result = await initPaystackPayment({
          secretKey: gateway.secretKey!,
          email,
          amount: pricing.total,
          currency,
          metadata: {
            promoCode,
            promoType,
            voucherId,
            giftCardId,
            referralCredits,
            resellerId: pricingRole.resellerId || '',
            storefrontHost: pricingRole.storefrontHost || '',
            storefrontSubdomain: pricingRole.storefrontSubdomain || '',
            priceType: pricingRole.priceType,
          },
        });

        payment.orderId = result.reference;
        payment.redirectUrl = result.authorizationUrl;
        payment.amount = Math.round(pricing.total * 100);
        payment.currency = currency;
        break;

      case 'ayamerchant': {
        const normalizedCurrency = normalizeCurrency(currency);
        const checkoutAmount = toMoney(pricing.total);
        const payerUser = req.userId ? await storage.getUser(req.userId) : null;
        const payerEmail = email || payerUser?.email;
        const txRef = orderId || `aya_${crypto.randomUUID()}`;

        if (!payerEmail) {
          return res.status(400).json({
            success: false,
            message: 'Email is required for AYAMERCHANT payment',
          });
        }

        if (!Number.isFinite(checkoutAmount) || checkoutAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid AYAMERCHANT payment amount',
          });
        }

        const metadata = {
          ...buildPackagePaymentMetadata({
            packageId,
            quantity,
            orderId,
            userId: req.userId,
            email: payerEmail,
            phone,
            promoCode,
            promoType,
            voucherId,
            giftCardId,
            referralCredits,
            promoDiscount: pricing?.discount,
            resellerId: pricingRole.resellerId || '',
            storefrontHost: pricingRole.storefrontHost || '',
            storefrontSubdomain: pricingRole.storefrontSubdomain || '',
            priceType: pricingRole.priceType,
            paymentMethodType: 'ayamerchant',
            checkoutAmount,
            checkoutCurrency: normalizedCurrency,
          }),
          guestAccessToken: payment.guestAccessToken || '',
        };

        result = await initAyaMerchantPayment({
          gateway,
          amount: checkoutAmount,
          currency: normalizedCurrency,
          txRef,
          email: payerEmail,
          name: name || payerUser?.name || payerEmail,
          phone: phone || (payerUser as any)?.phone || '',
          description: `eSIM package purchase ${orderId}`,
          metadata,
          returnUrl: buildPaymentProcessingUrl(req, {
            providerType: 'ayamerchant',
            orderId: txRef,
            gatewayId: gateway.id,
            guestAccessToken: payment.guestAccessToken,
          }),
        });

        payment.orderId = result.txRef;
        payment.redirectUrl = result.redirectUrl;
        payment.amount = checkoutAmount;
        payment.currency = normalizedCurrency;
        (payment as any).txRef = result.txRef;
        break;
      }

      case 'nowpayments':
      case 'cryptomus': {
        if (!req.userId) {
          return res.status(401).json({
            success: false,
            message: 'Login is required to pay with crypto',
          });
        }

        const normalizedCurrency = normalizeCurrency(currency);
        const checkoutAmount = toMoney(pricing.total);
        if (!Number.isFinite(checkoutAmount) || checkoutAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid crypto payment amount',
          });
        }

        const pkg = await storage.getUnifiedPackageById(packageId);
        if (!pkg) {
          return res.status(404).json({ success: false, message: 'Package not found' });
        }

        const user = await storage.getUser(req.userId);
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        const packagePayment = await db.transaction(async (tx) => {
          const [pendingOrder] = await tx
            .insert(orders)
            .values({
              userId: req.userId,
              packageId: pkg.id,
              providerId: pkg.providerId,
              orderType: Number(quantity) > 1 ? 'batch' : 'single',
              quantity: Math.max(1, Number(quantity) || 1),
              status: 'pending',
              price: money(checkoutAmount),
              airaloPrice: (pkg as any).airaloPrice || (pkg as any).wholesalePrice || null,
              wholesalePrice: (pkg as any).wholesalePrice || null,
              currency: normalizedCurrency,
              orderCurrency: normalizedCurrency,
              dataAmount: pkg.dataAmount,
              validity: pkg.validity,
              installationSent: false,
              paymentMethod: 'crypto',
              resellerId: pricingRole.resellerId || null,
              storefrontHost: pricingRole.storefrontHost || null,
            })
            .returning();

          const metadata = buildPackagePaymentMetadata({
            packageId,
            quantity,
            orderId,
            userId: req.userId,
            email,
            phone,
            promoCode,
            promoType,
            voucherId,
            giftCardId,
            referralCredits,
            promoDiscount: pricing?.discount,
            resellerId: pricingRole.resellerId || '',
            storefrontHost: pricingRole.storefrontHost || '',
            storefrontSubdomain: pricingRole.storefrontSubdomain || '',
            priceType: pricingRole.priceType,
            paymentMethodType: 'crypto',
            checkoutAmount,
            checkoutCurrency: normalizedCurrency,
            existingOrderId: pendingOrder.id,
          });

          const balance = money(toMoney(user.walletBalance || '0.00'));
          const [transaction] = await tx
            .insert(walletTransactions)
            .values({
              userId: req.userId!,
              type: 'package_crypto_payment',
              status: 'pending',
              amount: money(checkoutAmount),
              currency: normalizedCurrency,
              balanceBefore: balance,
              balanceAfter: balance,
              provider: gateway.provider,
              paymentGatewayId: gateway.id,
              referenceId: pendingOrder.id,
              description: `Package purchase via ${gateway.displayName}`,
              metadata,
            })
            .returning();

          return { order: pendingOrder, transaction, metadata };
        });

        if (gateway.provider === 'nowpayments') {
          result = await initNowPaymentsPayment({
            gateway,
            amount: checkoutAmount,
            currency: normalizedCurrency,
            walletTransactionId: packagePayment.transaction.id,
            userId: req.userId,
            req,
            callbackUrl: `${getRequestBaseUrl(req)}/api/payments/crypto/nowpayments/ipn`,
            description: `eSIM package purchase ${packagePayment.order.id}`,
          });
        } else {
          result = await initCryptomusPayment({
            gateway,
            amount: checkoutAmount,
            currency: normalizedCurrency,
            walletTransactionId: packagePayment.transaction.id,
            userId: req.userId,
            req,
            callbackUrl: `${getRequestBaseUrl(req)}/api/payments/crypto/cryptomus/webhook`,
          });
        }

        const { raw: _raw, userId: _resultUserId, ...publicPayment } = result;
        const metadataKey = gateway.provider === 'cryptomus' ? 'cryptomus' : 'nowpayments';

        await db
          .update(walletTransactions)
          .set({
            providerPaymentId: result.paymentId,
            metadata: {
              ...((packagePayment.transaction.metadata as Record<string, unknown>) || {}),
              [metadataKey]: publicPayment,
            },
            updatedAt: new Date(),
          })
          .where(eq(walletTransactions.id, packagePayment.transaction.id));

        Object.assign(payment, {
          provider: gateway.provider,
          orderId: result.orderId || packagePayment.transaction.id,
          paymentIntentId: result.paymentId,
          amount: checkoutAmount,
          currency: normalizedCurrency,
          transactionId: packagePayment.transaction.id,
          packageOrderId: packagePayment.order.id,
          metadata: packagePayment.metadata,
          ...publicPayment,
        });
        break;
      }

      /* ========================
         POWERTRANZ INTEGRATION
         ======================== */

      case 'powertranz':
        // 🔥 NEW: Support both SPI and HPP methods
        if (paymentMethod === 'hpp') {
          // ========================
          // HPP METHOD (HOSTED PAGE)
          // ========================
          console.log('🎯 Initializing PowerTranz HPP (Hosted Payment Page)');

          result = await initPowertranzHpp({
            merchantId: gateway.publicKey!,
            merchantPassword: gateway.secretKey!,
            amount: pricing.total,
            orderId,
            currency,
            email,
            name,
            phone,
          });

          console.log('✅ PowerTranz HPP initialized:', {
            hasRedirectUrl: !!result.redirectUrl,
            hppToken: result.hppToken?.substring(0, 20) + '...',
          });

          // Return HPP redirect response
          return res.json({
            success: true,
            message: 'HPP payment page initialized',
            pricing,
            powertranz: {
              method: 'hpp',
              redirectUrl: result.redirectUrl, // Frontend redirects user to this URL
              hppToken: result.hppToken,
            },
            payment: {
              provider: 'powertranz',
              paymentMethod: 'hpp',
              guestAccessToken,
              amount: pricing.total,
              currency,
              orderId,
            },
          });

        } else {
          // ========================
          // SPI METHOD (3DS IFRAME)
          // ========================
          // 🔥 Validate card data is provided for SPI
          if (!card || !card.pan || !card.cvv || !card.expiry) {
            return res.status(400).json({
              success: false,
              message: 'Card details are required for PowerTranz SPI payment',
            });
          }

          console.log('🔥 Initializing PowerTranz SPI (3DS Challenge)');

          result = await initPowertranzSpiSale({
            merchantId: gateway.publicKey!,
            merchantPassword: gateway.secretKey!,
            amount: pricing.total,
            orderId,
            currency,
            email,
            name,
            card,
          });

          console.log('✅ PowerTranz SPI response:', {
            IsoResponseCode: result.IsoResponseCode,
            hasSpiToken: !!result.spiToken,
            hasRedirectData: !!result.redirectData,
          });

          // Return 3DS data for frontend iframe
          return res.json({
            success: true,
            message: '3DS authentication required',
            pricing,
            powertranz: {
              method: 'spi',
              orderId,
              redirectData: result.redirectData, // HTML for iframe
              spiToken: result.spiToken, // Store for confirmation
            },
            payment: {
              provider: 'powertranz',
              paymentMethod: 'spi',
              guestAccessToken,
              amount: pricing.total,
              currency,
            },
          });
        }

      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported payment provider',
        });
    }

    /* ========================
       FINAL RESPONSE (non-PowerTranz)
       ======================== */
    return res.json({
      success: true,
      message: 'Payment initialized successfully',
      pricing,
      payment,
    });

  } catch (error: any) {
    console.error('Payment init error:', error);

    return res.status(500).json({
      success: false,
      message: error?.message || error?.error || 'Payment initialization failed',
    });
  }
});

/**
 * PowerTranz HPP Callback Handler
 * Called by PowerTranz (via frontend redirect) after user completes payment
 */
router.post('/powertranz/hpp-callback', async (req, res) => {
  try {
    console.log('🔐 [HPP CALLBACK RECEIVED]', {
      timestamp: new Date().toISOString(),
      method: req.method,
      hasApproved: !!req.body.Approved,
    });

    // Parse callback response
    const callbackData = req.body;

    // Process the HPP callback
    const result = processHppCallbackResponse(callbackData);

    if (result.success && result.approved) {
      console.log('✅ HPP payment APPROVED - updating order status');

      // Update order status in database
      try {
        await db
          .update(orders)
          .set({
            status: 'completed',
            paymentMethod: 'powertranz-hpp',
            transactionId: result.transactionId,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, result.orderId!));

        console.log('✅ Order updated in database');
      } catch (dbError: any) {
        console.error('❌ Database update error:', dbError);
        // Even if DB update fails, payment was approved
      }

      // ✅ Return success response
      return res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        transactionId: result.transactionId,
        orderId: result.orderId,
      });

    } else if (result.success && !result.approved) {
      // Payment was declined
      console.warn('⚠️ HPP payment DECLINED');

      return res.status(200).json({
        success: false,
        message: result.message || 'Payment was declined',
        error: result.error,
        orderId: result.orderId,
      });

    } else {
      // Error processing callback
      return res.status(400).json({
        success: false,
        message: 'Error processing payment callback',
        error: result.error,
      });
    }

  } catch (error: any) {
    console.error('❌ HPP callback error:', error);

    return res.status(500).json({
      success: false,
      message: error?.message || 'HPP callback processing failed',
    });
  }
});

/**
 * PowerTranz HPP Cancel Handler
 * Called when user cancels payment on HPP page
 */
router.get('/powertranz/hpp-cancel', (req, res) => {
  console.log('⚠️ HPP payment CANCELLED by user');

  // Redirect to checkout with error
  res.redirect(
    `/checkout?error=${encodeURIComponent('Payment was cancelled. Please try again.')}`
  );
});

/**
 * PowerTranz HPP Server Notification
 * Optional: Server-to-server notification (more reliable than callback)
 */
router.post('/powertranz/hpp-notify', async (req, res) => {
  try {
    console.log('📬 [HPP SERVER NOTIFICATION RECEIVED]', {
      timestamp: new Date().toISOString(),
      hasApproved: !!req.body.Approved,
    });

    const notificationData = req.body;

    // Process notification (similar to callback)
    const result = processHppCallbackResponse(notificationData);

    if (result.success && result.approved) {
      console.log('✅ HPP notification: Payment APPROVED');

      // Update order status
      await db
        .update(orders)
        .set({
          status: 'completed',
          paymentMethod: 'powertranz-hpp',
          transactionId: result.transactionId,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, result.orderId!));

      // Return 200 OK to acknowledge notification
      return res.status(200).json({ success: true });

    } else {
      console.warn('⚠️ HPP notification: Payment DECLINED');
      return res.status(200).json({ success: true });
    }

  } catch (error: any) {
    console.error('❌ HPP notification error:', error);
    // Still return 200 to avoid retries
    return res.status(200).json({ success: true, warning: error.message });
  }
});

/**
 * PowerTranz SPI: 3DS Response Handler (existing)
 */
router.post('/powertranz/3ds-response', (req, res) => {
  console.log('🔐 [3DS CALLBACK RECEIVED]', {
    timestamp: new Date().toISOString(),
    method: req.method,
    contentType: req.headers['content-type'],
  });

  let responseData = req.body;
  if (req.body.Response && typeof req.body.Response === 'string') {
    try {
      responseData = JSON.parse(req.body.Response);
    } catch (e) {
      console.error('❌ Failed to parse Response:', e.message);
    }
  }

  const {
    TransactionType,
    Approved,
    TransactionIdentifier,
    TotalAmount,
    CurrencyCode,
    CardBrand,
    IsoResponseCode,
    ResponseMessage,
    RiskManagement,
    PanToken,
    OrderIdentifier,
    Errors,
    SpiToken,
  } = responseData;

  console.log('🔐 Parsed Response:', {
    IsoResponseCode,
    ResponseMessage,
    Approved,
    hasSpiToken: !!SpiToken,
  });

  res.setHeader('Content-Type', 'text/html');

  let isSuccess = false;
  let failureReason = '';

  if (RiskManagement?.ThreeDSecure) {
    const threeDSData = RiskManagement.ThreeDSecure;
    if (threeDSData.ResponseCode === '3D0' || IsoResponseCode === '3D0') {
      isSuccess = true;
    } else {
      failureReason = threeDSData.CardholderInfo || ResponseMessage || 'Authentication failed';
    }
  } else if (IsoResponseCode === 'SP4') {
    isSuccess = true;
  } else if (Errors && Errors.length > 0) {
    failureReason = Errors.map((e: any) => e.Message).join(', ');
  }

  const finalSpiToken = SpiToken || req.body.SpiToken;

  console.log('🔐 3DS Result:', {
    isSuccess,
    IsoResponseCode,
    spiToken: finalSpiToken?.substring(0, 20) + '...',
  });

  const htmlResponse = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>3DS Result</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
          }
          .spinner {
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top: 4px solid white;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h2>${isSuccess ? '✅ Authentication Successful' : '❌ Authentication Failed'}</h2>
          <p>${isSuccess ? 'Processing your payment...' : failureReason}</p>
        </div>
        
        <script>
          console.log('[3DS IFRAME] Page loaded, about to send postMessage...');
          
          const messageData = {
            type: 'POWERTRANZ_3DS_RESULT',
            success: ${isSuccess ? 'true' : 'false'},
            spiToken: '${finalSpiToken || ''}',
            isoResponseCode: '${IsoResponseCode}',
            responseMessage: '${ResponseMessage}',
            transactionIdentifier: '${TransactionIdentifier}',
            orderIdentifier: '${OrderIdentifier}',
            failureReason: '${failureReason.replace(/'/g, "\\'")}',
            timestamp: new Date().toISOString(),
          };
          
          try {
            window.parent.postMessage(messageData, '*');
            setTimeout(() => {
              window.parent.postMessage(messageData, '*');
            }, 100);
          } catch (error) {
            console.error('[3DS IFRAME] ❌ postMessage failed:', error);
          }
        </script>
      </body>
    </html>
  `;

  console.log('📤 Sending 3DS response HTML to client');
  res.send(htmlResponse);
});

/**
 * PowerTranz SPI: Confirm Payment (existing)
 */
router.post('/powertranz/confirm', optionalAuth, async (req, res) => {
  try {
    const { spiToken, orderId, guestAccessToken } = req.body;

    console.log('🔥 Confirming PowerTranz SPI payment:', {
      hasSpiToken: !!spiToken,
      orderId,
      hasGuestToken: !!guestAccessToken,
    });

    if (!spiToken || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: spiToken and orderId are required',
      });
    }

    const merchantId = process.env.POWERTRANZ_MERCHANT_ID;
    const merchantPassword = process.env.POWERTRANZ_MERCHANT_PASSWORD;

    if (!merchantId || !merchantPassword) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured properly',
      });
    }

    let confirmResult;
    try {
      confirmResult = await confirmPowertranzPayment({
        spiToken,
        merchantId,
        merchantPassword,
      });
    } catch (serviceError: any) {
      console.error('❌ PowerTranz service error:', serviceError.message);
      return res.status(500).json({
        success: false,
        message: serviceError.message || 'Failed to confirm payment with PowerTranz',
      });
    }

    console.log('✅ PowerTranz confirmation result:', {
      Approved: confirmResult.Approved,
      IsoResponseCode: confirmResult.IsoResponseCode,
    });

    if (confirmResult.Approved) {
      console.log('✅ Payment APPROVED - updating order status');

      try {
        await db
          .update(orders)
          .set({
            status: 'completed',
            paymentMethod: 'powertranz-spi',
            transactionId: confirmResult.TransactionIdentifier,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));

        console.log('✅ Order updated in database');
      } catch (dbError: any) {
        console.error('❌ Database update error:', dbError);
        return res.status(200).json({
          success: true,
          message: 'Payment confirmed but order update pending',
          transactionId: confirmResult.TransactionIdentifier,
          orderId,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        transactionId: confirmResult.TransactionIdentifier,
        orderId,
      });
    } else {
      console.warn('⚠️ Payment NOT APPROVED');

      return res.status(200).json({
        success: false,
        message: confirmResult.ResponseMessage || 'Payment was declined',
        isoResponseCode: confirmResult.IsoResponseCode,
        transactionId: confirmResult.TransactionIdentifier,
      });
    }

  } catch (error: any) {
    console.error('❌ PowerTranz confirmation error:', error);

    return res.status(500).json({
      success: false,
      message: error?.message || 'Payment confirmation failed',
    });
  }
});

/*
  ──────────────────────────────────────────────────────────────────────────────
  GET /api/payments/topup/paystack-callback
  ──────────────────────────────────────────────────────────────────────────────
  Paystack redirects the user here after payment (callback_url we set in init).
  We verify the payment, call the confirm-payment logic, then return a small HTML
  page that:
    1. Calls window.SimfinityAndroid.onPaymentSuccess() (Android JS interface)
    2. window.ReactNativeWebView.postMessage()           (React Native)
    3. postMessage to parent                             (Flutter WebView)
    4. Redirects to deep-link scheme                    (e.g. simfinity://payment-success)
  ──────────────────────────────────────────────────────────────────────────────
*/
router.get('/topup/paystack-callback', async (req, res) => {
  const { reference, iccid, orderId, topupId, packageId, callbackScheme = 'simfinity' } = req.query as Record<string, string>;

  const sendHtml = (success: boolean, message: string, extra: Record<string, string> = {}) => {
    const payload = JSON.stringify({ eventType: success ? 'success' : 'failure', iccid, orderId, topupId, message, ...extra });
    const deepLink = success
      ? `${callbackScheme}://payment-success?iccid=${encodeURIComponent(iccid)}&orderId=${encodeURIComponent(orderId)}&topupId=${encodeURIComponent(topupId)}&message=${encodeURIComponent(message)}`
      : `${callbackScheme}://payment-failed?message=${encodeURIComponent(message)}`;

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${success ? 'Payment Successful' : 'Payment Failed'}</title>
      <style>
        body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
          min-height:100vh;font-family:system-ui,sans-serif;
          background:${success ? 'linear-gradient(135deg,#0f4c3a,#1e293b)' : 'linear-gradient(135deg,#4c0f0f,#1e293b)'};
          color:white;text-align:center;padding:24px;box-sizing:border-box;}
        .icon{font-size:64px;margin-bottom:16px;}
        h2{font-size:22px;font-weight:700;margin:0 0 8px;}
        p{font-size:14px;opacity:.75;margin:0 0 24px;}
        button{padding:12px 28px;border-radius:12px;border:none;cursor:pointer;
          background:${success ? '#10b981' : '#ef4444'};color:white;font-size:15px;font-weight:600;}
      </style>
    </head><body>
      <div class="icon">${success ? '✅' : '❌'}</div>
      <h2>${success ? 'Top-Up Successful!' : 'Payment Failed'}</h2>
      <p>${message}</p>
      <button onclick="closeWindow()">Close</button>
      <script>
        var PAYLOAD = ${payload};
        function closeWindow() {
          try { window.SimfinityAndroid && window.SimfinityAndroid.onPaymentSuccess(JSON.stringify(PAYLOAD)); } catch(e){}
          try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(PAYLOAD)); } catch(e){}
          try { window.parent && window.parent.postMessage(JSON.stringify(PAYLOAD), '*'); } catch(e){}
          try { window.top && window.top.postMessage(JSON.stringify(PAYLOAD), '*'); } catch(e){}
          try { window.location.href = '${deepLink}'; } catch(e){}
        }
        // Auto-trigger after 2s
        setTimeout(closeWindow, 2000);
        // Immediate try
        try {
          if(window.SimfinityAndroid) { ${success
        ? 'window.SimfinityAndroid.onPaymentSuccess(JSON.stringify(PAYLOAD));'
        : 'window.SimfinityAndroid.onPaymentFailure(JSON.stringify(PAYLOAD));'
      } }
          if(window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify(PAYLOAD)); }
          if(window.parent) { window.parent.postMessage(JSON.stringify(PAYLOAD), '*'); }
        } catch(e){}
      <\/script>
    </body></html>`);
  };

  try {
    if (!reference) return sendHtml(false, 'Missing Paystack reference');

    // ── Fetch the active Paystack gateway ───────────────────────────────────
    const { paymentGateways } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    const { db } = await import('server/db');
    const [gateway] = await db.select().from(paymentGateways).where(eq(paymentGateways.provider, 'paystack'));
    if (!gateway || !gateway.isEnabled) return sendHtml(false, 'Paystack gateway not configured');

    // ── Verify the transaction with Paystack ────────────────────────────────
    const verifyPaystack = (await import('server/helpers/payments/verify/paystack')).default;
    const verification = await verifyPaystack({ paystack: { reference } }, gateway);
    if (!verification.success) return sendHtml(false, verification.message || 'Paystack payment not verified');

    // ── Call /api/confirm-payment internally ────────────────────────────────
    const axios = (await import('axios')).default;
    const BASE = getInternalApiBaseUrl();
    const confirmRes = await axios.post(`${BASE}/api/confirm-payment`, {
      providerType: 'paystack',
      orderId: reference,  // confirm-payment uses orderId as the reference for paystack
    });

    const confirmData = confirmRes.data;
    if (!confirmData?.success) {
      return sendHtml(false, confirmData?.message || 'Confirmation failed after payment');
    }

    return sendHtml(true, 'Your eSIM has been topped up successfully!', {
      topupRecordId: String(confirmData?.topup?.id || ''),
    });

  } catch (err: any) {
    console.error('[Paystack Callback Error]', err.message);
    return sendHtml(false, err.message || 'An unexpected error occurred');
  }
});

router.post('/topup/init', optionalAuth, async (req, res) => {
  try {
    const { gatewayId, packageId, iccid, orderId: rawOrderId, currency = 'USD', email, name, phone, topupId, callbackUrl } = req.body;

    /* ---------------- Validation ---------------- */
    if (!gatewayId || !packageId || !iccid) {
      return res.status(400).json({
        success: false,
        message: 'gatewayId, packageId and iccid are required',
      });
    }

    let orderId = rawOrderId;
    /* ---------------- Verify/Find Order ---------------- */
    let order = orderId ? await storage.getOrderById(orderId) : null;

    if (!order && iccid) {
      order = await storage.getOrderByIccid(iccid);
      if (order) orderId = order.id;
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Original order not found for this eSIM',
      });
    }

    if (!req.userId && !email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for guest checkout',
      });
    }
    // if (!order || (order.userId !== req.userId && !req.adminId)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied",
    //   });
    // }

    /* ---------------- Package ---------------- */
    let pkg = await storage.getUnifiedPackageById(packageId);

    if (!pkg && order && order.providerId) {
      try {
        const { providerFactory } = await import('../providers/provider-factory');
        const providerService = await providerFactory.getServiceById(order.providerId);
        const { packages } = await fetchProviderTopupPackages(order, providerService);
        const selected = findProviderTopupPackage(packages, packageId);

        if (selected) {
          // Mock a package object with the price
          pkg = {
            id: packageId,
            retailPrice: getTopupWholesalePrice(selected),
            // Add other fields if necessary to avoid type errors, but cast as any
          } as any;
        }
      } catch (err) {
        console.warn("Failed to lookup dynamic topup package", err);
      }
    }

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    /* ---------------- Top-up Pricing ---------------- */
    const topupMarginSetting = await storage.getSettingByKey('topup_margin');
    const topupMargin = parseFloat(topupMarginSetting?.value || '40');

    let basePrice = pkg.retailPrice ? parseFloat(pkg.retailPrice.toString()) : 0;

    // Overwrite base price if a specific topupId is provided (dynamic top-up)
    if (topupId && order && order.providerId) {
      try {
        const { providerFactory } = await import('../providers/provider-factory');
        const providerService = await providerFactory.getServiceById(order.providerId);
        const { packages } = await fetchProviderTopupPackages(order, providerService);
        const selected = findProviderTopupPackage(packages, topupId);

        if (selected) {
          basePrice = getTopupWholesalePrice(selected);
        }
      } catch (err) {
        console.warn("Failed to fetch dynamic topup price:", err);
      }
    }

    const totalAmount = parseFloat((basePrice * (1 + topupMargin / 100)).toFixed(2));

    /* ---------------- Gateway ---------------- */
    const [gateway] = await db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.id, gatewayId));

    if (!gateway || !gateway.isEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Selected payment gateway is disabled',
      });
    }

    const paymentOwnerResellerId = order.resellerId || null;
    if (gateway.resellerId && gateway.resellerId !== paymentOwnerResellerId) {
      return res.status(400).json({
        success: false,
        message: 'Selected payment gateway is unavailable for this reseller order',
      });
    }

    if (!paymentOwnerResellerId && gateway.resellerId) {
      return res.status(400).json({
        success: false,
        message: 'Selected payment gateway is only available on its reseller storefront',
      });
    }

    let result: any;

    const payment = {
      provider: gateway.provider,
      clientSecret: null as string | null,
      paymentIntentId: null as string | null,
      orderId: null as string | null,
      redirectUrl: null as string | null,
      publicKey: null as string | null,
      guestAccessToken: null as string | null,
      amount: totalAmount,
      currency,
    };

    /* ---------------- Init Payment ---------------- */
    switch (gateway.provider) {
      /* -------- Stripe -------- */
      case 'stripe':
        result = await initStripePayment({
          secretKey: gateway.secretKey!,
          amount: totalAmount,
          currency,
          orderId,
          userId: req.userId,
          email,
          name,
          phone,
          metadata: {
            type: 'topup',
            packageId,
            iccid,
            orderId, // ensure metadata has orderId
            topupId: topupId || packageId, // standardize
            userId: req.userId?.toString(), // ensure userId
          },
        });

        payment.clientSecret = result.clientSecret;
        payment.paymentIntentId = result.paymentIntentId;
        payment.guestAccessToken = result.guestAccessToken ?? null;
        payment.publicKey = gateway.publicKey; // Return PK for frontend
        break;

      /* -------- Razorpay -------- */
      case 'razorpay':
        result = await initRazorpayPayment({
          keyId: gateway.publicKey!,
          secretKey: gateway.secretKey!,
          amount: totalAmount,
          currency,
          orderId,
          email,
          phone,
          userId: req.userId,
          notes: {
            type: 'topup',
            packageId,
            iccid,
          },
        });

        payment.orderId = result.orderId;
        payment.publicKey = result.keyId;
        payment.amount = Math.round(totalAmount * 100);
        break;

      /* -------- PayPal -------- */
      case 'paypal':
        result = await initPaypalPayment({
          clientId: gateway.publicKey!,
          secretKey: gateway.secretKey!,
          mode: (gateway.config as any)?.mode || 'sandbox',
          amount: totalAmount,
          currency,
          email,
          phone,
          userId: req.userId,
          metadata: {
            type: 'topup',
            packageId,
            iccid,
          },
        });

        payment.orderId = result.orderId;
        payment.publicKey = gateway.publicKey;
        (payment as any).config = gateway.config;
        break;

      /* -------- Paystack -------- */
      case 'paystack':
        if (!email) {
          return res.status(400).json({
            success: false,
            message: 'Email is required for Paystack payment',
          });
        }

        result = await initPaystackPayment({
          secretKey: gateway.secretKey!,
          email,
          amount: totalAmount,
          currency,
          // Pass the mobile callback URL when the request comes from Android WebView
          callbackUrl: callbackUrl || undefined,
          metadata: {
            type: 'topup',
            packageId,
            iccid,
            orderId,
            topupId: topupId || packageId,
            userId: req.userId?.toString(),
          },
        });

        payment.orderId = result.reference;
        payment.redirectUrl = result.authorizationUrl;
        payment.amount = Math.round(totalAmount * 100);
        break;

      case 'ayamerchant': {
        const normalizedCurrency = normalizeCurrency(currency);
        const checkoutAmount = toMoney(totalAmount);
        const payerUser = req.userId ? await storage.getUser(req.userId) : null;
        const payerEmail = email || payerUser?.email;
        const txRef = `topup_${orderId || iccid}_${crypto.randomUUID()}`;

        if (!payerEmail) {
          return res.status(400).json({
            success: false,
            message: 'Email is required for AYAMERCHANT payment',
          });
        }

        result = await initAyaMerchantPayment({
          gateway,
          amount: checkoutAmount,
          currency: normalizedCurrency,
          txRef,
          email: payerEmail,
          name: name || payerUser?.name || payerEmail,
          phone: phone || (payerUser as any)?.phone || '',
          description: `eSIM top-up ${orderId}`,
          metadata: {
            type: 'topup',
            packageId,
            iccid,
            orderId,
            topupId: topupId || packageId,
            userId: req.userId?.toString() || '',
            paymentMethodType: 'ayamerchant',
          },
          returnUrl: buildPaymentProcessingUrl(req, {
            providerType: 'ayamerchant',
            orderId: txRef,
            gatewayId: gateway.id,
          }),
        });

        payment.orderId = result.txRef;
        payment.redirectUrl = result.redirectUrl;
        payment.amount = checkoutAmount;
        payment.currency = normalizedCurrency;
        (payment as any).txRef = result.txRef;
        break;
      }


      case "powertranz":
        result = await initPowertranzSpiSale({
          merchantId: gateway.publicKey!,
          merchantPassword: gateway.secretKey!,
          amount: pricing.total,
          orderId,
          currency,
          email,
          name,
          // card: req.body.card, // 🔥 REQUIRED
          card: {
            pan: "4012000000020006",
            cvv: "323",
            expiry: "2310",
          },
        });

        payment.provider = "powertranz";
        payment.amount = pricing.total;
        payment.currency = currency;

        return res.json({
          success: true,
          message: "3DS authentication required",
          pricing,
          powertranz: {
            orderId,
            redirectData: result.redirectData, // 🔥 frontend iframe
            spiToken: result.spiToken,         // store client-side for confirm
          },
        });

      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported payment provider',
        });
    }

    /* ---------------- Final Response ---------------- */
    return res.json({
      success: true,
      message: 'Top-up payment initialized successfully',
      pricing: {
        basePrice,
        margin: topupMargin,
        total: totalAmount,
        currency,
      },
      payment,
    });
  } catch (error: any) {
    console.error('Top-up payment init error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Top-up payment initialization failed',
    });
  }
});



export async function confirmPaymentHandler(req: Request, res: Response) {
  try {
    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'provider is required',
      });
    }

    /* 🟢 Free Order Bypass */
    if (provider === 'free') {
      return res.json({
        success: true,
        provider: 'free',
        referenceId: `FREE_${Date.now()}`,
        amount: 0,
        currency: req.body.currency || 'USD',
        metadata: req.body.metadata || {},
      });
    }

    /* 🔐 Bypass Gateway fetch for IAP since it has custom verification */
    if (provider === 'wallet') {
      const walletTransactionId = String(req.body.wallet?.walletTransactionId || req.body.walletTransactionId || '');
      const userId = String(req.body.userId || req.body.metadata?.userId || '');

      if (!walletTransactionId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Wallet transaction data is missing',
        });
      }

      const [transaction] = await db
        .select()
        .from(walletTransactions)
        .where(
          and(
            eq(walletTransactions.id, walletTransactionId),
            eq(walletTransactions.userId, userId),
            eq(walletTransactions.type, 'purchase_debit'),
            eq(walletTransactions.status, 'completed'),
          ),
        );

      if (!transaction) {
        return res.status(400).json({
          success: false,
          message: 'Wallet payment was not found or is not completed',
        });
      }

      const metadata = {
        ...((transaction.metadata as Record<string, unknown>) || {}),
        ...(req.body.metadata || {}),
        paymentMethodType: 'wallet',
      };
      const paidOrderId = String(
        req.body.packageOrderId ||
          req.body.orderId ||
          transaction.referenceId ||
          (metadata as any).existingOrderId ||
          '',
      );
      const order = await finalizeExistingPackageOrder({
        orderId: paidOrderId,
        metadata,
        paymentProvider: 'wallet',
        transactionId: transaction.id,
      });

      return res.json({
        success: true,
        provider: 'wallet',
        referenceId: transaction.id,
        transactionId: transaction.id,
        orderId: order?.id || paidOrderId,
        order,
        amount: Number((metadata as any).checkoutAmount || transaction.amount),
        currency: String((metadata as any).checkoutCurrency || 'USD').toUpperCase(),
        paymentMethod: 'wallet',
        metadata,
      });
    }

    if (provider === 'iap-android') {
      const { purchaseToken, productId, packageName } = req.body.iap || {};
      if (!purchaseToken || !productId || !packageName) {
        return res.status(400).json({ success: false, message: 'Missing IAP Android required fields' });
      }

      const { verifyAndroidPurchaseWithGoogle } = await import('server/services/androidPurchase.service');
      let verifyResult: any;
      try {
        verifyResult = await verifyAndroidPurchaseWithGoogle({ packageName, productId, purchaseToken });
      } catch (verifyErr: any) {
        return res.status(400).json({ success: false, message: 'Android receipt verification failed: ' + verifyErr.message });
      }

      const transactionId = verifyResult.orderId || purchaseToken;

      return res.json({
        success: true,
        provider,
        referenceId: transactionId,
        amount: req.body.amount,
        currency: req.body.currency,
        // ✅ Structured metadata consumed by /api/confirm-payment → iap_purchase branch
        metadata: {
          type: 'iap_purchase',
          platform: 'android',
          packageId: req.body.packageId || req.body.metadata?.packageId,
          userId: req.body.userId || req.body.metadata?.userId,
          currency: req.body.currency || 'USD',
          transactionId,
          ...(req.body.metadata || {}),
        },
      });
    }

    if (provider === 'iap-ios') {
      const { receiptData } = req.body.iap || {};
      if (!receiptData) {
        return res.status(400).json({ success: false, message: 'Missing iOS receipt data' });
      }

      const { verifyAppleReceipt } = await import('server/services/applePurchase.service');
      let verifyResult: any;
      try {
        verifyResult = await verifyAppleReceipt(receiptData, false);
        if (verifyResult.status === 21007) {
          verifyResult = await verifyAppleReceipt(receiptData, true); // sandbox fallback
        }
      } catch (verifyErr: any) {
        return res.status(400).json({ success: false, message: 'iOS receipt verification failed: ' + verifyErr.message });
      }

      if (verifyResult.status !== 0) {
        return res.status(400).json({ success: false, message: 'Apple receipt verification failed. Status: ' + verifyResult.status });
      }

      const latestReceipt = verifyResult.latest_receipt_info?.[0];
      const transactionId = latestReceipt?.transaction_id || ('ios-receipt-' + Date.now());

      return res.json({
        success: true,
        provider,
        referenceId: transactionId,
        amount: req.body.amount,
        currency: req.body.currency,
        // ✅ Structured metadata consumed by /api/confirm-payment → iap_purchase branch
        metadata: {
          type: 'iap_purchase',
          platform: 'ios',
          packageId: req.body.packageId || req.body.metadata?.packageId,
          userId: req.body.userId || req.body.metadata?.userId,
          currency: req.body.currency || 'USD',
          transactionId,
          ...(req.body.metadata || {}),
        },
      });
    }

    /* 🔐 Fetch ACTIVE gateway by provider name */
    const requestedGatewayId = String(req.body.gatewayId || req.body.ayamerchant?.gatewayId || '');
    const [gateway] = await db
      .select()
      .from(paymentGateways)
      .where(
        requestedGatewayId
          ? and(eq(paymentGateways.id, requestedGatewayId), eq(paymentGateways.provider, provider))
          : eq(paymentGateways.provider, provider),
      );

    if (!gateway || !gateway.isEnabled) {
      return res.status(400).json({
        success: false,
        message: `${provider} payment gateway is disabled`,
      });
    }

    let verificationResult;
    let verificationGateway = gateway;
    let cryptoTransactionForVerification: typeof walletTransactions.$inferSelect | null = null;

    if (provider === 'nowpayments' || provider === 'cryptomus') {
      const paymentId = String(req.body.nowpayments?.paymentId || req.body.cryptomus?.paymentId || req.body.paymentId || '');
      const orderId = String(req.body.nowpayments?.orderId || req.body.cryptomus?.orderId || req.body.orderId || '');

      [cryptoTransactionForVerification] = await db
        .select()
        .from(walletTransactions)
        .where(
          or(
            paymentId ? eq(walletTransactions.providerPaymentId, paymentId) : sql`false`,
            orderId ? eq(walletTransactions.id, orderId) : sql`false`,
          ),
        );

      if (cryptoTransactionForVerification?.paymentGatewayId) {
        const [transactionGateway] = await db
          .select()
          .from(paymentGateways)
          .where(eq(paymentGateways.id, cryptoTransactionForVerification.paymentGatewayId));

        if (transactionGateway?.isEnabled) {
          verificationGateway = transactionGateway;
        }
      }
    }

    switch (provider) {
      case 'razorpay':
        verificationResult = await verifyRazorpay(req.body, verificationGateway);
        break;

      case 'stripe':
        verificationResult = await verifyStripe(req.body, verificationGateway);
        break;

      case 'paypal':
        verificationResult = await verifyPaypal(req.body, verificationGateway);
        break;

      case 'paystack':
        verificationResult = await verifyPaystack(req.body, verificationGateway);
        break;

      case "powertranz":
        verificationResult = await confirmPowertranzPayment(req.body);
        break;

      case 'nowpayments':
        verificationResult = await verifyNowPaymentsPayment({
          gateway: verificationGateway,
          paymentId: String(req.body.nowpayments?.paymentId || req.body.paymentId || ''),
        });
        break;

      case 'cryptomus':
        verificationResult = await verifyCryptomusPayment({
          gateway: verificationGateway,
          paymentId: String(req.body.cryptomus?.paymentId || req.body.paymentId || ''),
          orderId: String(req.body.cryptomus?.orderId || req.body.orderId || ''),
        });
        break;

      case 'ayamerchant':
        verificationResult = await verifyAyaMerchantPayment({
          gateway: verificationGateway,
          txRef: String(req.body.ayamerchant?.txRef || req.body.txRef || req.body.orderId || ''),
        });
        break;

      case 'iap-android':
      case 'iap-ios':
        throw new Error("IAP verification should be handled natively before gateway lookup.");

      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported payment provider',
        });
    }

    if (!verificationResult?.success) {
      return res.status(400).json(verificationResult);
    }

    if (provider === 'nowpayments' || provider === 'cryptomus') {
      const paymentId = String((verificationResult as any).paymentId || req.body.paymentId || '');
      const orderId = String(
        req.body.orderId ||
          req.body.nowpayments?.orderId ||
          req.body.cryptomus?.orderId ||
          (verificationResult as any).metadata?.orderId ||
          '',
      );

      const [transaction] = cryptoTransactionForVerification
        ? [cryptoTransactionForVerification]
        : await db
            .select()
            .from(walletTransactions)
            .where(
              or(
                paymentId ? eq(walletTransactions.providerPaymentId, paymentId) : sql`false`,
                orderId ? eq(walletTransactions.id, orderId) : sql`false`,
              ),
            );

      if (!transaction || transaction.type !== 'package_crypto_payment') {
        return res.status(400).json({
          success: false,
          message: 'Crypto checkout transaction was not found',
        });
      }

      const expectedAmount = toMoney(transaction.amount);
      const paidAmount = toMoney((verificationResult as any).amount);
      const paidCurrency = normalizeCurrency((verificationResult as any).currency);

      if (paidCurrency !== transaction.currency.toUpperCase() || paidAmount + 0.005 < expectedAmount) {
        await db
          .update(walletTransactions)
          .set({
            status: 'failed',
            description: 'Crypto payment amount or currency mismatch',
            metadata: {
              ...((transaction.metadata as Record<string, unknown>) || {}),
              verification: (verificationResult as any).metadata || {},
            },
            updatedAt: new Date(),
          })
          .where(eq(walletTransactions.id, transaction.id));

        return res.status(400).json({
          success: false,
          message: 'Crypto payment amount or currency mismatch',
        });
      }

      const mergedMetadata = {
        ...((transaction.metadata as Record<string, unknown>) || {}),
        ...(req.body.metadata || {}),
        paymentMethodType: 'crypto',
      };

      await db
        .update(walletTransactions)
        .set({
          status: 'completed',
          providerPaymentId: paymentId || transaction.providerPaymentId,
          metadata: {
            ...mergedMetadata,
            verification: (verificationResult as any).metadata || {},
          },
          completedAt: transaction.completedAt || new Date(),
          updatedAt: new Date(),
        })
        .where(eq(walletTransactions.id, transaction.id));

      return res.json({
        success: true,
        provider,
        ...verificationResult,
        transactionId: transaction.id,
        referenceId: paymentId || transaction.id,
        paymentMethod: 'crypto',
        metadata: mergedMetadata,
      });
    }

    return res.json({
      success: true,
      provider,
      ...verificationResult,
    });
  } catch (err: any) {
    console.error('Confirm payment error:', err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

router.post('/confirm-payments', confirmPaymentHandler);
router.post('/confirm-payment', confirmPaymentHandler);

router.post('/crypto/nowpayments/ipn', async (req, res) => {
  try {
    const paymentId = String(req.body?.payment_id || '');
    const orderId = String(req.body?.order_id || '');

    const [transaction] = await db
      .select()
      .from(walletTransactions)
      .where(
        or(
          orderId ? eq(walletTransactions.id, orderId) : sql`false`,
          paymentId ? eq(walletTransactions.providerPaymentId, paymentId) : sql`false`,
        ),
      );

    if (!transaction || transaction.type !== 'package_crypto_payment') {
      return res.status(404).json({ success: false, message: 'Crypto checkout transaction not found' });
    }

    const [gateway] = await db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.id, transaction.paymentGatewayId!));

    if (!gateway || gateway.provider !== 'nowpayments') {
      return res.status(400).json({ success: false, message: 'NOWPayments gateway mismatch' });
    }

    const signature = req.get('x-nowpayments-sig') || undefined;
    if (!verifyNowPaymentsIpnSignature(req.body, signature, gateway.webhookSecret)) {
      return res.status(401).json({ success: false, message: 'Invalid NOWPayments IPN signature' });
    }

    const verification = await verifyNowPaymentsPayment({
      gateway,
      paymentId: paymentId || transaction.providerPaymentId || '',
    });

    await db
      .update(walletTransactions)
      .set({
        status: verification.success ? 'completed' : ((verification as any).finalFailure ? 'failed' : transaction.status),
        providerPaymentId: paymentId || transaction.providerPaymentId,
        metadata: {
          ...((transaction.metadata as Record<string, unknown>) || {}),
          nowpayments: req.body,
          verification: (verification as any).metadata || {},
        },
        completedAt: verification.success ? new Date() : transaction.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(walletTransactions.id, transaction.id));

    return res.json({ success: true, message: verification.message || 'NOWPayments IPN received' });
  } catch (error: any) {
    console.error('NOWPayments checkout IPN error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to process NOWPayments IPN' });
  }
});

router.post('/crypto/cryptomus/webhook', async (req, res) => {
  try {
    const paymentId = String(req.body?.uuid || req.body?.payment_uuid || req.body?.id || '');
    const orderId = String(req.body?.order_id || '');

    const [transaction] = await db
      .select()
      .from(walletTransactions)
      .where(
        or(
          orderId ? eq(walletTransactions.id, orderId) : sql`false`,
          paymentId ? eq(walletTransactions.providerPaymentId, paymentId) : sql`false`,
        ),
      );

    if (!transaction || transaction.type !== 'package_crypto_payment') {
      return res.status(404).json({ success: false, message: 'Crypto checkout transaction not found' });
    }

    const [gateway] = await db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.id, transaction.paymentGatewayId!));

    if (!gateway || gateway.provider !== 'cryptomus') {
      return res.status(400).json({ success: false, message: 'Cryptomus gateway mismatch' });
    }

    if (!verifyCryptomusWebhookSignature(req.body, gateway)) {
      return res.status(401).json({ success: false, message: 'Invalid Cryptomus webhook signature' });
    }

    const verification = await verifyCryptomusPayment({
      gateway,
      paymentId: paymentId || transaction.providerPaymentId || '',
      orderId: orderId || transaction.id,
    });

    await db
      .update(walletTransactions)
      .set({
        status: verification.success ? 'completed' : ((verification as any).finalFailure ? 'failed' : transaction.status),
        providerPaymentId: paymentId || transaction.providerPaymentId,
        metadata: {
          ...((transaction.metadata as Record<string, unknown>) || {}),
          cryptomus: req.body,
          verification: (verification as any).metadata || {},
        },
        completedAt: verification.success ? new Date() : transaction.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(walletTransactions.id, transaction.id));

    return res.json({ success: true, message: verification.message || 'Cryptomus webhook received' });
  } catch (error: any) {
    console.error('Cryptomus checkout webhook error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to process Cryptomus webhook' });
  }
});



/**
 * Initialize Gift Card Payment
 * Handles payment initialization exclusively for gift card purchases
 */
router.post('/init-gift-card', optionalAuth, async (req, res) => {
  try {
    const {
      gatewayId,
      amount,
      currency,
      recipientEmail,
      recipientName,
      message,
      email,
      name,
      phone,
      paymentMethod = 'spi',
      card,
    } = req.body;

    const guestAccessToken = req.userId ? null : crypto.randomUUID();

    // Gift card purchases don't need a unique order_id from the frontend, but gateways still want one.
    const orderId = `gc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;


    /* ---------------- Validation ---------------- */
    if (!currency || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount and currency are required',
      });
    }

    if (!req.userId && !email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for guest checkout',
      });
    }

    /* ---------------- Pricing ---------------- */
    const pricing = {
      total: Number(amount),
      subtotal: Number(amount),
      discount: 0,
      amount: Number(amount)
    };


    /* ---------------- Gateway Validation ---------------- */
    const [gateway] = await db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.id, gatewayId));

    if (!gateway || !gateway.isEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Selected payment gateway is disabled',
      });
    }

    let result: any;

    const payment = {
      provider: gateway.provider,
      clientSecret: null as string | null,
      paymentIntentId: null as string | null,
      orderId: null as string | null,
      redirectUrl: null as string | null,
      publicKey: null as string | null,
      guestAccessToken: guestAccessToken,
      amount: pricing.total,
      currency: currency,
      paymentMethod: null as string | null,
      purchaseType: 'giftcard'
    };

    /* ========================
       PAYMENT GATEWAY ROUTING
       ======================== */

    switch (gateway.provider) {
      case 'stripe':
        result = await initStripePayment({
          secretKey: gateway.secretKey!,
          amount: pricing.total,
          currency,
          packageId: 'gift_card',
          quantity: 1,
          orderId,
          userId: req.userId,
          email,
          name,
          phone,
          metadata: {
            type: 'gift_card',
            userId: req.userId?.toString() || '',
            amount: String(amount),
            recipientEmail: recipientEmail || '',
            recipientName: recipientName || '',
            message: message || '',
            currency: currency || 'USD',
          },
        });

        payment.clientSecret = gateway.secretKey;
        payment.publicKey = gateway.publicKey!;
        payment.paymentIntentId = result.paymentIntentId;
        payment.guestAccessToken = result.guestAccessToken ?? null;
        payment.amount = pricing.total;
        payment.currency = currency;
        break;

      case 'razorpay':
        result = await initRazorpayPayment({
          keyId: gateway.publicKey!,
          secretKey: gateway.secretKey!,
          amount: pricing.total,
          currency,
          orderId,
          packageId: 'gift_card',
          quantity: 1,
          email: email || undefined,
          phone,
          guestAccessToken: payment.guestAccessToken || undefined,
          userId: req.userId,
          metadata: {
            type: 'gift_card',
            amount: String(amount),
            recipientEmail: recipientEmail || '',
            recipientName: recipientName || '',
            message: message || '',
            currency: currency || 'USD',
            userId: req.userId || '',
          }
        });

        payment.orderId = result.orderId;
        payment.publicKey = result.keyId;
        payment.amount = Math.round(pricing.total * 100);
        payment.currency = currency;
        break;

      case 'paypal':
        result = await initPaypalPayment({
          clientId: gateway.publicKey!,
          secretKey: gateway.secretKey!,
          mode: (gateway.config as any)?.mode || 'sandbox',
          amount: pricing.total,
          currency,
          packageId: 'gift_card',
          quantity: 1,
          email: email || undefined,
          phone: phone,
          guestAccessToken: payment.guestAccessToken,
          userId: req.userId,
          metadata: {
            type: 'gift_card',
            amount: String(amount),
            recipientEmail: recipientEmail || '',
            recipientName: recipientName || '',
            message: message || '',
            currency: currency || 'USD',
            userId: req.userId || '',
          }
        });

        payment.orderId = result.orderId;
        payment.amount = pricing.total;
        payment.currency = currency;
        payment.clientSecret = gateway.secretKey;

        payment.publicKey = gateway.publicKey;
        (payment as any).config = gateway.config;
        break;

      case 'paystack':
        if (!email) {
          return res.status(400).json({
            success: false,
            message: 'Email is required for Paystack payment',
          });
        }

        result = await initPaystackPayment({
          secretKey: gateway.secretKey!,
          email,
          amount: pricing.total,
          currency,
          metadata: {
            type: 'gift_card',
            amount: String(amount),
            recipientEmail: recipientEmail || '',
            recipientName: recipientName || '',
            message: message || '',
            currency: currency || 'USD',
            userId: req.userId || '',
          }
        });

        payment.clientSecret = gateway.secretKey;
        payment.orderId = result.reference;
        payment.redirectUrl = result.authorizationUrl;
        payment.amount = Math.round(pricing.total * 100);
        payment.currency = currency;
        break;

      case 'ayamerchant': {
        const payerUser = req.userId ? await storage.getUser(req.userId) : null;
        const payerEmail = email || payerUser?.email;

        if (!payerEmail) {
          return res.status(400).json({
            success: false,
            message: 'Email is required for AYAMERCHANT payment',
          });
        }

        const metadata = {
          type: 'gift_card',
          userId: req.userId?.toString() || '',
          amount: String(amount),
          recipientEmail: recipientEmail || '',
          recipientName: recipientName || '',
          message: message || '',
          currency: currency || 'USD',
          guestAccessToken: payment.guestAccessToken || '',
          paymentMethodType: 'ayamerchant',
        };

        result = await initAyaMerchantPayment({
          gateway,
          amount: pricing.total,
          currency,
          txRef: orderId,
          email: payerEmail,
          name: name || payerUser?.name || payerEmail,
          phone: phone || (payerUser as any)?.phone || '',
          description: 'Gift card purchase',
          metadata,
          returnUrl: buildPaymentProcessingUrl(req, {
            providerType: 'ayamerchant',
            orderId,
            gatewayId: gateway.id,
            purchaseType: 'giftcard',
          }),
        });

        payment.orderId = result.txRef;
        payment.redirectUrl = result.redirectUrl;
        payment.amount = pricing.total;
        payment.currency = currency;
        (payment as any).txRef = result.txRef;
        break;
      }

      /* ========================
         POWERTRANZ INTEGRATION
         ======================== */

      case 'powertranz':
        if (paymentMethod === 'hpp') {
          // ========================
          // HPP METHOD (HOSTED PAGE)
          // ========================
          console.log('🎯 Initializing PowerTranz HPP (Hosted Payment Page)');

          result = await initPowertranzHpp({
            merchantId: gateway.publicKey!,
            merchantPassword: gateway.secretKey!,
            amount: pricing.total,
            orderId,
            currency,
            email,
            name,
            phone,
          });

          console.log('✅ PowerTranz HPP initialized:', {
            hasRedirectUrl: !!result.redirectUrl,
            hppToken: result.hppToken?.substring(0, 20) + '...',
          });

          // Return HPP redirect response
          return res.json({
            success: true,
            message: 'HPP payment page initialized',
            pricing,
            powertranz: {
              method: 'hpp',
              redirectUrl: result.redirectUrl, // Frontend redirects user to this URL
              hppToken: result.hppToken,
            },
            payment: {
              provider: 'powertranz',
              paymentMethod: 'hpp',
              guestAccessToken,
              amount: pricing.total,
              currency,
              orderId,
            },
          });

        } else {
          // ========================
          // SPI METHOD (3DS IFRAME)
          // ========================
          // 🔥 Validate card data is provided for SPI
          if (!card || !card.pan || !card.cvv || !card.expiry) {
            return res.status(400).json({
              success: false,
              message: 'Card details are required for PowerTranz SPI payment',
            });
          }

          console.log('🔥 Initializing PowerTranz SPI (3DS Challenge)');

          result = await initPowertranzSpiSale({
            merchantId: gateway.publicKey!,
            merchantPassword: gateway.secretKey!,
            amount: pricing.total,
            orderId,
            currency,
            email,
            name,
            card,
          });

          console.log('✅ PowerTranz SPI Response:', {
            Approved: result.Approved,
            IsoResponseCode: result.IsoResponseCode,
            hasSpiToken: !!result.spiToken,
            hasRedirectData: !!result.redirectData,
          });

          // Return 3DS data for frontend iframe
          return res.json({
            success: true,
            message: '3DS authentication required',
            pricing,
            powertranz: {
              method: 'spi',
              orderId,
              redirectData: result.redirectData, // HTML for iframe
              spiToken: result.spiToken, // Store for confirmation
            },
            payment: {
              provider: 'powertranz',
              paymentMethod: 'spi',
              guestAccessToken,
              amount: pricing.total,
              currency,
            },
          });
        }

      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported payment provider',
        });
    }

    /* ========================
       FINAL RESPONSE (non-PowerTranz)
       ======================== */
    return res.json({
      success: true,
      message: 'Payment initialized successfully',
      pricing,
      payment,
    });

  } catch (error: any) {
    console.error('Gift Card Payment init error:', error);

    return res.status(500).json({
      success: false,
      message: error?.message || error?.error || 'Payment initialization failed',
    });
  }
});



export default router;
