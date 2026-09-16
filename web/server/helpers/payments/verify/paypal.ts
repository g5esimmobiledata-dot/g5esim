// import axios from "axios";

// async function getPaypalAccessToken() {
//   const { data } = await axios.post(
//     "https://api-m.paypal.com/v1/oauth2/token",
//     "grant_type=client_credentials",
//     {
//       auth: {
//         username: process.env.PAYPAL_CLIENT_ID!,
//         password: process.env.PAYPAL_SECRET!,
//       },
//     }
//   );
//   return data.access_token;
// }


// async function verifyPaypal(body: any) {
//   const { paypal } = body;

//   const accessToken = await getPaypalAccessToken();

//   const { data } = await axios.get(
//     `https://api-m.paypal.com/v2/checkout/orders/${paypal.orderId}`,
//     {
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//       },
//     }
//   );

//   if (data.status !== "COMPLETED") {
//     return { success: false, message: "PayPal payment not completed" };
//   }

//   return {
//     success: true,
//     metadata: {
//       orderId: data.id,
//       payerEmail: data.payer?.email_address,
//     },
//   };
// }



// export async function verifyPaypal(body: any) {
//   const accessToken = await getPaypalAccessToken();

//   const base =
//     process.env.PAYPAL_MODE === "live"
// ? "https://api-m.paypal.com"
//       : "https://api-m.sandbox.paypal.com";

//   const { data } = await axios.get(
//     `${base}/v2/checkout/orders/${body.paypal.orderId}`,
//     { headers: { Authorization: `Bearer ${accessToken}` } }
//   );

//   if (data.status !== "COMPLETED") {
//     return { success: false, message: "PayPal payment not completed" };
//   }

//   return {
//     success: true,
//     provider: "paypal",
//     referenceId: data.id,
//     metadata: { payerEmail: data.payer?.email_address },
//   };
// }


// export default verifyPaypal;




import axios from "axios";

/* ===============================
   GET PAYPAL ACCESS TOKEN
================================ */


