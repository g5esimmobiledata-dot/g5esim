import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { providers, type Provider } from "@shared/schema";
import { AiraloService } from "../services/airalo";
import { EsimAccessService } from "../services/esim-access";
import { EsimGoService } from "../services/esim-go";
import { MayaService } from "../services/maya";
import { AirhubService } from "../services/airhub";
import type { IProviderService } from "./provider-interface";

export const SUPPORTED_PROVIDER_SLUGS = new Set([
  "airalo",
  "esim-access",
  "esim-go",
  "maya",
  "airhub",
]);

export function isSupportedProviderSlug(slug?: string | null): boolean {
  return SUPPORTED_PROVIDER_SLUGS.has(String(slug || "").toLowerCase());
}

/**
 * Provider Factory
 * 
 * Creates and manages provider service instances.
 * Implements singleton pattern to avoid recreating services on every call.
 */
class ProviderFactory {
  private serviceCache: Map<string, IProviderService> = new Map();
  private providerCache: Map<string, Provider> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache TTL
  
  /**
   * Get provider service by provider ID
   */
  async getServiceById(providerId: string): Promise<IProviderService> {
    const provider = await this.getProvider({ id: providerId });
    return this.getServiceInstance(provider);
  }
  
  /**
   * Get provider service by provider slug
   */
  async getServiceBySlug(slug: string): Promise<IProviderService> {
    const provider = await this.getProvider({ slug });
    return this.getServiceInstance(provider);
  }
  
  /**
   * Get all enabled provider services
   */
  async getAllEnabledServices(): Promise<Array<{ provider: Provider; service: IProviderService }>> {
    await this.refreshCacheIfNeeded();
    
    // Deduplicate by provider ID since cache stores both ID and slug keys
    const seenIds = new Set<string>();
    const uniqueEnabledProviders = Array.from(this.providerCache.values())
      .filter(p => {
        if (!p.enabled || seenIds.has(p.id) || !isSupportedProviderSlug(p.slug)) {
          return false;
        }
        seenIds.add(p.id);
        return true;
      });
    
    return uniqueEnabledProviders.map(provider => ({
      provider,
      service: this.getServiceInstance(provider),
    }));
  }
  
  /**
   * Get provider record from database or cache
   */
  private async getProvider(filter: { id?: string; slug?: string }): Promise<Provider> {
    // Check cache first
    const cacheKey = filter.id || filter.slug || '';
    const cached = this.providerCache.get(cacheKey);
    
    if (cached && Date.now() - this.lastCacheUpdate < this.CACHE_TTL) {
      return cached;
    }
    
    // Fetch from database
    const where = filter.id 
      ? eq(providers.id, filter.id)
      : eq(providers.slug, filter.slug!);
    
    const provider = await db.query.providers.findFirst({
      where,
    });
    
    if (!provider) {
      throw new Error(`Provider not found: ${JSON.stringify(filter)}`);
    }
    
    // Update cache
    this.providerCache.set(provider.id, provider);
    this.providerCache.set(provider.slug, provider);
    this.lastCacheUpdate = Date.now(); // Update cache timestamp
    
    return provider;
  }
  
  /**
   * Refresh provider cache if TTL expired
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    if (Date.now() - this.lastCacheUpdate < this.CACHE_TTL) {
      return;
    }
    
    const allProviders = await db.query.providers.findMany();
    
    this.providerCache.clear();
    
    for (const provider of allProviders) {
      this.providerCache.set(provider.id, provider);
      this.providerCache.set(provider.slug, provider);
    }
    
    this.lastCacheUpdate = Date.now();
  }
  
  /**
   * Get or create provider service instance
   */
  private getServiceInstance(provider: Provider): IProviderService {
    // Check service cache
    const cached = this.serviceCache.get(provider.id);
    
    if (cached) {
      return cached;
    }
    
    // Create new service instance based on provider slug
    let service: IProviderService;
    
    const slug = String(provider.slug || "").toLowerCase();

    switch (slug) {
      case 'airalo':
        service = new AiraloService(provider);
        break;
      case 'esim-access':
        service = new EsimAccessService(provider);
        break;
      case 'esim-go':
        service = new EsimGoService(provider);
        break;
      case 'maya':
        service = new MayaService(provider);
        break;
      case 'airhub':
        service = new AirhubService(provider);
        break;
      default:
        throw new Error(`Unsupported eSIM provider slug in this app: ${provider.slug}`);
    }
    
    // Cache the service
    this.serviceCache.set(provider.id, service);
    
    return service;
  }
  
  /**
   * Clear all caches (useful for testing or when providers are updated)
   */
  clearCache(): void {
    this.serviceCache.clear();
    this.providerCache.clear();
    this.lastCacheUpdate = 0;
  }
  
  /**
   * Get preferred provider service
   * Falls back to first enabled provider if no preferred provider is set
   */
  async getPreferredService(): Promise<{ provider: Provider; service: IProviderService }> {
    await this.refreshCacheIfNeeded();
    
    // Find preferred provider
    const preferred = Array.from(this.providerCache.values()).find(
      p => p.enabled && p.isPreferred && isSupportedProviderSlug(p.slug)
    );
    
    if (preferred) {
      return {
        provider: preferred,
        service: this.getServiceInstance(preferred),
      };
    }
    
    // Fall back to first enabled provider
    const firstEnabled = Array.from(this.providerCache.values()).find(
      p => p.enabled && isSupportedProviderSlug(p.slug)
    );
    
    if (!firstEnabled) {
      throw new Error('No enabled providers found');
    }
    
    return {
      provider: firstEnabled,
      service: this.getServiceInstance(firstEnabled),
    };
  }
}

// Export singleton instance
export const providerFactory = new ProviderFactory();
