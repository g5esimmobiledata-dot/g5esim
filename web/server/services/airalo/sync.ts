"use strict";

import { airaloAPI } from "./airalo-sdk";
import { storage } from "../../storage";
import type { InsertAiraloPackage, AiraloPackage, Provider } from "@shared/schema";
import type { AiraloCountryData, AiraloOperator, AiraloPackageData } from "./types";
import { resolveAiraloSlug, AIRALO_REGION_SLUG_ALIASES } from "./slug-mappings";
import { seedAiraloTerritories } from "./seed-territories";

function generatePackageSlug(
  location: string,
  data: string,
  validity: number,
  operator: string
): string {
  const slugParts = [
    location.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    data.toLowerCase().replace(/[^a-z0-9]+/g, ''),
    `${validity}days`,
    operator.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  ];
  return slugParts.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export async function syncAiraloPackages(provider: Provider): Promise<{
  success: boolean;
  packagesSynced: number;
  packagesUpdated: number;
  packagesRemoved: number;
  errorMessage?: string;
}> {
  try {
    console.log("[Airalo Sync] Seeding missing territory destinations...");
    const seedResult = await seedAiraloTerritories();
    if (seedResult.added > 0) {
      console.log(`[Airalo Sync] Added ${seedResult.added} new territory destinations`);
    }

    console.log("[Airalo Sync] Using SDK with auto-pagination to fetch ALL packages...");
    const response = await airaloAPI.getPackages();
    
    if (!response.data || !Array.isArray(response.data)) {
      return {
        success: false,
        packagesSynced: 0,
        packagesUpdated: 0,
        packagesRemoved: 0,
        errorMessage: 'No data received from Airalo SDK',
      };
    }
    
    const countriesData = response.data as AiraloCountryData[];
    console.log(`[Airalo Sync] SDK returned ${countriesData.length} country/region bundles (auto-paginated)`);

  //  console.log(
  //     `Fetched ${countriesData.length} bundles:\n`,
  //     JSON.stringify(countriesData, null, 2)
  //   );

    const pricingMargin = parseFloat(provider.pricingMargin || "50");
    
    const allDestinations = await storage.getAllDestinations();
    const allRegions = await storage.getAllRegions();
    const allExistingPackages = await storage.getAllPackages();
    
    const destinationsBySlug = new Map(allDestinations.map(d => [d.slug, d]));
    const regionsBySlug = new Map(allRegions.map(r => [r.slug, r]));
    // console.log(`Loaded ${allDestinations.length} destinations and ${allRegions.length} regions from storage.`);
    const existingPackagesByAiraloId = new Map(allExistingPackages.map(p => [p.airaloId, p]));
    
    const packagesToCreate: InsertAiraloPackage[] = [];
    const packagesToUpdate: Array<{ id: string; data: Partial<AiraloPackage> }> = [];
    let skipped = 0;
    
    for (const country of countriesData) {
      // console.log(`Processing country: ${country.title}, slug: ${country.slug}`);
    
      // Check country mismatch
      const isCountryExist = destinationsBySlug.has(country.slug);
      const isRegionExist = regionsBySlug.has(country.slug);
    
      // if (!isCountryExist && !isRegionExist) {
      //   console.warn(
      //     `⚠️ No matching destination/region for slug: "${country.slug}" (${country.title})`
      //   );
      // } else if (!isCountryExist && isRegionExist) {
      //   console.warn(
      //     `⚠️ Slug "${country.slug}" matched a REGION but NOT a destination (${country.title})`
      //   );
      // } else if (isCountryExist && !isRegionExist) {
      //   console.warn(
      //     `⚠️ Slug "${country.slug}" matched a DESTINATION but NOT a region (${country.title})`
      //   );
      // }
    
      if (!country.operators) continue;
    
      for (const operator of country.operators) {
        if (!operator.packages) continue;
    
        for (const pkg of operator.packages) {
          if (pkg.type === 'topup') continue;
          if (!pkg.id || !pkg.data) {
            skipped++;
            continue;
          }
          // console.log(`Processing package: ${pkg.id} (${pkg.title}) for operator: ${operator.title}v,${ pkg.slug}`);
        
          // --- MATCH LOGIC START ---
          const countrySlug = country.slug;
          const packageSlug = pkg.id || "(no package slug)";
        
          const hasDestination = destinationsBySlug.has(countrySlug);
          const hasRegion = regionsBySlug.has(countrySlug);
        
          // if (hasDestination && hasRegion) {
          //   console.log(
          //     `✅ MATCHED BOTH → countrySlug: "${countrySlug}", packageSlug: "${packageSlug}"`
          //   );
          // } else if (hasDestination) {
          //   console.log(
          //     `🟢 MATCHED DESTINATION → countrySlug: "${countrySlug}", packageSlug: "${packageSlug}"`
          //   );
          // } else if (hasRegion) {
          //   console.log(
          //     `🔵 MATCHED REGION → countrySlug: "${countrySlug}", packageSlug: "${packageSlug}"`
          //   );
          // } else {
          //   console.warn(
          //     `❌ NO MATCH → countrySlug: "${countrySlug}", packageSlug: "${packageSlug}"`
          //   );
          // }
    
          // Now prepare actual package
          const packageData = await preparePackageData(
            provider,
            country,
            operator,
            pkg,
            destinationsBySlug,
            regionsBySlug,
            pricingMargin
          );
    
          if (!packageData) {
            // console.warn(
            //   `❌ Package skipped — slug mismatch: ${country.slug}, packageID: ${pkg.id}`
            // );
            skipped++;
            continue;
          }
    
          const existing = existingPackagesByAiraloId.get(pkg.id);
    
          if (existing) {
            packagesToUpdate.push({ id: existing.id, data: packageData });
          } else {
            packagesToCreate.push(packageData);
          }
        }
      }
    }
    
    
    let packagesSynced = 0;
    let packagesUpdated = 0;
    
    if (packagesToCreate.length > 0) {
      await storage.batchCreatePackages(packagesToCreate);
      packagesSynced = packagesToCreate.length;
    }
    
    if (packagesToUpdate.length > 0) {
      await storage.batchUpdatePackages(packagesToUpdate);
      packagesUpdated = packagesToUpdate.length;
    }
    
    return {
      success: true,
      packagesSynced,
      packagesUpdated,
      packagesRemoved: 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      packagesSynced: 0,
      packagesUpdated: 0,
      packagesRemoved: 0,
      errorMessage,
    };
  }
}

async function preparePackageData(
  provider: Provider,
  countryData: AiraloCountryData,
  operator: AiraloOperator,
  pkg: AiraloPackageData,
  destinationsBySlug: Map<string, any>,
  regionsBySlug: Map<string, any>,
  pricingMargin: number
): Promise<InsertAiraloPackage | null> {

  const allRegions = await storage.getAllRegions();

  let destinationId: string | null = null;
  let regionId: string | null = null;
  let locationName = "";

  if (!pkg.id) {
    console.log("❌ Package has no Airalo identifier", pkg);
    return null;
  }
  

  // -------------------------
  // LOCAL PACKAGE
  // -------------------------
  if (operator.type === "local") {
    const resolved = resolveAiraloSlug(countryData.slug, destinationsBySlug, regionsBySlug);
    if (resolved.destinationId) {
      destinationId = resolved.destinationId;
    } else if (resolved.regionId) {
      regionId = resolved.regionId;
    }
    locationName = countryData.title;
  }

  // -------------------------
  // REGIONAL / GLOBAL PACKAGE
  // -------------------------
  else {
    const resolved = resolveAiraloSlug(countryData.slug, destinationsBySlug, regionsBySlug);
    if (resolved.regionId) {
      regionId = resolved.regionId;
      const region = regionsBySlug.get(countryData.slug) || 
                     regionsBySlug.get(AIRALO_REGION_SLUG_ALIASES[countryData.slug]);
      locationName = region?.name || operator.title || countryData.title;
    } else {
      const operatorCountryCodes =
        operator.coverages?.map((c: any) => c.iso).filter(Boolean) || [];

      if (operatorCountryCodes.length > 0) {
        const matchedRegion = allRegions.find((region: any) =>
          Array.isArray(region.countries) &&
          operatorCountryCodes.every((code: string) =>
            region.countries.includes(code)
          )
        );

        if (matchedRegion) {
          regionId = matchedRegion.id;
          locationName = matchedRegion.name;
        } else {
          locationName = operator.title || countryData.title;
        }
      } else {
        locationName = operator.title || countryData.title;
      }
    }
  }

  // -------------------------
  // PACKAGE SLUG
  // -------------------------
  const dataDisplay =
    pkg.data || `${Math.round(pkg.amount / 1024)}GB`;

  const baseSlug = generatePackageSlug(
    locationName,
    dataDisplay,
    pkg.day,
    operator.title
  );

  const slug = `${baseSlug}-${pkg.id}`;

  // -------------------------
  // COVERAGE DISPLAY
  // -------------------------
  const coverage =
    operator.coverages
      ?.flatMap((c: any) =>
        c.networks?.map((n: any) => n.name) || []
      )
      .filter(Boolean) || [];

  // -------------------------
  // PRICING
  // -------------------------
  const airaloPrice = parseFloat(
    (pkg.net_price || pkg.price).toString()
  );

  const sellingPrice = airaloPrice * (1 + pricingMargin / 100);

  // -------------------------
  // FINAL OBJECT
  // -------------------------
  return {
    providerId: provider.id,
    airaloId: pkg.id,
    destinationId,
    regionId,
    slug,
    title: pkg.title,
    dataAmount: dataDisplay,
    validity: pkg.day,
    airaloPrice: airaloPrice.toFixed(2),
    price: sellingPrice.toFixed(2),
    currency: "USD",
    type: operator.type,
    operator: operator.title,
    operatorImage: operator.image?.url,
    coverage: coverage.length ? coverage : undefined,
    voiceCredits: pkg.voice || 0,
    smsCredits: pkg.text || 0,
    isUnlimited: pkg.is_unlimited || false,
    active: true,
  };
}

