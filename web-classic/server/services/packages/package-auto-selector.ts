/**
 * Package Auto-Selector Service
 * 
 * Automatically selects the best package for each unique specification
 * (country + data amount + validity) across all providers.
 * 
 * ENHANCED WITH AI SCORING:
 * - When AI is enabled, uses composite scoring (price + quality + provider)
 * - Falls back to price-only selection if AI is disabled or fails
 * - Logs AI decisions with reasoning for transparency
 * 
 * The system calculates retail prices dynamically:
 * retailPrice = wholesalePrice × (1 + providerMargin/100)
 */

import { db } from "../../db";
import { unifiedPackages, settings, providers, platformSettings, destinations } from "@shared/schema";
import { eq, sql, and, isNull, isNotNull } from "drizzle-orm";
import { openAIService } from "../ai/openai-service";
import { compositeScorer, type PackageWithScore } from "./composite-scorer";
import { type PackageData } from "../ai/package-analyzer";

interface AutoSelectionResult {
  success: boolean;
  totalGroups: number;
  packagesEnabled: number;
  packagesDisabled: number;
  errors: string[];
  aiEnabled: boolean;
  aiDecisions: AIDecision[];
}

interface AIDecision {
  groupKey: string;
  selectedPackageId: string;
  selectedProviderName: string;
  score: number;
  reasoning?: string;
  alternatives: Array<{
    packageId: string;
    providerName: string;
    score: number;
    price: string;
  }>;
}

export class PackageAutoSelectorService {
  /**
   * Get the current settings for package selection mode
   * Reads from the 'settings' table which is shared with the admin frontend
   */
  async getPackageSelectionMode(): Promise<"auto" | "manual"> {
    const setting = await db.query.settings.findFirst({
      where: eq(settings.key, "package_selection_mode"),
    });
    return (setting?.value as "auto" | "manual") || "auto";
  }

