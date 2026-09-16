"use strict";

import { IPaymentGateway } from "./payment-gateway-interface";
import { StripeGateway } from "./stripe";

class PaymentGatewayFactory {
  private gatewayCache: Map<string, IPaymentGateway> = new Map();

  getGateway(slug: string): IPaymentGateway {
    const cached = this.gatewayCache.get(slug);
    if (cached) {
      return cached;
    }

    let gateway: IPaymentGateway;

    switch (slug) {
      case "stripe":
        gateway = new StripeGateway();
        break;
      default:
        throw new Error(`Unknown payment gateway: ${slug}`);
    }

    this.gatewayCache.set(slug, gateway);
    return gateway;
  }

  getDefaultGateway(): IPaymentGateway {
    return this.getGateway("stripe");
  }

  getAllGateways(): IPaymentGateway[] {
    const slugs = ["stripe"];
    return slugs.map((slug) => this.getGateway(slug));
  }

  async healthCheckAll(): Promise<
    Array<{
      slug: string;
      name: string;
      healthy: boolean;
      responseTime?: number;
      errorMessage?: string;
    }>
  > {
    const gateways = this.getAllGateways();
    const results = await Promise.all(
      gateways.map(async (gateway) => {
        const health = await gateway.healthCheck();
        return {
          slug: gateway.slug,
          name: gateway.name,
          ...health,
        };
      })
    );
    return results;
  }

  clearCache(): void {
    this.gatewayCache.clear();
  }
}

export const paymentGatewayFactory = new PaymentGatewayFactory();
