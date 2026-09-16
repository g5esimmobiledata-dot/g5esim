import { db } from "../../db";
import { esimGoPackages, esimGoTopups } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

interface TopupSyncResult {
  success: boolean;
  topupsSynced: number;
  topupsUpdated: number;
  topupsSkipped: number;
  errorMessage?: string;
}

function generateDataHash(data: object): string {
  return createHash("md5").update(JSON.stringify(data)).digest("hex");
}

/**
 * Sync eSIM Go topup packages.
 * 
 * eSIM Go doesn't have a separate topup API - packages with canTopup=true ARE the topup packages.
 * This function copies those packages from esim_go_packages to esim_go_topups table.
 * No additional API calls are needed since the data is already synced in base package sync.
 */
export async function syncEsimGoTopups(
  provider: { id: string; slug: string },
  apiKey: string
): Promise<TopupSyncResult> {
  try {
    console.log("[eSIM Go Topup Sync] Starting topup sync from existing packages...");

    // Get all packages that can be used as topups
    const packagesWithTopup = await db
      .select()
      .from(esimGoPackages)
      .where(eq(esimGoPackages.canTopup, true));

    console.log(`[eSIM Go Topup Sync] Found ${packagesWithTopup.length} packages with canTopup=true`);

    // Get existing topups to check for updates
    const existingTopups = await db.select().from(esimGoTopups);
    const existingByEsimGoId = new Map(existingTopups.map((t) => [t.esimGoId, t]));

    let synced = 0;
    let updated = 0;
    let skipped = 0;

    for (const pkg of packagesWithTopup) {
      // Determine if this is an unlimited package (eSIM Go uses "-1" to mean unlimited)
      const isUnlimited = pkg.isUnlimited || pkg.dataAmount === "-1" || pkg.dataAmount === "-1MB";
      
      // Create topup data from existing package data
      // Set parentPackageId to internal UUID to satisfy foreign key constraint
      const topupData = {
        providerId: provider.id,
        esimGoId: pkg.esimGoId,
        parentPackageId: pkg.id, // Use internal UUID for foreign key reference
        parentBundleId: pkg.slug, // Store slug as bundle reference
        destinationId: pkg.destinationId,
        regionId: pkg.regionId,
        slug: pkg.slug,
        title: pkg.title,
        dataAmount: pkg.dataAmount, // Keep raw value, normalize in UI
        validity: pkg.validity,
        wholesalePrice: pkg.wholesalePrice,
        currency: pkg.currency,
        type: pkg.type || "local",
        operator: pkg.operator,
        operatorImage: pkg.operatorImage,
        isUnlimited: isUnlimited,
        active: true, // All synced packages are active
      };

      const dataHash = generateDataHash({
        title: topupData.title,
        dataAmount: topupData.dataAmount,
        validity: topupData.validity,
        wholesalePrice: topupData.wholesalePrice,
        currency: topupData.currency,
        parentPackageId: topupData.parentPackageId,
        isUnlimited: topupData.isUnlimited,
      });

      const existing = existingByEsimGoId.get(pkg.esimGoId);

      if (existing) {
        if (existing.dataHash !== dataHash) {
          await db
            .update(esimGoTopups)
            .set({ ...topupData, dataHash, updatedAt: new Date() })
            .where(eq(esimGoTopups.id, existing.id));
          updated++;
        } else {
          skipped++;
        }
      } else {
        await db.insert(esimGoTopups).values({ ...topupData, dataHash });
        synced++;
      }
    }

    console.log(`[eSIM Go Topup Sync] Complete: ${synced} new, ${updated} updated, ${skipped} unchanged`);

    return {
      success: true,
      topupsSynced: synced,
      topupsUpdated: updated,
      topupsSkipped: skipped,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[eSIM Go Topup Sync] Error:", errorMessage);
    return {
      success: false,
      topupsSynced: 0,
      topupsUpdated: 0,
      topupsSkipped: 0,
      errorMessage,
    };
  }
}
