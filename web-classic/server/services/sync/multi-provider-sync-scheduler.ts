import { storage } from "../../storage";
import { isSupportedProviderSlug, providerFactory } from "../../providers/provider-factory";
import { priceComparisonService } from "../packages/price-comparison";
import { autoPackageSelectionService } from "../packages/auto-package-selection";
import { unifiedPackagesSyncService } from "./unified-packages-sync";
import { syncAiraloTopups } from "../airalo/topup-sync";
import { syncEsimAccessTopups } from "../esim-access/topup-sync";
import { syncEsimGoTopups } from "../esim-go/topup-sync";
import { syncMayaTopups } from "../maya/topup-sync";

interface ProviderSyncJob {
  providerId: string;
  providerName: string;
  syncIntervalMinutes: number;
  lastSyncAt: Date | null;
  nextSyncDue: Date;
  isRunning: boolean;
}

/**
 * Multi-provider sync scheduler
 * Manages periodic syncing for all enabled providers based on their individual sync intervals
 */
export class MultiProviderSyncScheduler {
  private schedulerInterval: NodeJS.Timeout | null = null;
  private syncJobs: Map<string, ProviderSyncJob> = new Map();
  private unsupportedProviderWarnings: Set<string> = new Set();
  private readonly CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

  /**
   * Start the multi-provider sync scheduler
   */
  async start() {
    console.log("🕐 Starting multi-provider sync scheduler...");
    
    // Load all enabled providers and initialize sync jobs
    await this.initializeSyncJobs();
    
    // Run initial syncs for providers that are due
    await this.checkAndRunDueSyncs();
    
    // Schedule periodic checks
    this.schedulerInterval = setInterval(async () => {
      await this.checkAndRunDueSyncs();
    }, this.CHECK_INTERVAL_MS);
    
    console.log(`✅ Multi-provider sync scheduler started - checking for due syncs every ${this.CHECK_INTERVAL_MS / 1000} seconds`);
  }

