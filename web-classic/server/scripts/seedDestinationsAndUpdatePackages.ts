/**
 * Seed Destinations and Update Packages Script
 * 
 * This script:
 * 1. Seeds the destinations table from country code mappings
 * 2. Updates unified_packages with country_code, country_name, and package_group_key
 * 3. Links packages to destinations by country code
 * 4. Seeds default platform settings for marketplace mode
 */

import { db } from "../db";
import { 
  destinations, 
  unifiedPackages, 
  platformSettings,
  airaloPackages,
  esimGoPackages,
  esimAccessPackages
} from "@shared/schema";
import { eq, sql, isNull, and } from "drizzle-orm";
import { 
  getAllDestinations,
  extractCountryCodeFromAiraloSlug,
  extractCountryCodeFromEsimGoPackage,
  extractCountryCodeFromEsimAccessPackage,
  parseDataAmountToMb,
  generatePackageGroupKey
} from "../utils/countryCodeMapping";

async function seedDestinations(): Promise<Map<string, string>> {
  console.log("🌍 Seeding destinations...");
  
  // Get all unique destinations from our country code mapping
  const allDestinations = getAllDestinations();
  console.log(`  Found ${allDestinations.length} countries to seed`);
  
  // Map to store country_code -> destination_id
  const countryToDestinationMap = new Map<string, string>();
  
  // Check existing destinations
  const existingDestinations = await db.select().from(destinations);
  const existingCodes = new Set(existingDestinations.map(d => d.countryCode));
  
  console.log(`  Existing destinations: ${existingDestinations.length}`);
  
  // Add existing to map
  existingDestinations.forEach(d => {
    countryToDestinationMap.set(d.countryCode, d.id);
  });
  
  // Filter new destinations to insert
  const newDestinations = allDestinations.filter(d => !existingCodes.has(d.countryCode));
  
  if (newDestinations.length > 0) {
    console.log(`  Inserting ${newDestinations.length} new destinations...`);
    
    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < newDestinations.length; i += batchSize) {
      const batch = newDestinations.slice(i, i + batchSize);
      const inserted = await db.insert(destinations)
        .values(batch.map(d => ({
          name: d.name,
          slug: d.slug,
          countryCode: d.countryCode,
          active: true,
        })))
        .returning();
      
      // Add to map
      inserted.forEach(d => {
        countryToDestinationMap.set(d.countryCode, d.id);
      });
    }
    
    console.log(`  ✅ Inserted ${newDestinations.length} new destinations`);
  } else {
    console.log("  ✅ All destinations already exist");
  }
  
  return countryToDestinationMap;
}

async function updateUnifiedPackagesWithCountryCodes(countryToDestinationMap: Map<string, string>) {
  console.log("\n📦 Updating unified packages with country codes...");
  
  // Get all unified packages that need updating (country_code is null)
  const packagesToUpdate = await db.select()
    .from(unifiedPackages)
    .where(isNull(unifiedPackages.countryCode));
  
  console.log(`  Found ${packagesToUpdate.length} packages to update`);
  
  if (packagesToUpdate.length === 0) {
    console.log("  ✅ All packages already have country codes");
    return;
  }
  
  // Load all provider packages for reference
  const [allAiralo, allEsimGo, allEsimAccess] = await Promise.all([
    db.select().from(airaloPackages),
    db.select().from(esimGoPackages),
    db.select().from(esimAccessPackages),
  ]);
  
  // Create lookup maps
  const airaloMap = new Map(allAiralo.map(p => [p.id, p]));
  const esimGoMap = new Map(allEsimGo.map(p => [p.id, p]));
  const esimAccessMap = new Map(allEsimAccess.map(p => [p.id, p]));
  
  let updated = 0;
  let skipped = 0;
  
  // Process each package
  for (const pkg of packagesToUpdate) {
    let countryCode: string | null = null;
    let countryName: string | null = null;
    
    // Only process local packages (single country)
    if (pkg.type !== "local") {
      skipped++;
      continue;
    }
    
    // Get country info based on provider
    if (pkg.providerPackageTable === "airalo_packages") {
      const airaloPackage = airaloMap.get(pkg.providerPackageId);
      if (airaloPackage) {
        const result = extractCountryCodeFromAiraloSlug(airaloPackage.slug);
        countryCode = result.code;
        countryName = result.name;
      }
    } else if (pkg.providerPackageTable === "esim_go_packages") {
      const esimGoPackage = esimGoMap.get(pkg.providerPackageId);
      if (esimGoPackage) {
        const result = extractCountryCodeFromEsimGoPackage(
          esimGoPackage.slug, 
          esimGoPackage.coverage as string[] | undefined
        );
        countryCode = result.code;
        countryName = result.name;
      }
    } else if (pkg.providerPackageTable === "esim_access_packages") {
      const esimAccessPackage = esimAccessMap.get(pkg.providerPackageId);
      if (esimAccessPackage) {
        const result = extractCountryCodeFromEsimAccessPackage(
          esimAccessPackage.slug,
          esimAccessPackage.coverage as string[] | undefined
        );
        countryCode = result.code;
        countryName = result.name;
      }
    }
    
    if (!countryCode) {
      skipped++;
      continue;
    }
    
    // Calculate data in MB if not already set
    const dataMb = pkg.dataMb || parseDataAmountToMb(pkg.dataAmount);
    
    // Generate package group key
    const packageGroupKey = generatePackageGroupKey(countryCode, dataMb, pkg.validityDays);
    
    // Get destination ID
    const destinationId = countryToDestinationMap.get(countryCode);
    
    // Update the package
    await db.update(unifiedPackages)
      .set({
        countryCode,
        countryName,
        dataMb,
        packageGroupKey,
        destinationId: destinationId || null,
        updatedAt: new Date(),
      })
      .where(eq(unifiedPackages.id, pkg.id));
    
    updated++;
    
    // Log progress every 100 packages
    if (updated % 100 === 0) {
      console.log(`  Updated ${updated} packages...`);
    }
  }
  
  console.log(`  ✅ Updated ${updated} packages`);
  console.log(`  ⏭️  Skipped ${skipped} packages (regional/global or unknown country)`);
}

