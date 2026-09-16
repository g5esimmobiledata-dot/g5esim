// import Stripe from "stripe";
// import { storage } from "../../storage";

// type InitStripeInput = {
//   secretKey: string;
//   amount: number;
//   currency: string;
//   orderId: string;
//   userId?: string;
//   email?: string;
//   name?: string;
// };


// export async function initStripePayment({
//   secretKey,
//   amount,
//   currency,
//   orderId,
//   userId,
//   email,
//   name,
// }: InitStripeInput) {
//   const stripe = new Stripe(secretKey, {
//     apiVersion: "2024-04-10",
//   });

//   let customerId: string;
//   let receiptEmail: string | undefined;

//   /* ---------------- USER FLOW ---------------- */
//   if (userId) {
//     const user = await storage.getUserById(userId);
//     if (!user) throw new Error("User not found");

//     const customer = await stripe.customers.create({
//       name: user.name || "Customer",
//       email: user.email,
//       phone: user.phone || undefined,
//       address: {
//         country: "IN",
//         postal_code: user.pincode || "000000",
//         line1: user.address || "NA",
//       },
//       metadata: { userId },
//     });

//     customerId = customer.id;
//     receiptEmail = user.email;
//   }

//   /* ---------------- GUEST FLOW ---------------- */
//   else {
//     if (!email) {
//       throw new Error("Email is required for guest checkout");
//     }

//     const customer = await stripe.customers.create({
//       name: name || "Guest Customer",
//       email,
//       metadata: {
//         guest: "true",
//         orderId,
//       },
//     });

//     customerId = customer.id;
//     receiptEmail = email;
//   }

//   /* ---------------- PAYMENT INTENT ---------------- */
//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: Math.round(amount * 100),
//     currency: currency.toLowerCase(),
//     customer: customerId, // 🔑 REQUIRED (India Stripe)
//     receipt_email: receiptEmail,
//     description: `eSIM purchase | Order ${orderId}`,
//     metadata: {
//       orderId,
//       userId: userId || "guest",
//     },
//     automatic_payment_methods: {
//       enabled: true,
//     },
//   });

//   return {
//     provider: "stripe",
//     clientSecret: paymentIntent.client_secret,
//     paymentIntentId: paymentIntent.id,
//   };
// }


import Stripe from "stripe";
import { storage } from "../../storage";
import { randomUUID } from "crypto";

type InitStripeInput = {
  secretKey: string;
  amount: number;
  currency: string;
  packageId?: string;
  quantity?: number;
  orderId: string;
  userId?: string;
  email?: string;
  name?: string;
  phone?: string;
  metadata?: {
    type?: "package" | "topup" | "gift_card" | "wallet_topup";
    iccid?: string;
    orderId?: string;
    packageId?: string;
    topupId?: string;
    userId?: string;
    walletTransactionId?: string;
    promoCode?: string | number | null;
    promoType?: string | number | null;
    voucherId?: string | number | null;
    giftCardId?: string | number | null;
    referralCredits?: string | number | null;
    promoDiscount?: string | number | null;
    amount?: string | number | null;
    recipientEmail?: string;
    recipientName?: string;
    message?: string;
    currency?: string;
    resellerId?: string;
    storefrontHost?: string;
    storefrontSubdomain?: string;
    priceType?: string;
  };
};