async function getPaypalAccessToken(gateway: any) {
  const mode = gateway?.config?.mode || gateway?.mode;
  const base =
    mode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  const { data } = await axios.post(
    `${base}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      auth: {
        username: gateway.publicKey,
        password: gateway.secretKey,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return data.access_token as string;
}

/* ===============================
   VERIFY PAYPAL PAYMENT
================================ */





export async function verifyPaypal(body: any, gateway: any) {
  const paypalPayload = body?.paypal ?? body;

  const orderId =
    paypalPayload.orderId ||
    paypalPayload.order_id ||
    paypalPayload.paymentId;

  if (!orderId) {
    return {
      success: false,
      message: "PayPal orderId/paymentId missing",
    };
  }

  const accessToken = await getPaypalAccessToken(gateway);

  const mode = gateway?.config?.mode || gateway?.mode;
  const base =
    mode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  console.log(`[PayPal] Verifying ID: ${orderId} (Mode: ${mode})`);

  // ==========================================
  // Case A: ID is a V1 Payment ID (PAYID-...)
  // ==========================================
  if (orderId.startsWith("PAYID-")) {
    console.log(`[PayPal] Detected V1 Payment ID: ${orderId}`);
    try {
      let { data } = await axios.get(`${base}/v1/payments/payment/${orderId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // If status is created/approved, we must execute it (v1 version of capture)
      if (data.state === "approved") {
        // v1 execute logic if needed, but usually UsePaypal already executes it
      }

      if (data.state !== "approved" && data.state !== "completed" && data.state !== "sale") {
        return {
          success: false,
          message: `PayPal V1 payment not successful (state: ${data.state})`,
        };
      }

      // Metadata in v1 is in transactions[0].custom
      let metadata: any = {};
      try {
        const rawMetadata = JSON.parse(data.transactions?.[0]?.custom || "{}");
        // Reuse same decompression mapping logic
        const reverseMap: Record<string, string> = {
          T: 'type', U: 'userId', E: 'guestEmail', A: 'amount', R: 'recipientEmail',
          N: 'recipientName', M: 'message', C: 'currency', P: 'packageId', Q: 'quantity',
          H: 'guestPhone', S: 'guestAccessToken', pc: 'promoCode', pt: 'promoType',
          pd: 'promoDiscount', vi: 'voucherId', gi: 'giftCardId', rc: 'referralCredits',
          wt: 'walletTransactionId', rs: 'resellerId', sd: 'storefrontSubdomain', ptp: 'priceType'
        };
        for (const key in rawMetadata) {
          const fullKey = reverseMap[key] || key;
          metadata[fullKey] = rawMetadata[key];
        }
        if (metadata.type === 'gc') metadata.type = 'gift_card';
        if (metadata.type === 'pkg') metadata.type = 'package_purchase';
        if (metadata.type === 'gst') metadata.type = 'guest_purchase';
        if (metadata.type === 'wallet_topup') metadata.type = 'wallet_topup';
      } catch {
        metadata = {};
      }

      const amount = Number(data.transactions?.[0]?.amount?.total || 0);

      return {
        success: true,
        provider: "paypal",
        referenceId: data.id,
        amount,
        currency: data.transactions?.[0]?.amount?.currency,
        metadata,
      };
    } catch (v1Err: any) {
      console.error(`[PayPal] V1 Verification failed:`, v1Err.response?.data || v1Err.message);
      return {
        success: false,
        message: `PayPal V1 verification failed: ${v1Err.response?.data?.message || v1Err.message}`,
      };
    }
  }

  // ==========================================
  // Case B: ID is a V2 Order ID
  // ==========================================
  try {
    // 1. Get current order status
    let { data } = await axios.get(`${base}/v2/checkout/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // 2. If status is APPROVED, capture it
    if (data.status === "APPROVED") {
      console.log(`[PayPal] Order ${orderId} is APPROVED, capturing now...`);
      try {
        const captureResponse = await axios.post(
          `${base}/v2/checkout/orders/${orderId}/capture`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
              "PayPal-Request-Id": orderId,
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        data = captureResponse.data;
        console.log(`[PayPal] Order ${orderId} captured successfully, status: ${data.status}`);
      } catch (captureErr: any) {
        console.error(
          `[PayPal] Capture failed for order ${orderId}:`,
          captureErr.response?.data || captureErr.message
        );
        return {
          success: false,
          message: `PayPal capture failed: ${captureErr.response?.data?.message || captureErr.message}`,
        };
      }
    }

    if (data.status !== "COMPLETED") {
      console.warn(
        `[PayPal] Order ${orderId} not completed. Full response:`,
        JSON.stringify(data, null, 2)
      );
      return {
        success: false,
        message: `PayPal payment not completed (status: ${data.status})`,
      };
    }

    /* 🔐 DECOMPRESS METADATA (Aggressive compression map) */
    let metadata: any = {};
    const reverseMap: Record<string, string> = {
      T: 'type',
      U: 'userId',
      E: 'guestEmail',
      A: 'amount',
      R: 'recipientEmail',
      N: 'recipientName',
      M: 'message',
      C: 'currency',
      P: 'packageId',
      Q: 'quantity',
      H: 'guestPhone',
      S: 'guestAccessToken',
      pc: 'promoCode',
      pt: 'promoType',
      pd: 'promoDiscount',
      vi: 'voucherId',
      gi: 'giftCardId',
      rc: 'referralCredits',
      wt: 'walletTransactionId',
      rs: 'resellerId',
      sd: 'storefrontSubdomain',
      ptp: 'priceType'
    };

    try {
      const rawMetadata = JSON.parse(data.purchase_units?.[0]?.custom_id || "{}");
      for (const key in rawMetadata) {
        const fullKey = reverseMap[key] || key;
        metadata[fullKey] = rawMetadata[key];
      }

      // Restore full type aliases
      if (metadata.type === 'gc') metadata.type = 'gift_card';
      if (metadata.type === 'pkg') metadata.type = 'package_purchase';
      if (metadata.type === 'gst') metadata.type = 'guest_purchase';
      if (metadata.type === 'wallet_topup') metadata.type = 'wallet_topup';

    } catch (e) {
      console.error('[PayPal Verify] Metadata parsing failed:', e);
      metadata = {};
    }

    const amount = Number(data.purchase_units?.[0]?.amount?.value || 0);

    return {
      success: true,
      provider: "paypal",
      referenceId: data.id,
      paymentId: data.id,
      amount,
      currency: data.purchase_units?.[0]?.amount?.currency_code,
      metadata,
    };
  } catch (v2Err: any) {
    console.error(`[PayPal] V2 Verification failed:`, v2Err.response?.data || v2Err.message);
    return {
      success: false,
      message: `PayPal verification failed: ${v2Err.response?.data?.message || v2Err.message}`,
    };
  }
}

export default verifyPaypal;
