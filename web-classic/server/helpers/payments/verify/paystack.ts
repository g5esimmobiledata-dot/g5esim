import axios from "axios";

/* ===============================
   VERIFY PAYSTACK PAYMENT
================================ */
export async function verifyPaystack(body: any, gateway: any) {
  const paystackPayload = body?.paystack ?? body;

  const reference = paystackPayload.reference;

  if (!reference) {
    return {
      success: false,
      message: "Paystack reference missing",
    };
  }

  if (!gateway?.secretKey) {
    return {
      success: false,
      message: "Paystack secret key not configured",
    };
  }

  const { data } = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${gateway.secretKey}`, // ✅ dynamic
      },
    }
  );

  const trx = data?.data;

  if (!trx || trx.status !== "success") {
    return {
      success: false,
      message: "Paystack payment failed",
    };
  }

  return {
    success: true,
    provider: "paystack",
    referenceId: reference,
    paymentId: trx.id,
    amount: trx.amount,
    currency: trx.currency,
    metadata: {
      email: trx.customer?.email,
      ...trx.metadata,
    },
  };
}

export default verifyPaystack;
