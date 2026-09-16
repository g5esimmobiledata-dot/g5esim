import { Router } from 'express';
import { optionalAuth } from 'server/lib/middleware';
import { calculateFinalPrice } from 'server/helpers/calculatePricing';
import { storage } from 'server/storage';
import { generateOrderConfirmationEmail, generateInstallationEmail, sendEmail } from 'server/email';
import { getAdminMessaging } from 'server/config/firebase-admin';
import { sendOneSignalPushToUsers } from 'server/services/onesignal-service';
import { db } from 'server/db';
import { priceBrackets } from '@shared/schema';
import { and, or, eq, lte, gte, isNull, asc } from "drizzle-orm";

const router = Router();

/* ============================================================
   POST /api/iap/init
   ──────────────────
   Returns pricing info for a package so the mobile app can
   display the price BEFORE the native purchase dialog opens.
   No gateway lookup — IAP is handled natively by the OS.
   ============================================================ */
router.post('/init', optionalAuth, async (req, res) => {
    try {
        const {
            packageId,
            quantity = 1,
            currency = 'USD',
            promoCode,
            promoType,
            voucherId,
            giftCardId,
            referralCredits,
        } = req.body;

        if (!packageId) {
            return res.status(400).json({ success: false, message: 'packageId is required' });
        }

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
        });


        // Since store price brackets are in USD, we convert our total to USD for lookup
        const finalPriceUSD = pricing.totalUSD;
        const finalPriceStr = finalPriceUSD.toFixed(2);

        const [matchingBrackets] = await db
            .select()
            .from(priceBrackets)
            .where(
                and(
                    eq(priceBrackets.currency, 'USD'),
                    eq(priceBrackets.isActive, true),
                    lte(priceBrackets.minPrice, finalPriceStr),
                    or(
                        isNull(priceBrackets.maxPrice),
                        gte(priceBrackets.maxPrice, finalPriceStr)
                    )
                )
            )
            .orderBy(asc(priceBrackets.maxPrice));
        return res.json({
            success: true,
            message: 'IAP pricing loaded',
            pricing,
            iap: {
                platform: 'android | ios',
                availableBrackets: matchingBrackets,
                note: 'Complete the purchase natively, then call POST /api/iap/verify to provision your eSIM.',
            },
        });
    } catch (error: any) {
        console.error('[IAP Init] Error:', error);
        return res.status(500).json({ success: false, message: error?.message || 'IAP init failed' });
    }
});

/* ============================================================
   POST /api/iap/verify
   ─────────────────────
   Called by the mobile app AFTER a successful native purchase.
   Verifies the receipt with Apple / Google, then:
     1. Creates an order record
     2. Provisions the eSIM via the provider
     3. Sends confirmation email + push notification
   ============================================================

   ── Android body ──
   {
     platform: "android",
     packageId: "...",       // our internal package ID
     quantity: 1,
     currency: "USD",
     userId: "...",          // required (mobile users must be logged in)
     purchaseToken: "...",   // from Google Play
     productId: "...",       // Google Play product ID
     packageName: "...",     // e.g. com.yourcompany.esimapp
     promoCode, promoType, voucherId, giftCardId, referralCredits
   }

   ── iOS body ──
   {
     platform: "ios",
     packageId: "...",
     quantity: 1,
     currency: "USD",
     userId: "...",
     receiptData: "base64…", // from StoreKit
     productId: "...",
     promoCode, promoType, voucherId, giftCardId, referralCredits
   }
   ============================================================ */