async function seedPlatformSettings() {
  console.log("\n⚙️  Seeding platform settings...");
  
  const defaultSettings = [
    {
      key: "marketplace_mode",
      value: "false",
      description: "When enabled, customers can see pricing from all providers for the same package. When disabled, only the best-priced (auto-selected) package is shown.",
      category: "marketplace",
    },
    {
      key: "package_selection_mode",
      value: "auto",
    description: "Package selection mode: 'auto' = system auto-selects best price, 'manual' = admin manually enables/disables Packages.",
      category: "packages",
    },
    {
      key: "default_profit_margin",
      value: "30",
      description: "Default profit margin percentage applied to wholesale prices.",
      category: "pricing",
    },
  ];
  
  for (const setting of defaultSettings) {
    // Check if setting exists
    const existing = await db.select()
      .from(platformSettings)
      .where(eq(platformSettings.key, setting.key))
      .limit(1);
    
    if (existing.length === 0) {
      await db.insert(platformSettings).values(setting);
      console.log(`  ✅ Created setting: ${setting.key} = ${setting.value}`);
    } else {
      console.log(`  ⏭️  Setting exists: ${setting.key}`);
    }
  }
}

async function updateDestinationPackageCounts(countryToDestinationMap: Map<string, string>) {
  console.log("\n📊 Updating destination package counts...");
  
  // Get package counts per destination
  const packageCounts = await db
    .select({
      destinationId: unifiedPackages.destinationId,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(unifiedPackages)
    .where(and(
      sql`${unifiedPackages.destinationId} IS NOT NULL`,
      eq(unifiedPackages.isEnabled, true)
    ))
    .groupBy(unifiedPackages.destinationId);
  
  console.log(`  Found ${packageCounts.length} destinations with enabled packages`);
  
  // Note: The destinations table doesn't have a package_count column,
  // so this count is calculated dynamically in queries
}

async function main() {
  console.log("🚀 Starting destinations seeding and package update...\n");
  
  try {
    // 1. Seed destinations
    const countryToDestinationMap = await seedDestinations();
    
    // 2. Update unified packages with country codes
    await updateUnifiedPackagesWithCountryCodes(countryToDestinationMap);
    
    // 3. Seed platform settings
    await seedPlatformSettings();
    
    // 4. Log summary
    await updateDestinationPackageCounts(countryToDestinationMap);
    
    // Get final stats
    const totalDestinations = await db.select({ count: sql<number>`COUNT(*)::int` }).from(destinations);
    const packagesWithCountry = await db.select({ count: sql<number>`COUNT(*)::int` })
      .from(unifiedPackages)
      .where(sql`${unifiedPackages.countryCode} IS NOT NULL`);
    const totalPackages = await db.select({ count: sql<number>`COUNT(*)::int` }).from(unifiedPackages);
    
    console.log("\n📈 Final Statistics:");
    console.log(`  Total destinations: ${totalDestinations[0]?.count || 0}`);
    console.log(`  Packages with country codes: ${packagesWithCountry[0]?.count || 0}/${totalPackages[0]?.count || 0}`);
    
    console.log("\n✅ Seeding completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    throw error;
  }
}

// Run the script
main().catch(console.error);
