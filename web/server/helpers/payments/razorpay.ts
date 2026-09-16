import Razorpay from "razorpay";

export async function initRazorpayPayment({
  keyId,
  secretKey,
  amount,
  currency,
  orderId,
  packageId,
  quantity,
  email,
  phone,
  guestAccessToken,
  userId,
  promoCode,
  promoType,
  voucherId,
  giftCardId,
  referralCredits,
  promoDiscount,
  metadata
}: {
  keyId: string;
  secretKey: string;
  amount: number;
  currency: string;
  orderId: string;
  packageId: string;
  quantity: number;
  email?: string;
  phone?: string;
  guestAccessToken?: string;
  userId?: string;
  promoCode?:string;
  promoType?:string;
  voucherId?:string;
  giftCardId?:string;
  referralCredits?:string;
  promoDiscount?: string;
  metadata?: any;
}) {
  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: secretKey,
  });

  /* 🔥 CONSTRUCT NOTES FROM METADATA OR DEFAULTS */
  const notes: any = {
    type: metadata?.type || (userId ? "package_purchase" : "guest_purchase"),
    packageId: packageId || metadata?.packageId || "",
    quantity: (quantity || 1).toString(),
    guestEmail: email || metadata?.guestEmail || "",
    guestPhone: phone || metadata?.phone || "",
    guestAccessToken: guestAccessToken || metadata?.guestAccessToken || "",
    userId: userId || metadata?.userId || "",
    promoCode: promoCode || metadata?.promoCode || "",
    promoType: promoType || metadata?.promoType || "",
    voucherId: voucherId || metadata?.voucherId || "",
    giftCardId: giftCardId || metadata?.giftCardId || "",
    referralCredits: referralCredits || metadata?.referralCredits || "",
    promoDiscount: promoDiscount || metadata?.promoDiscount || "",
    resellerId: metadata?.resellerId || "",
    storefrontHost: metadata?.storefrontHost || "",
    storefrontSubdomain: metadata?.storefrontSubdomain || "",
    priceType: metadata?.priceType || "",
  };

  // Add gift card specific fields if present
  if (metadata?.type === 'gift_card') {
    notes.amount = metadata.amount?.toString();
    notes.recipientEmail = metadata.recipientEmail || "";
    notes.recipientName = metadata.recipientName || "";
    notes.message = metadata.message || "";
    notes.currency = metadata.currency || currency;
  }

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: currency || "INR",
    receipt: orderId,
    notes,
  });

  return {
    provider: "razorpay",
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId,
  };
}

