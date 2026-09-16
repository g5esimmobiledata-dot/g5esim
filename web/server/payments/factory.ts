"use strict";

import { IPaymentGateway, PaymentGatewayConfig } from './contracts/IPaymentGateway';

/**
 * Payment Gateway Registry Entry
 */
interface GatewayRegistryEntry {
  config: PaymentGatewayConfig;
  factory: () => IPaymentGateway;
  instance?: IPaymentGateway;
}

/**
 * Payment Gateway Factory
 * Manages registration and instantiation of payment gateways
 * Implements plugin architecture for easy addition of new gateways
 */
class PaymentGatewayFactory {
  private registry: Map<string, GatewayRegistryEntry> = new Map();
  private defaultGateway: string | null = null;

  /**
   * Register a payment gateway
   * @param slug Unique gateway identifier
   * @param config Gateway configuration
   * @param factory Factory function to create gateway instance
   */
  register(
    slug: string,
    config: PaymentGatewayConfig,
    factory: () => IPaymentGateway
  ): void {
    this.registry.set(slug, { config, factory });
    console.log(`[PaymentFactory] Registered gateway: ${config.name} (${slug})`);
  }

  /**
   * Set the default payment gateway
   * @param slug Gateway slug
   */
  setDefault(slug: string): void {
    if (!this.registry.has(slug)) {
      throw new Error(`Gateway ${slug} not registered`);
    }
    this.defaultGateway = slug;
    console.log(`[PaymentFactory] Default gateway set to: ${slug}`);
  }

  /**
   * Get a payment gateway by slug
   * @param slug Gateway slug
   * @returns Gateway instance
   */
  getGateway(slug: string): IPaymentGateway {
    const entry = this.registry.get(slug);
    if (!entry) {
      throw new Error(`Payment gateway ${slug} not found`);
    }

    // Lazy instantiation with caching
    if (!entry.instance) {
      entry.instance = entry.factory();
    }

    return entry.instance;
  }

  /**
   * Get the default payment gateway
   * @returns Default gateway instance
   */
  getDefaultGateway(): IPaymentGateway {
    if (!this.defaultGateway) {
      // Fall back to first enabled gateway
      for (const [slug, entry] of this.registry) {
        if (entry.config.isEnabled) {
          this.defaultGateway = slug;
          break;
        }
      }
    }

    if (!this.defaultGateway) {
      throw new Error('No payment gateway available');
    }

    return this.getGateway(this.defaultGateway);
  }

  /**
   * Get all registered gateways
   * @returns Array of gateway configs
   */
  getAllGateways(): PaymentGatewayConfig[] {
    return Array.from(this.registry.values()).map((entry) => entry.config);
  }

  /**
   * Get all enabled gateways
   * @returns Array of enabled gateway configs
   */
  getEnabledGateways(): PaymentGatewayConfig[] {
    return this.getAllGateways().filter((config) => config.isEnabled);
  }

  /**
   * Check if a gateway is registered
   * @param slug Gateway slug
   * @returns True if registered
   */
  hasGateway(slug: string): boolean {
    return this.registry.has(slug);
  }

  /**
   * Clear cached gateway instances
   * Useful for testing or when configuration changes
   */
  clearCache(): void {
    for (const entry of this.registry.values()) {
      entry.instance = undefined;
    }
  }

  /**
   * Unregister a gateway
   * @param slug Gateway slug
   */
  unregister(slug: string): void {
    this.registry.delete(slug);
    if (this.defaultGateway === slug) {
      this.defaultGateway = null;
    }
  }
}

// Export singleton instance
export const paymentGatewayFactory = new PaymentGatewayFactory();

// Export types
export type { IPaymentGateway, PaymentGatewayConfig };