  /**
   * Check if AI-enhanced selection is enabled
   */
  async isAIEnabled(): Promise<boolean> {
    try {
      const setting = await db.query.platformSettings.findFirst({
        where: eq(platformSettings.key, "ai_selection_enabled"),
      });
      
      if (!setting || setting.value !== "true") {
        return false;
      }

      return openAIService.isReady();
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert database package to PackageData for AI analysis
   */
  private async convertToPackageData(pkg: any, providerNames: Map<string, string>): Promise<PackageData> {
    let destinationName = pkg.destinationId;
    try {
      const dest = await db.query.destinations.findFirst({
        where: eq(destinations.id, pkg.destinationId),
      });
      if (dest) {
        destinationName = dest.name;
      }
    } catch (e) {}

    return {
      id: pkg.id,
      name: pkg.name,
      providerName: providerNames.get(pkg.providerId) || pkg.providerId,
      providerId: pkg.providerId,
      destinationName,
      destinationCode: pkg.destinationId,
      dataMb: pkg.dataMb,
      validityDays: pkg.validityDays,
      retailPrice: pkg.retailPrice || pkg.calculatedRetailPrice?.toString() || "0",
      wholesalePrice: pkg.wholesalePrice,
      voiceMinutes: pkg.voiceMinutes,
      smsCount: pkg.smsCount,
      description: pkg.description,
    };
  }

  /**
   * Run auto-selection algorithm - ENHANCED WITH AI
   * Uses composite scoring when AI is enabled, falls back to price-only otherwise
   */
  async runAutoSelection(): Promise<AutoSelectionResult> {
    console.log("🔄 Running package auto-selection...");
    const startTime = Date.now();
    const errors: string[] = [];
    const aiDecisions: AIDecision[] = [];
    
    try {
      const selectionMode = await this.getPackageSelectionMode();
      if (selectionMode === "manual") {
        console.log("⏭️  Package selection mode is 'manual', skipping auto-selection");
        return {
          success: true,
          totalGroups: 0,
          packagesEnabled: 0,
          packagesDisabled: 0,
          errors: ["Auto-selection skipped: mode is 'manual'"],
          aiEnabled: false,
          aiDecisions: [],
        };
      }

      const aiEnabled = await this.isAIEnabled();
      if (aiEnabled) {
        console.log("🤖 AI-enhanced selection is ENABLED");
      } else {
        console.log("💰 Using price-only selection (AI disabled or not configured)");
      }

      const enabledProviders = await db
        .select()
        .from(providers)
        .where(eq(providers.enabled, true));
      const providerMargins = new Map(
        enabledProviders.map(p => [p.id, parseFloat(p.pricingMargin || "0")])
      );
      const providerNames = new Map(
        enabledProviders.map(p => [p.id, p.name])
      );

      const allPackages = await db.query.unifiedPackages.findMany({
        where: isNotNull(unifiedPackages.packageGroupKey),
      });

      const packageGroups = this.groupPackagesByKey(
        allPackages.filter(pkg => providerMargins.has(pkg.providerId)),
        providerMargins
      );

      console.log(`  Found ${packageGroups.size} unique package groups`);

      let packagesEnabled = 0;
      let packagesDisabled = 0;

      for (const [groupKey, groupData] of Array.from(packageGroups.entries())) {
        const groupPackages = groupData.packages;
        if (groupPackages.length === 0) continue;

        let bestPackage: any;
        let aiDecision: AIDecision | undefined;

        if (aiEnabled && groupPackages.length > 1) {
          try {
            const packageDataList = await Promise.all(
              groupPackages.map(pkg => this.convertToPackageData(pkg, providerNames))
            );
            
            const scoredPackages = await compositeScorer.scorePackages(packageDataList, true);
            
            if (scoredPackages.length > 0) {
              const best = scoredPackages[0];
              bestPackage = groupPackages.find(p => p.id === best.id);
              
              aiDecision = {
                groupKey,
                selectedPackageId: best.id,
                selectedProviderName: best.providerName,
                score: best.compositeScore.finalScore,
                reasoning: best.compositeScore.reasoning,
                alternatives: scoredPackages.slice(1, 4).map(p => ({
                  packageId: p.id,
                  providerName: p.providerName,
                  score: p.compositeScore.finalScore,
                  price: p.retailPrice,
                })),
              };
              
              aiDecisions.push(aiDecision);
            }
          } catch (error: any) {
            console.warn(`  ⚠️ AI scoring failed for group ${groupKey}, falling back to price:`, error.message);
            errors.push(`AI failed for ${groupKey}: ${error.message}`);
          }
        }

        if (!bestPackage) {
          bestPackage = groupPackages[0];
        }

        for (const pkg of groupPackages) {
          if (pkg.manualOverride) continue;

          const isBest = pkg.id === bestPackage.id;
          const shouldBeEnabled = isBest;

          if (pkg.isEnabled !== shouldBeEnabled || pkg.isBestPrice !== isBest) {
            await db
              .update(unifiedPackages)
              .set({
                isEnabled: shouldBeEnabled,
                isBestPrice: isBest,
                updatedAt: new Date(),
              })
              .where(eq(unifiedPackages.id, pkg.id));

            if (shouldBeEnabled) {
              packagesEnabled++;
            } else if (!shouldBeEnabled && pkg.isEnabled) {
              packagesDisabled++;
            }
          }
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Auto-selection complete in ${duration}s`);
      console.log(`  📦 ${packagesEnabled} enabled, ${packagesDisabled} disabled`);
      if (aiEnabled) {
        console.log(`  🤖 AI made ${aiDecisions.length} scoring decisions`);
      }

      return {
        success: true,
        totalGroups: packageGroups.size,
        packagesEnabled,
        packagesDisabled,
        errors,
        aiEnabled,
        aiDecisions,
      };
    } catch (error: any) {
      console.error("❌ Auto-selection failed:", error.message);
      errors.push(error.message);
      return {
        success: false,
        totalGroups: 0,
        packagesEnabled: 0,
        packagesDisabled: 0,
        errors,
        aiEnabled: false,
        aiDecisions: [],
      };
    }
  }

  /**
   * Enable all packages (used when switching to marketplace mode or manual mode)
   */
  async enableAllPackages(): Promise<{ success: boolean; packagesEnabled: number }> {
    console.log("🔓 Enabling all packages...");
    
    try {
      const result = await db
        .update(unifiedPackages)
        .set({
          isEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(unifiedPackages.isEnabled, false));

      // Get count of packages now enabled
      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(unifiedPackages)
        .where(eq(unifiedPackages.isEnabled, true));

      console.log(`✅ Enabled all packages. Total enabled: ${count}`);
      
      return {
        success: true,
        packagesEnabled: count,
      };
    } catch (error: any) {
      console.error("❌ Failed to enable all packages:", error.message);
      return {
        success: false,
        packagesEnabled: 0,
      };
    }
  }

  /**
   * Disable all packages (reset state before running auto-selection)
   */
  async disableAllPackages(): Promise<{ success: boolean; packagesDisabled: number }> {
    console.log("🔒 Disabling all packages...");
    
    try {
      // Only disable packages without manual override
      const result = await db
        .update(unifiedPackages)
        .set({
          isEnabled: false,
          isBestPrice: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(unifiedPackages.isEnabled, true),
            eq(unifiedPackages.manualOverride, false)
          )
        );

      console.log("✅ Disabled all non-manual packages");
      
      return {
        success: true,
        packagesDisabled: 0, // Can't easily get count from update
      };
    } catch (error: any) {
      console.error("❌ Failed to disable packages:", error.message);
      return {
        success: false,
        packagesDisabled: 0,
      };
    }
  }

  /**
   * Toggle a single package's enabled status (manual override)
   */
  async togglePackage(packageId: string, enabled: boolean): Promise<boolean> {
    try {
      await db
        .update(unifiedPackages)
        .set({
          isEnabled: enabled,
          manualOverride: true, // Mark as manually overridden
          updatedAt: new Date(),
        })
        .where(eq(unifiedPackages.id, packageId));

      return true;
    } catch (error: any) {
      console.error(`❌ Failed to toggle package ${packageId}:`, error.message);
      return false;
    }
  }

  /**
   * Clear manual override for a package (let auto-selection manage it)
   */
  async clearManualOverride(packageId: string): Promise<boolean> {
    try {
      await db
        .update(unifiedPackages)
        .set({
          manualOverride: false,
          updatedAt: new Date(),
        })
        .where(eq(unifiedPackages.id, packageId));

      return true;
    } catch (error: any) {
      console.error(`❌ Failed to clear override for ${packageId}:`, error.message);
      return false;
    }
  }

  /**
   * Group packages by packageGroupKey and calculate dynamic retail prices
   * Uses provider margins to compute actual retail price for sorting
   */
  private groupPackagesByKey(
    packages: any[],
    providerMargins: Map<string, number>
  ): Map<string, { packages: any[] }> {
    const groupedPackages = new Map<string, { packages: any[] }>();

    // Group packages and calculate retail prices
    for (const pkg of packages) {
      if (!pkg.packageGroupKey) continue;

      const margin = providerMargins.get(pkg.providerId) || 0;
      const wholesalePrice = parseFloat(pkg.wholesalePrice || "0");
      const calculatedRetailPrice = wholesalePrice * (1 + margin / 100);

      const packageWithPrice = {
        ...pkg,
        calculatedRetailPrice,
      };

      if (!groupedPackages.has(pkg.packageGroupKey)) {
        groupedPackages.set(pkg.packageGroupKey, { packages: [] });
      }
      groupedPackages.get(pkg.packageGroupKey)!.packages.push(packageWithPrice);
    }

    // Sort packages within each group by calculated retail price
    for (const [key, group] of Array.from(groupedPackages.entries())) {
      group.packages.sort((a: any, b: any) => 
        a.calculatedRetailPrice - b.calculatedRetailPrice
      );
    }

    return groupedPackages;
  }

  /**
   * Get packages grouped by packageGroupKey with all provider options
   * Used when marketplace mode is enabled
   */
  async getGroupedPackages(destinationId?: string): Promise<Map<string, any[]>> {
    // Get all enabled providers with their margins
    const enabledProviders = await db
      .select()
      .from(providers)
      .where(eq(providers.enabled, true));
    const providerMargins = new Map(
      enabledProviders.map(p => [p.id, parseFloat(p.pricingMargin || "0")])
    );

    // Build query conditions
    const conditions = [isNotNull(unifiedPackages.packageGroupKey)];
    if (destinationId) {
      conditions.push(eq(unifiedPackages.destinationId, destinationId));
    }

    const packages = await db
      .select()
      .from(unifiedPackages)
      .where(and(...conditions));

    // Filter to packages from enabled providers
    const filteredPackages = packages.filter(pkg => providerMargins.has(pkg.providerId));

    // Group packages
    const grouped = this.groupPackagesByKey(filteredPackages, providerMargins);
    
    // Convert to simpler format
    const result = new Map<string, any[]>();
    for (const [key, group] of Array.from(grouped.entries())) {
      result.set(key, group.packages);
    }

    return result;
  }
}

// Export singleton instance
export const packageAutoSelector = new PackageAutoSelectorService();