export async function initStripePayment({
  secretKey,
  amount,
  currency,
  packageId = "package",
  quantity = 1,
  orderId,
  userId,
  email,
  name,
  phone,
  metadata
}: InitStripeInput) {

  console.log("Initializing Stripe payment with:", metadata);
  const {
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
} = metadata || {};

  const stripe = new Stripe(secretKey, {
    apiVersion: "2025-10-29.clover",
  });

  let customerId: string;
  let receiptEmail: string;
  let guestAccessToken: string | undefined;

  /* ================= USER FLOW ================= */
  if (userId) {
    const user = await storage.getUserById(userId);
    if (!user) throw new Error("User not found");

    const customer = await stripe.customers.create({
      name: user.name || "Customer",
      email: user.email,
      phone: user.phone || undefined,
      address: {
        country: "IN",
        postal_code: (user as any).pincode || "000000",
        line1: user.address || "NA",
      },
      metadata: {
        userId,
        type: "package_purchase",
        promoCode: promoCode || "",
        promoType: promoType || "",
        voucherId: voucherId || "",
        giftCardId: giftCardId || "",
        referralCredits:referralCredits || "",
        promoDiscount: promoDiscount || ""

      },
    });

    customerId = customer.id;
    receiptEmail = user.email;
  }

  /* ================= GUEST FLOW ================= */
  else {
    if (!email) {
      throw new Error("Email is required for guest checkout");
    }

    guestAccessToken = randomUUID();

    const customer = await stripe.customers.create({
      name: name || "Guest Customer",
      email,
      phone: phone || undefined,
      address: {
        country: "IN",
        line1: "Guest Address",
        postal_code: "000000",
      },
      metadata: {
        guestCheckout: "true",
        guestAccessToken,
        promoCode: promoCode || "",
        promoType: promoType || "",
        voucherId: voucherId || "",
        giftCardId: giftCardId || "",
        referralCredits:referralCredits || "",
        promoDiscount: promoDiscount || ""
      },
    });

    customerId = customer.id;
    receiptEmail = email;
  }


  let paymentMetadata: Stripe.MetadataParam;

  console.log("Preparing payment metadata for:", userId ? `user ${userId}` : `guest ${email}`);

  if (userId) {
    if (metadata?.type === "topup") {
      console.log("Detected top-up purchase for user:", userId);
      paymentMetadata = {
        type: "topup_purchase",
        packageId: metadata.packageId || packageId,
        iccid: metadata.iccid || "",
        orderId: metadata.orderId || orderId,
        topupId: metadata.topupId || metadata.packageId || packageId,
        userId,
        promoCode: promoCode || "",
        promoType: promoType || "",
        voucherId: voucherId || "",
        giftCardId: giftCardId || "",
        referralCredits: String(referralCredits ?? ""),
        promoDiscount: String(promoDiscount ?? ""),
        resellerId: String(resellerId || ""),
        storefrontHost: String(storefrontHost || ""),
        storefrontSubdomain: String(storefrontSubdomain || ""),
        priceType: String(priceType || "retail"),
      };
    } else if (metadata?.type === "wallet_topup") {
      console.log("Detected wallet top-up for user:", userId);
      paymentMetadata = {
        type: "wallet_topup",
        userId,
        walletTransactionId: metadata.walletTransactionId || orderId,
        amount: metadata.amount || amount.toFixed(2),
        currency: metadata.currency || currency,
      };
    } else if (metadata?.type === "gift_card") {
      console.log("Detected gift card purchase for user:", userId);
      paymentMetadata = {
        type: "gift_card",
        userId,
        amount: String(metadata.amount ?? amount.toFixed(2)),
        recipientEmail: metadata.recipientEmail || "",
        recipientName: metadata.recipientName || "",
        message: metadata.message || "",
        currency: metadata.currency || currency,
      };
    } else {
      paymentMetadata = {
        type: "package_purchase",
        packageId,
        quantity: String(quantity),
        orderId,
        userId,
        promoCode: promoCode || "",
        promoType: promoType || "",
        voucherId: voucherId || "",
        giftCardId: giftCardId || "",
        referralCredits: String(referralCredits ?? ""),
        promoDiscount: String(promoDiscount ?? ""),
        resellerId: String(resellerId || ""),
        storefrontHost: String(storefrontHost || ""),
        storefrontSubdomain: String(storefrontSubdomain || ""),
        priceType: String(priceType || "retail"),
      };
    }
  } else {
    if (metadata?.type === "topup") {
      paymentMetadata = {
        type: "topup_purchase",
        packageId: metadata.packageId || packageId,
        iccid: metadata.iccid || "",
        orderId: metadata.orderId || orderId,
        topupId: metadata.topupId || metadata.packageId || packageId,
        guestEmail: email!,
        guestAccessToken: guestAccessToken!,
        promoCode: promoCode || "",
        promoType: promoType || "",
        voucherId: voucherId || "",
        giftCardId: giftCardId || "",
        referralCredits: String(referralCredits ?? ""),
        promoDiscount: String(promoDiscount ?? ""),
      };
    } else if (metadata?.type === "gift_card") {
      console.log("Detected gift card purchase for guest:", email);
      paymentMetadata = {
        type: "gift_card",
        guestEmail: email!,
        guestAccessToken: guestAccessToken!,
        amount: String(metadata.amount ?? amount.toFixed(2)),
        recipientEmail: metadata.recipientEmail || "",
        recipientName: metadata.recipientName || "",
        message: metadata.message || "",
        currency: metadata.currency || currency,
      };
    } else {
      paymentMetadata = {
        type: "guest_purchase",
        packageId,
        quantity: String(quantity),
        orderId,
        guestEmail: email!,
        guestAccessToken: guestAccessToken!,
        promoCode: promoCode || "",
        promoType: promoType || "",
        voucherId: voucherId || "",
        giftCardId: giftCardId || "",
       referralCredits: String(referralCredits ?? ""),
       promoDiscount: String(promoDiscount ?? ""),
      }
    };
  }


  /* ================= PAYMENT INTENT ================= */
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: currency.toLowerCase(),

    customer: customerId, // 🇮🇳 India Stripe requirement
    receipt_email: receiptEmail,

    description: metadata?.type === "wallet_topup"
      ? `Wallet top-up | ${orderId}`
      : `eSIM purchase | Order ${orderId}`,

    metadata: paymentMetadata,

    automatic_payment_methods: {
      enabled: true,
    },
  });

  return {
    provider: "stripe",
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
    guestAccessToken,
  };
}
