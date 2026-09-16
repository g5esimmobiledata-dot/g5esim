"use strict";

import { paymentGatewayFactory } from './factory';
import { getStripeGateway } from './gateways/stripe';

/**
 * Register all payment gateway implementations with the factory
 * This file is imported during application startup
 */

/**
 * Register Stripe gateway
 */
paymentGatewayFactory.register(
  'stripe',
  {
    name: 'Stripe',
    slug: 'stripe',
    isEnabled: true,
    isTestMode: process.env.NODE_ENV !== 'production',
    supportedCurrencies: ['usd', 'eur', 'gbp', 'aud', 'cad', 'jpy', 'inr', 'sgd', 'aed'],
    supportedPaymentMethods: ['card', 'bank_transfer', 'wallet'],
    webhookEndpoint: '/api/webhooks/stripe',
  },
  () => getStripeGateway()
);

// Set Stripe as default gateway
paymentGatewayFactory.setDefault('stripe');

console.log('[PaymentGatewayFactory] Payment gateways registered:', 
  paymentGatewayFactory.getAllGateways().map(g => g.name)
);

export { paymentGatewayFactory };