router.post('/verify', optionalAuth, async (req, res) => {
    try {
        const {
            platform,
            packageId,
            quantity = 1,
            currency = 'USD',
            userId: bodyUserId,
            promoCode,
            promoType,
            voucherId,
            giftCardId,
            referralCredits,
        } = req.body;

        // Resolve userId — prefer session, fall back to body param
        const userId = req.userId || bodyUserId;

        /* ── Validation ── */
        if (!platform || !['android', 'ios'].includes(platform)) {
            return res.status(400).json({ success: false, message: 'platform must be "android" or "ios"' });
        }
        if (!packageId) {
            return res.status(400).json({ success: false, message: 'packageId is required' });
        }
        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId is required for IAP' });
        }

        /* ── Step 1: Verify receipt with Apple / Google ── */
        let transactionId: string;

        if (platform === 'android') {
            const { purchaseToken, productId, packageName } = req.body;
            if (!purchaseToken || !productId || !packageName) {
                return res.status(400).json({
                    success: false,
                    message: 'purchaseToken, productId and packageName are required for Android IAP',
                });
            }

            console.log('[IAP Verify] Verifying Android purchase with Google Play...');
            const { verifyAndroidPurchaseWithGoogle } = await import('server/services/androidPurchase.service');

            let googleResult: any;
            try {
                googleResult = await verifyAndroidPurchaseWithGoogle({ packageName, productId, purchaseToken });
            } catch (verifyErr: any) {
                console.error('[IAP Verify] Google verification failed:', verifyErr.message);
                return res.status(400).json({ success: false, message: 'Android receipt verification failed: ' + verifyErr.message });
            }

            // purchaseState 0 = purchased (already asserted inside the service, but double-check)
            if (googleResult.purchaseState !== 0) {
                return res.status(400).json({ success: false, message: 'Android purchase not completed' });
            }

            transactionId = googleResult.orderId || purchaseToken;
            console.log('[IAP Verify] ✅ Android purchase verified. orderId:', transactionId);

        } else {
            // iOS
            const { receiptData } = req.body;
            if (!receiptData) {
                return res.status(400).json({ success: false, message: 'receiptData is required for iOS IAP' });
            }

            console.log('[IAP Verify] Verifying iOS receipt with Apple...');
            const { verifyAppleReceipt } = await import('server/services/applePurchase.service');

            let appleResult: any;
            try {
                appleResult = await verifyAppleReceipt(receiptData, false);
                if (appleResult.status === 21007) {
                    console.log('[IAP Verify] Sandbox receipt detected, retrying with sandbox endpoint...');
                    appleResult = await verifyAppleReceipt(receiptData, true);
                }
            } catch (verifyErr: any) {
                console.error('[IAP Verify] Apple verification failed:', verifyErr.message);
                return res.status(400).json({ success: false, message: 'iOS receipt verification failed: ' + verifyErr.message });
            }

            if (appleResult.status !== 0) {
                return res.status(400).json({
                    success: false,
                    message: `Apple receipt verification failed. Status: ${appleResult.status}`,
                });
            }

            // Grab latest transaction from receipt
            const latestReceipt = appleResult.latest_receipt_info?.[0];
            transactionId = latestReceipt?.transaction_id || ('ios-receipt-' + Date.now());
            console.log('[IAP Verify] ✅ iOS receipt verified. transaction_id:', transactionId);
        }

        /* ── Step 2: Calculate pricing ── */
        const pricing = await calculateFinalPrice({
            packageId,
            quantity,
            requestedCurrency: currency,
            promoCode,
            promoType,
            voucherId,
            giftCardId,
            referralCredits,
            userId,
        });

        /* ── Step 3: Resolve package ── */
        const { resolvePackage, getProviderSpecificPackageId } =
            await import('server/services/packages/package-resolver');

        const pkg = await resolvePackage(packageId);
        if (!pkg) {
            return res.status(404).json({ success: false, message: 'Package not found' });
        }

        /* ── Step 4: Create order record ── */
        const order = await storage.createOrder({
            userId,
            packageId: pkg.id,
            orderType: 'single',
            quantity: 1,
            status: 'processing',
            price: pricing.total,
            airaloPrice: pkg.wholesalePrice,
            currency: currency.toUpperCase(),
            orderCurrency: currency.toUpperCase(),
            dataAmount: pkg.dataAmount,
            validity: pkg.validity,
            installationSent: false,
            paymentMethod: platform === 'android' ? 'iap-android' : 'iap-ios',
            transactionId,
            providerId: pkg.providerId,
        });

        console.log('[IAP Verify] ✅ Order created:', order.id);

        /* ── Step 5: Provision eSIM ── */
        let simDetails: any;
        let orderDetails: any;

        try {
            if (pkg.providerId && pkg.providerPackageTable && pkg.providerPackageId) {
                const { providerFactory } = await import('server/providers/provider-factory');
                const providerService = await providerFactory.getServiceById(pkg.providerId);

                const providerApiPackageId = await getProviderSpecificPackageId(
                    pkg.providerPackageTable,
                    pkg.providerPackageId,
                );

                if (!providerApiPackageId) {
                    throw new Error('Provider package ID not found');
                }

                const providerResponse = await providerService.createOrder({
                    packageId: providerApiPackageId,
                    quantity: 1,
                    customerRef: `IAP-Order-${order.id}`,
                });

                if (!providerResponse.success) {
                    throw new Error(providerResponse.errorMessage || 'Provider order failed');
                }

                simDetails = {
                    iccid: providerResponse.iccid,
                    qrCode: providerResponse.qrCode,
                    qrCodeUrl: providerResponse.qrCodeUrl,
                    smdpAddress: providerResponse.smdpAddress,
                    activationCode: providerResponse.activationCode,
                    lpaCode: providerResponse.qrCode,
                    directAppleUrl: null,
                    apnType: 'automatic',
                    apnValue: null,
                    isRoaming: false,
                };

                orderDetails = {
                    providerOrderId: providerResponse.providerOrderId,
                    requestId: providerResponse.requestId,
                };

            } else if (pkg.airaloId) {
                const { airaloOrderService } = await import('server/services/airalo/airalo-order');
                const airaloResponse = await airaloOrderService.submitSingleOrder(
                    pkg.airaloId,
                    1,
                    `IAP-Order-${order.id}`,
                );
                orderDetails = { providerOrderId: airaloResponse.airaloOrderId };
                simDetails = airaloResponse.sims[0];

            } else {
                throw new Error('Invalid package configuration — no provider or airaloId');
            }

            /* ── Step 6: Update order with SIM details ── */
            await storage.updateOrder(order.id, {
                providerOrderId: orderDetails.providerOrderId,
                airaloOrderId: orderDetails.providerOrderId,
                iccid: simDetails.iccid,
                qrCode: simDetails.qrCode,
                qrCodeUrl: simDetails.qrCodeUrl,
                lpaCode: simDetails.lpaCode,
                smdpAddress: simDetails.smdpAddress,
                activationCode: simDetails.activationCode,
                directAppleUrl: simDetails.directAppleUrl,
                apnType: simDetails.apnType,
                apnValue: simDetails.apnValue,
                isRoaming: simDetails.isRoaming,
                status: 'completed',
            });

            console.log('[IAP Verify] ✅ eSIM provisioned. ICCID:', simDetails.iccid);

            /* ── Step 7: Notifications & email ── */
            const user = await storage.getUser(userId);
            if (user) {
                // In-app notification
                await storage.createNotification({
                    userId,
                    type: 'purchase',
                    title: 'Order Confirmed',
                    message: `Your ${pkg.dataAmount} eSIM is ready! Check your email for installation instructions.`,
                    read: false,
                    metadata: { orderId: order.id },
                });

                // FCM push notification
                const pushTitle = 'Order Confirmed';
                const pushBody = `Your ${pkg.dataAmount} eSIM is ready! Check your email for installation instructions.`;
                const pushData = {
                    type: 'purchase',
                    orderId: order.id,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK',
                };
                const oneSignalResult = await sendOneSignalPushToUsers([user.id], pushTitle, pushBody, pushData).catch((error) => {
                    console.warn('[IAP Verify] OneSignal push unavailable:', error instanceof Error ? error.message : error);
                    return null;
                });
                if (user.fcmToken) {
                    try {
                        if (oneSignalResult?.sent) {
                            console.log('[IAP Verify] OneSignal push notification sent to user:', user.id);
                        } else {
                        const messaging = await getAdminMessaging();
                        await messaging.send({
                            notification: {
                                title: 'Order Confirmed 🎉',
                                body: pushBody,
                            },
                            data: {
                                type: 'purchase',
                                orderId: order.id,
                                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                            },
                            token: user.fcmToken,
                        });
                        console.log('[IAP Verify] 📱 Push notification sent to user:', user.id);
                        }
                    } catch (fcmErr) {
                        console.error('[IAP Verify] FCM send error:', fcmErr);
                    }
                }

                // Confirmation & Installation emails
                try {
                    const confirmEmail = await generateOrderConfirmationEmail({
                        id: order.id,
                        displayId: order.displayOrderId || order.id,
                        customerName: user.name || 'Customer',
                        destination: pkg.title || 'eSIM',
                        dataAmount: pkg.dataAmount,
                        validity: pkg.validity,
                        price: order.price,
                        iccid: simDetails.iccid,
                        qrCode: simDetails.qrCode,
                        qrCodeUrl: simDetails.qrCodeUrl,
                        lpaCode: simDetails.lpaCode,
                        smdpAddress: simDetails.smdpAddress,
                        activationCode: simDetails.activationCode,
                    });
                    await sendEmail({ to: user.email, subject: confirmEmail.subject, html: confirmEmail.html });
                    console.log('[IAP Verify] 📧 Confirmation email sent to:', user.email);

                    // Also send detailed Installation Instructions (with QR code)
                    const installEmail = await generateInstallationEmail({
                        name: user.name || 'Traveler',
                        packageName: `${pkg.dataAmount} - ${pkg.validity} Days`,
                        qrCodeUrl: simDetails.qrCodeUrl,
                        iccid: simDetails.iccid,
                        activationCode: simDetails.activationCode,
                        smdpAddress: simDetails.smdpAddress,
                        qrCode: simDetails.qrCode,
                        lpaCode: simDetails.lpaCode,
                    });
                    await sendEmail({ to: user.email, subject: installEmail.subject, html: installEmail.html });
                    console.log('[IAP Verify] 📧 Installation instructions sent to:', user.email);

                    await storage.updateOrder(order.id, { installationSent: true });

                } catch (emailErr) {
                    console.error('[IAP Verify] Email send error:', emailErr);
                }
            }

            return res.json({
                success: true,
                message: 'Order verified successfully',
                order: {
                    ...order,
                    iccid: simDetails.iccid,
                    qrCodeUrl: simDetails.qrCodeUrl,
                    activationCode: simDetails.activationCode,
                    lpaCode: simDetails.lpaCode,
                    smdpAddress: simDetails.smdpAddress,
                    status: 'completed',
                },
                transactionId,
                platform,
            });

        } catch (provisionErr: any) {
            // Mark order as failed but don't lose the transaction record
            await storage.updateOrder(order.id, { status: 'failed' });
            console.error('[IAP Verify] eSIM provisioning failed:', provisionErr.message);
            throw new Error('eSIM provisioning failed: ' + provisionErr.message);
        }

    } catch (error: any) {
        console.error('[IAP Verify] Error:', error);
        return res.status(500).json({ success: false, message: error?.message || 'IAP verification failed' });
    }
});

export default router;
