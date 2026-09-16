"use strict";

import { IProviderService, ProviderConfig } from './contracts/IProviderService';
import type { Provider } from '@shared/schema';

/**
 * Provider Registry Entry
 */
interface ProviderRegistryEntry {
  config: ProviderConfig;
  factory: (provider: Provider) => IProviderService;
  instances: Map<string, IProviderService>; // Keyed by provider ID
}

/**
 * Provider Factory
 * Manages registration and instantiation of eSIM providers
 * Implements plugin architecture for easy addition of new providers
 */
class ProviderFactory {
  private registry: Map<string, ProviderRegistryEntry> = new Map();

  /**
   * Register a provider implementation
   * @param slug Unique provider identifier (e.g., 'airalo', 'esim-go')
   * @param config Provider configuration
   * @param factory Factory function to create provider service instance
   */
  register(
    slug: string,
    config: ProviderConfig,
    factory: (provider: Provider) => IProviderService
  ): void {
    this.registry.set(slug, {
      config,
      factory,
      instances: new Map(),
    });
    console.log(`[ProviderFactory] Registered provider: ${config.name} (${slug})`);
  }

  /**
   * Get a provider service by provider database record
   * @param provider Provider database record
   * @returns Provider service instance
   */
  getService(provider: Provider): IProviderService {
    const entry = this.registry.get(provider.slug);
    if (!entry) {
      throw new Error(`Provider ${provider.slug} not registered`);
    }

    // Check for cached instance
    let instance = entry.instances.get(provider.id);
    if (!instance) {
      instance = entry.factory(provider);
      entry.instances.set(provider.id, instance);
    }

    return instance;
  }

  /**
   * Get a provider service by slug
   * Requires provider to be fetched from database first
   * @param slug Provider slug
   * @param providerFetcher Function to fetch provider from database
   * @returns Provider service instance
   */
  async getServiceBySlug(
    slug: string,
    providerFetcher: (slug: string) => Promise<Provider | undefined>
  ): Promise<IProviderService> {
    const provider = await providerFetcher(slug);
    if (!provider) {
      throw new Error(`Provider ${slug} not found in database`);
    }
    return this.getService(provider);
  }

  /**
   * Get all registered provider configs
   * @returns Array of provider configs
   */
  getAllConfigs(): ProviderConfig[] {
    return Array.from(this.registry.values()).map((entry) => entry.config);
  }

  /**
   * Get config for a specific provider
   * @param slug Provider slug
   * @returns Provider config or undefined
   */
  getConfig(slug: string): ProviderConfig | undefined {
    return this.registry.get(slug)?.config;
  }

  /**
   * Check if a provider is registered
   * @param slug Provider slug
   * @returns True if registered
   */
  hasProvider(slug: string): boolean {
    return this.registry.has(slug);
  }

  /**
   * Clear cached service instances
   * Useful for testing or when configuration changes
   */
  clearCache(): void {
    for (const entry of this.registry.values()) {
      entry.instances.clear();
    }
    console.log('[ProviderFactory] Cache cleared');
  }

  /**
   * Clear cached instance for a specific provider
   * @param providerId Provider database ID
   */
  clearProviderCache(providerId: string): void {
    for (const entry of this.registry.values()) {
      entry.instances.delete(providerId);
    }
  }

  /**
   * Unregister a provider
   * @param slug Provider slug
   */
  unregister(slug: string): void {
    this.registry.delete(slug);
    console.log(`[ProviderFactory] Unregistered provider: ${slug}`);
  }

  /**
   * Get list of registered provider slugs
   * @returns Array of slugs
   */
  getRegisteredSlugs(): string[] {
    return Array.from(this.registry.keys());
  }
}

// Export singleton instance
export const providerFactory = new ProviderFactory();


// Export types
export type { IProviderService, ProviderConfig };
