// import checkoutSdk from "@paypal/checkout-server-sdk";

// export async function initPaypalPayment({
//   clientId,
//   secretKey,
//   amount,
//   currency,
// }: {
//   clientId: string;
//   secretKey: string;
//   amount: number;
//   currency: string;
// }) {
//   const environment = new checkoutSdk.core.SandboxEnvironment(
//     clientId,
//     secretKey
//   );
//   const client = new checkoutSdk.core.PayPalHttpClient(environment);

//   const request = new checkoutSdk.orders.OrdersCreateRequest();
//   request.prefer("return=representation");
//   request.requestBody({
//     intent: "CAPTURE",
//     purchase_units: [
//       {
//         amount: {
//           currency_code: currency,
//           value: amount.toString(),
//         },
//       },
//     ],
//   });

//   const order = await client.execute(request);

//   return {
//     provider: "paypal",
//     orderId: order.result.id,
//   };
// }



import checkoutSdk from "@paypal/checkout-server-sdk";

export async function initPaypalPayment({
  clientId,
  secretKey,
  mode = "sandbox",
  amount,
  currency,
  packageId,
  quantity = 1,
  email,
  phone,
  guestAccessToken,
  userId,
  metadata,
  returnUrl,
  cancelUrl,
}: {
  clientId: string;
  secretKey: string;
  mode?: string;
  amount: number;
  currency: string;
  packageId?: string;
  quantity?: number;
  email?: string;
  phone?: string;
  guestAccessToken?: string;
  userId?: string;
  metadata?: any;
  returnUrl?: string;
  cancelUrl?: string;
}) {
  const environment = mode === "live"
    ? new checkoutSdk.core.LiveEnvironment(clientId, secretKey)
    : new checkoutSdk.core.SandboxEnvironment(clientId, secretKey);

  const client = new checkoutSdk.core.PayPalHttpClient(environment);

  /* 🔥 CONSTRUCT METADATA (Aggressive compression for 127 char limit) */
  const metadataMap: Record<string, string> = {
    type: 'T',
    userId: 'U',
    guestEmail: 'E',
    amount: 'A',
    recipientEmail: 'R',
    recipientName: 'N',
    message: 'M',
    currency: 'C',
    packageId: 'P',
    quantity: 'Q',
    guestPhone: 'H',
    guestAccessToken: 'S',
    promoCode: 'pc',
    promoType: 'pt',
    promoDiscount: 'pd',
    voucherId: 'vi',
    giftCardId: 'gi',
    referralCredits: 'rc',
    walletTransactionId: 'wt',
    resellerId: 'rs',
    resellerPaypalEmail: 'pe',
    storefrontSubdomain: 'sd',
    priceType: 'ptp'
  };

  const metadataValues: any = {
    type: metadata?.type === 'gift_card' ? 'gc' : (metadata?.type || (userId ? "pkg" : "gst")),
    packageId: packageId || metadata?.packageId || "",
    quantity: (quantity || 1).toString(),
    guestEmail: email || metadata?.guestEmail || "",
    guestPhone: phone || metadata?.phone || "",
    guestAccessToken: guestAccessToken || metadata?.guestAccessToken || "",
    userId: userId || metadata?.userId || "",
  };

  // Add gift card specific fields if present
  if (metadata?.type === 'gift_card' || metadataValues.type === 'gc') {
    metadataValues.amount = metadata.amount?.toString();
    metadataValues.recipientEmail = metadata.recipientEmail || "";
    metadataValues.recipientName = metadata.recipientName || "";
    metadataValues.message = metadata.message || "";
    metadataValues.currency = metadata.currency || currency;
  }

  if (metadata?.type === 'wallet_topup') {
    metadataValues.amount = metadata.amount?.toString() || amount.toString();
    metadataValues.currency = metadata.currency || currency;
    metadataValues.walletTransactionId = metadata.walletTransactionId || "";
  }

  // Also include any other metadata passed
  if (metadata && typeof metadata === 'object') {
    for (const key in metadata) {
      if (!(key in metadataValues)) {
        metadataValues[key] = metadata[key];
      }
    }
  }

  // Compress keys and remove empty values
  let compressed: any = {};
  for (const key in metadataValues) {
    const value = metadataValues[key];
    if (value !== null && value !== undefined && value !== "") {
      const shortKey = metadataMap[key] || key;
      compressed[shortKey] = value;
    }
  }

  let customId = JSON.stringify(compressed);

  // If still too long, truncate non-critical strings (message, recipientName)
  if (customId.length > 127) {
    if (compressed.M) {
      compressed.M = compressed.M.substring(0, 15);
      customId = JSON.stringify(compressed);
    }
    
    if (customId.length > 127 && compressed.N) {
      compressed.N = compressed.N.substring(0, 15);
      customId = JSON.stringify(compressed);
    }

    // If STILL too long, remove optional fields until it fits
    const optionalKeys = ['M', 'N', 'H', 'pc', 'pt', 'pd', 'vi', 'gi', 'rc', 'ptp', 'sd', 'pe'];
    for (const key of optionalKeys) {
      if (customId.length <= 127) break;
      if (key in compressed) {
        delete compressed[key];
        customId = JSON.stringify(compressed);
      }
    }

    // If somehow STILL too long, we need to shorten emails as a last resort
    if (customId.length > 127 && compressed.E) {
      compressed.E = compressed.E.length > 25 ? compressed.E.substring(0, 25) + ".." : compressed.E;
      customId = JSON.stringify(compressed);
    }
    
    if (customId.length > 127 && compressed.R) {
      compressed.R = compressed.R.length > 25 ? compressed.R.substring(0, 25) + ".." : compressed.R;
      customId = JSON.stringify(compressed);
    }
    
    // Final check for safety - if somehow we're still over 127, we can't afford broken JSON.
    if (customId.length > 127) {
      console.warn('[PayPal] CRITICAL: Metadata still over 127 chars.', customId);
    }
  }

  const request = new checkoutSdk.orders.OrdersCreateRequest();
  request.prefer("return=representation");

  request.requestBody({
    intent: "CAPTURE",
    ...(returnUrl || cancelUrl
      ? {
          application_context: {
            ...(returnUrl ? { return_url: returnUrl } : {}),
            ...(cancelUrl ? { cancel_url: cancelUrl } : {}),
            user_action: "PAY_NOW",
          },
        }
      : {}),
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: amount.toString(),
        },

        // 🔐 PayPal-safe metadata storage
        custom_id: customId,
      },
    ],
  });

  const order = await client.execute(request);
  const approvalUrl = order.result.links?.find((link: any) => link.rel === "approve")?.href;

  return {
    provider: "paypal",
    orderId: order.result.id,
    approvalUrl,
  };
}

