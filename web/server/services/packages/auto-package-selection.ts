import { storage } from "../../storage";
import { db } from "../../db";
import { unifiedPackages } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { packageNormalizer, NormalizedPackageData } from "./package-normalizer";

/**
 * Auto Package Selection Service
 * Automatically enables/disables packages based on package_selection_mode setting
 */
export class AutoPackageSelectionService {
  /**
   * Run auto package selection based on current settings
   * If mode is 'auto': enable best_price packages, fallback to preferred provider
   * If mode is 'manual': respect manual overrides, admin controls everything
   */
  async runAutoSelection(): Promise<{
    mode: string;
    packagesEnabled: number;
    packagesDisabled: number;
    errors: string[];
  }> {
    console.log("🤖 Running auto package selection...");
    const startTime = Date.now();
    const errors: string[] = [];
    let packagesEnabled = 0;
    let packagesDisabled = 0;
    
    try {
      // Get package selection mode setting
      const modeSetting = await storage.getSettingByKey("package_selection_mode");
      const mode = modeSetting?.value || "auto";
      
      console.log(`   Mode: ${mode}`);
      
      if (mode === "manual") {
        console.log("   ⏭️  Manual mode - skipping auto selection");
        return { mode, packagesEnabled: 0, packagesDisabled: 0, errors: [] };
      }
      
      // Auto mode: enable best_price packages
      if (mode === "auto") {
        // Get all packages
        const allPackages = await db.query.unifiedPackages.findMany();
        
        for (const pkg of allPackages) {
          // Skip if manual override is set (admin manually controlled this package)
          if (pkg.manualOverride) {
            continue;
          }
          
          // Enable if best price, disable otherwise
          const shouldBeEnabled = pkg.isBestPrice;
          
          if (shouldBeEnabled !== pkg.isEnabled) {
            await db.update(unifiedPackages)
              .set({ isEnabled: shouldBeEnabled })
              .where(eq(unifiedPackages.id, pkg.id));
            
            if (shouldBeEnabled) {
              packagesEnabled++;
            } else {
              packagesDisabled++;
            }
          }
        }
        
        // Handle cases where no best_price package exists (fallback to preferred provider)
        await this.handlePreferredProviderFallback();
      }
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Auto package selection complete in ${duration}s`);
      console.log(`   ✅ Enabled: ${packagesEnabled} packages`);
      console.log(`   ❌ Disabled: ${packagesDisabled} packages`);
      
      return {
        mode,
        packagesEnabled,
        packagesDisabled,
        errors,
      };
      
    } catch (error: any) {
      console.error("❌ Auto package selection failed:", error.message);
      errors.push(error.message);
      return { mode: "unknown", packagesEnabled: 0, packagesDisabled: 0, errors };
    }
  }

  /**
   * Handle preferred provider fallback
   * If no best_price package exists for a destination/region+data+validity combo,
   * enable packages from the preferred provider
   */
  private async handlePreferredProviderFallback(): Promise<void> {
    try {
      // Get preferred provider
      const preferredProviderIdSetting = await storage.getSettingByKey("preferred_provider_id");
      
      if (!preferredProviderIdSetting?.value) {
        console.log("   ⚠️  No preferred provider set for fallback");
        return;
      }
      
      const preferredProviderId = preferredProviderIdSetting.value;
      const preferredProvider = await storage.getProviderById(preferredProviderId);
      
      if (!preferredProvider) {
        console.log("   ⚠️  Preferred provider not found");
        return;
      }
      
      console.log(`   🔄 Checking preferred provider fallback (${preferredProvider.name})...`);
      
      // Get all packages grouped by normalized comparison keys
      const allPackages = await db.query.unifiedPackages.findMany();
      
      // Group packages using normalized comparison keys
      const groups = new Map<string, typeof allPackages>();
      for (const pkg of allPackages) {
        const normalized: NormalizedPackageData = {
          dataMb: pkg.dataMb,
          validityDays: pkg.validityDays,
          voiceMinutes: pkg.voiceMinutes || 0,
          smsCount: pkg.smsCount || 0,
        };
        
        const key = packageNormalizer.createComparisonKey(
          pkg.destinationId,
          pkg.regionId,
          normalized
        );
        
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(pkg);
      }
      
      // Check each group for best_price packages
      let fallbackCount = 0;
      for (const [key, group] of Array.from(groups.entries())) {
        const hasBestPrice = group.some(pkg => pkg.isBestPrice);
        const hasEnabledPackage = group.some(pkg => pkg.isEnabled);
        
        // If no best_price package exists and no enabled package, enable preferred provider's package
        if (!hasBestPrice && !hasEnabledPackage) {
          const preferredProviderPackage = group.find(pkg => pkg.providerId === preferredProviderId);
          
          if (preferredProviderPackage && !preferredProviderPackage.manualOverride) {
            await db.update(unifiedPackages)
              .set({ isEnabled: true })
              .where(eq(unifiedPackages.id, preferredProviderPackage.id));
            
            fallbackCount++;
          }
        }
      }
      
      if (fallbackCount > 0) {
        console.log(`   ✅ Enabled ${fallbackCount} packages from preferred provider (fallback)`);
      }
      
    } catch (error: any) {
      console.error("   ❌ Preferred provider fallback failed:", error.message);
    }
  }

  /**
   * Toggle manual override for a specific package
   * When manual override is set, auto selection will skip this package
   */
  async setManualOverride(packageId: string, isEnabled: boolean): Promise<void> {
    await db.update(unifiedPackages)
      .set({
        manualOverride: true,
        isEnabled,
      })
      .where(eq(unifiedPackages.id, packageId));
    
    console.log(`✅ Manual override set for package ${packageId}: ${isEnabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear manual override for a specific package
   * Package will be managed by auto selection again
   */
  async clearManualOverride(packageId: string): Promise<void> {
    await db.update(unifiedPackages)
      .set({
        manualOverride: false,
      })
      .where(eq(unifiedPackages.id, packageId));
    
    // Re-run auto selection for this package
    const pkg = await db.query.unifiedPackages.findFirst({
      where: eq(unifiedPackages.id, packageId),
    });
    
    if (pkg) {
      const modeSetting = await storage.getSettingByKey("package_selection_mode");
      const mode = modeSetting?.value || "auto";
      
      if (mode === "auto") {
        // In auto mode, enable if best price
        await db.update(unifiedPackages)
          .set({ isEnabled: pkg.isBestPrice })
          .where(eq(unifiedPackages.id, packageId));
      }
    }
    
    console.log(`✅ Manual override cleared for package ${packageId}`);
  }

  /**
   * Get package selection statistics
   */
  async getStatistics(): Promise<{
    mode: string;
    totalPackages: number;
    enabledPackages: number;
    disabledPackages: number;
    manualOverrides: number;
    bestPricePackages: number;
  }> {
    const modeSetting = await storage.getSettingByKey("package_selection_mode");
    const mode = modeSetting?.value || "auto";
    
    const allPackages = await db.query.unifiedPackages.findMany();
    
    return {
      mode,
      totalPackages: allPackages.length,
      enabledPackages: allPackages.filter(p => p.isEnabled).length,
      disabledPackages: allPackages.filter(p => !p.isEnabled).length,
      manualOverrides: allPackages.filter(p => p.manualOverride).length,
      bestPricePackages: allPackages.filter(p => p.isBestPrice).length,
    };
  }
}

// Export singleton instance
export const autoPackageSelectionService = new AutoPackageSelectionService();