  /**
   * Stop the sync scheduler
   */
  stop() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      console.log("🛑 Multi-provider sync scheduler stopped");
    }
  }

  /**
   * Initialize sync jobs for all enabled providers
   */
  private async initializeSyncJobs() {
    try {
      const enabledProviders = this.filterSyncableProviders(await storage.getEnabledProviders());
      
      console.log(`📋 Initializing sync jobs for ${enabledProviders.length} enabled provider(s):`);
      
      for (const provider of enabledProviders) {
        const syncInterval = provider.syncIntervalMinutes || 60; // Default to 60 minutes
        const now = new Date();
        
        // Calculate next sync time based on last sync
        let nextSyncDue: Date;
        if (provider.lastSyncAt) {
          const lastSync = new Date(provider.lastSyncAt);
          nextSyncDue = new Date(lastSync.getTime() + syncInterval * 60 * 1000);
          
          // If next sync is in the past, sync immediately
          if (nextSyncDue < now) {
            nextSyncDue = now;
          }
        } else {
          // Never synced - sync immediately
          nextSyncDue = now;
        }
        
        const job: ProviderSyncJob = {
          providerId: provider.id,
          providerName: provider.name,
          syncIntervalMinutes: syncInterval,
          lastSyncAt: provider.lastSyncAt,
          nextSyncDue,
          isRunning: false,
        };
        
        this.syncJobs.set(provider.id, job);
        
        const minutesUntilSync = Math.max(0, Math.ceil((nextSyncDue.getTime() - now.getTime()) / 1000 / 60));
        console.log(`   • ${provider.name}: sync interval ${syncInterval}min, next sync in ${minutesUntilSync}min`);
      }
    } catch (error: any) {
      console.error("❌ Failed to initialize sync jobs:", error.message);
    }
  }

  /**
   * Check for providers due for sync and trigger syncs
   */
  private async checkAndRunDueSyncs() {
    const now = new Date();
    
    // Reload enabled providers in case configuration changed
    const enabledProviders = this.filterSyncableProviders(await storage.getEnabledProviders());
    const enabledProviderIds = new Set(enabledProviders.map(p => p.id));
    
    // Remove jobs for disabled providers
    for (const [providerId, job] of Array.from(this.syncJobs.entries())) {
      if (!enabledProviderIds.has(providerId)) {
        console.log(`🔕 Removing sync job for disabled provider: ${job.providerName}`);
        this.syncJobs.delete(providerId);
      }
    }
    
    // Add jobs for newly enabled providers
    for (const provider of enabledProviders) {
      if (!this.syncJobs.has(provider.id)) {
        console.log(`🔔 Adding sync job for newly enabled provider: ${provider.name}`);
        const syncInterval = provider.syncIntervalMinutes || 60;
        const job: ProviderSyncJob = {
          providerId: provider.id,
          providerName: provider.name,
          syncIntervalMinutes: syncInterval,
          lastSyncAt: provider.lastSyncAt,
          nextSyncDue: now, // Sync immediately for new providers
          isRunning: false,
        };
        this.syncJobs.set(provider.id, job);
      }
    }
    
    // Check for due syncs
    for (const [providerId, job] of Array.from(this.syncJobs.entries())) {
      if (job.isRunning) {
        continue; // Skip if already running
      }
      
      if (now >= job.nextSyncDue) {
        // Sync is due
        this.runProviderSync(providerId, job);
      }
    }
  }

  /**
   * Run sync for a specific provider
   */
  private async runProviderSync(providerId: string, job: ProviderSyncJob) {
    job.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log(`\n🔄 Starting scheduled sync for ${job.providerName} at ${new Date().toISOString()}`);
      
      // Get provider service
      const service = await providerFactory.getServiceById(providerId);
      
      // Run sync
      const result = await service.syncPackages();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (result.success) {
        console.log(`\n✅ ${job.providerName} sync completed in ${duration}s`);
        console.log(`   📦 Packages: ${result.packagesSynced} synced, ${result.packagesUpdated} updated, ${result.packagesRemoved} removed`);
      } else {
        console.log(`\n⚠️  ${job.providerName} sync completed with errors in ${duration}s`);
        console.log(`   Error: ${result.errorMessage || 'Unknown error'}`);
      }
      
      // Update last sync time in database
      const now = new Date();
      await storage.updateProvider(providerId, {
        lastSyncAt: now,
      });
      
      // Clear provider factory cache to refresh provider metadata
      providerFactory.clearCache();
      
      // Update job for next sync
      job.lastSyncAt = now;
      job.nextSyncDue = new Date(now.getTime() + job.syncIntervalMinutes * 60 * 1000);
      
      const minutesUntilNextSync = Math.ceil((job.nextSyncDue.getTime() - now.getTime()) / 1000 / 60);
      console.log(`   ⏰ Next ${job.providerName} sync in ${minutesUntilNextSync} minutes`);
      
      // Get provider info to get slug
      const provider = await storage.getProviderById(providerId);
      if (provider) {
        // Sync topup packages for providers that support them
        if (provider.slug === "airalo") {
          console.log(`📦 Syncing ${job.providerName} topup packages...`);
          const topupResult = await syncAiraloTopups(provider);
          if (topupResult.success) {
            console.log(`   ✅ Topups: ${topupResult.topupsSynced} new, ${topupResult.topupsUpdated} updated, ${topupResult.topupsSkipped} unchanged`);
          } else {
            console.log(`   ⚠️ Topup sync failed: ${topupResult.errorMessage}`);
          }
        } else if (provider.slug === "esim-access") {
          console.log(`📦 Syncing ${job.providerName} topup packages...`);
          const accessCode = process.env.ESIM_ACCESS_CLIENT_ID;
          const secretKey = process.env.ESIM_ACCESS_CLIENT_SECRET;
          if (accessCode && secretKey) {
            const topupResult = await syncEsimAccessTopups(provider, accessCode, secretKey);
            if (topupResult.success) {
              console.log(`   ✅ Topups: ${topupResult.topupsSynced} new, ${topupResult.topupsUpdated} updated, ${topupResult.topupsSkipped} unchanged`);
            } else {
              console.error(`   ❌ Topup sync failed: ${topupResult.errorMessage}`);
            }
          } else {
            console.error(`   ❌ eSIM Access topup sync skipped - missing credentials (ESIM_ACCESS_CLIENT_ID or ESIM_ACCESS_CLIENT_SECRET)`);
          }
        } else if (provider.slug === "esim-go") {
          console.log(`📦 Syncing ${job.providerName} topup packages...`);
          const apiKey = process.env.ESIM_GO_API_KEY;
          if (apiKey) {
            const topupResult = await syncEsimGoTopups(provider, apiKey);
            if (topupResult.success) {
              console.log(`   ✅ Topups: ${topupResult.topupsSynced} new, ${topupResult.topupsUpdated} updated, ${topupResult.topupsSkipped} unchanged`);
            } else {
              console.error(`   ❌ Topup sync failed: ${topupResult.errorMessage}`);
            }
          } else {
            console.error(`   ❌ eSIM Go topup sync skipped - missing API key (ESIM_GO_API_KEY)`);
          }
        } else if (provider.slug === "maya") {
          console.log(`📦 Syncing ${job.providerName} topup packages...`);
          const apiKey = process.env.MAYA_API_KEY;
          const apiSecret = process.env.MAYA_API_SECRET;
          if (apiKey && apiSecret) {
            const topupResult = await syncMayaTopups(provider, apiKey, apiSecret);
            if (topupResult.success) {
              console.log(`   ✅ Topups: ${topupResult.topupsSynced} new, ${topupResult.topupsUpdated} updated, ${topupResult.topupsRemoved} removed`);
            } else {
              console.error(`   ❌ Topup sync failed: ${topupResult.errorMessage}`);
            }
          } else {
            console.error(`   ❌ Maya topup sync skipped - missing credentials (MAYA_API_KEY or MAYA_API_SECRET)`);
          }
        }

        // Sync to unified packages catalog
        console.log(`📋 Syncing ${job.providerName} packages to unified catalog...`);
        await unifiedPackagesSyncService.syncProviderPackages(provider.slug);
      }
      
      // Run price comparison after sync
      console.log(`💰 Running price comparison after ${job.providerName} sync...`);
      const priceCompResult = await priceComparisonService.runPriceComparison();
      console.log(`   ✅ Price comparison complete: ${priceCompResult.bestPricePackages}/${priceCompResult.totalPackages} best price packages identified`);
      
      // Run auto package selection after price comparison
      console.log(`🤖 Running auto package selection after ${job.providerName} sync...`);
      const autoSelectResult = await autoPackageSelectionService.runAutoSelection();
      if (autoSelectResult.mode === "auto") {
        console.log(`   ✅ Auto selection complete: ${autoSelectResult.packagesEnabled} enabled, ${autoSelectResult.packagesDisabled} disabled`);
      }
      
    } catch (error: any) {
      console.error(`❌ ${job.providerName} sync failed:`, error.message);
      
      // Schedule retry in 5 minutes on error
      const now = new Date();
      job.nextSyncDue = new Date(now.getTime() + 5 * 60 * 1000);
      console.log(`   🔄 Will retry ${job.providerName} sync in 5 minutes`);
    } finally {
      job.isRunning = false;
    }
  }

  private filterSyncableProviders<T extends { id: string; name: string; slug: string }>(providers: T[]): T[] {
    return providers.filter((provider) => {
      if (isSupportedProviderSlug(provider.slug)) {
        return true;
      }

      const warningKey = `${provider.id}:${provider.slug}`;
      if (!this.unsupportedProviderWarnings.has(warningKey)) {
        console.log(`Skipping ${provider.name} (${provider.slug}) sync because this provider is handled outside the eSIM app.`);
        this.unsupportedProviderWarnings.add(warningKey);
      }

      this.syncJobs.delete(provider.id);
      return false;
    });
  }

  /**
   * Trigger immediate sync for a specific provider
   */
  async triggerProviderSync(providerId: string): Promise<void> {
    const job = this.syncJobs.get(providerId);
    
    if (!job) {
      throw new Error(`Provider ${providerId} is not enabled or not found in sync jobs`);
    }
    
    if (job.isRunning) {
      throw new Error(`Sync for ${job.providerName} is already in progress`);
    }
    
    console.log(`🔧 Manual sync triggered for ${job.providerName}`);
    await this.runProviderSync(providerId, job);
  }

  /**
   * Trigger immediate sync for all enabled providers
   */
  async triggerAllProvidersSync(): Promise<void> {
    console.log("🔧 Manual sync triggered for all providers");
    
    for (const [providerId, job] of Array.from(this.syncJobs.entries())) {
      if (!job.isRunning) {
        await this.runProviderSync(providerId, job);
      }
    }
  }

  /**
   * Get current sync job status for all providers
   */
  getSyncJobsStatus(): ProviderSyncJob[] {
    return Array.from(this.syncJobs.values());
  }
}

// Export singleton instance
export const multiProviderSyncScheduler = new MultiProviderSyncScheduler();
