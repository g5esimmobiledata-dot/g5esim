import Stripe from "stripe";



export async function verifyStripe(body: any, gateway: any) {
  // 🔐 dynamic stripe instance
  const stripe = new Stripe(gateway.secretKey, {
    apiVersion: '2025-10-29.clover',
  });

  const stripePayload = body?.stripe ?? body;

  const paymentIntentId =
    stripePayload.paymentIntentId ||
    stripePayload.payment_intent ||
    stripePayload.id;

  if (!paymentIntentId) {
    return {
      success: false,
      message: 'Missing Stripe paymentIntentId',
    };
  }

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (!['succeeded', 'processing'].includes(pi.status)) {
    return {
      success: false,
      message: `Stripe status: ${pi.status}`,
    };
  }

  return {
    success: true,
    provider: 'stripe',
    referenceId: pi.id,
    amount: pi.amount_received / 100,
    currency: pi.currency,
    metadata: pi.metadata,
  };
}

export default verifyStripe;
