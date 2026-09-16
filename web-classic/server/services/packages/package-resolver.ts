/**
 * Package Resolution Layer
 * 
 * Detects whether a packageId belongs to unified_packages or legacy packages table
 * Returns normalized package data with provider metadata for order processing
 */

import { db } from "../../db";
import { airaloPackages, unifiedPackages, providers } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface NormalizedPackage {
  id: string;
  isUnified: boolean;

  // Provider info (null for legacy Airalo packages)
  providerId: string | null;
  providerSlug: string | null;
  providerPackageTable: string | null;
  providerPackageId: string | null;

  // Package details
  dataAmount: string;
  validity: number;
  price: string;
  wholesalePrice: string; // What we pay the provider
  currency: string;
  slug: string;
  title: string;

  // For legacy packages
  airaloId?: string;
  airaloPrice?: string;
  destinationId?: string | null;
  regionId?: string | null;
}

/**
 * Resolves a packageId to determine if it's from unified_packages or legacy packages
 * Returns normalized package data with provider metadata
 */
export async function resolvePackage(packageId: string): Promise<NormalizedPackage | null> {
  // First, try unified_packages table
  const unifiedPackage = await db.query.unifiedPackages.findFirst({
    where: eq(unifiedPackages.id, packageId),
    with: {
      provider: true,
    },
  });

  if (unifiedPackage && unifiedPackage.provider) {
    return {
      id: unifiedPackage.id,
      isUnified: true,
      providerId: unifiedPackage.providerId,
      providerSlug: unifiedPackage.provider.slug,
      providerPackageTable: unifiedPackage.providerPackageTable,
      providerPackageId: unifiedPackage.providerPackageId,
      dataAmount: unifiedPackage.dataAmount,
      validity: unifiedPackage.validity,
      price: unifiedPackage.retailPrice,
      wholesalePrice: unifiedPackage.wholesalePrice,
      currency: unifiedPackage.currency,
      slug: unifiedPackage.slug,
      title: unifiedPackage.title,
      destinationId: unifiedPackage.destinationId || undefined,
      regionId: unifiedPackage.regionId || undefined,
    };
  }

  // Fallback to Airalo packages table
  const airaloPackage = await db.query.airaloPackages.findFirst({
    where: eq(airaloPackages.id, packageId),
  });

  if (airaloPackage) {
    return {
      id: airaloPackage.id,
      isUnified: false,
      providerId: airaloPackage.providerId || null,
      providerSlug: 'airalo', // Airalo packages
      providerPackageTable: null,
      providerPackageId: null,
      dataAmount: airaloPackage.dataAmount,
      validity: airaloPackage.validity,
      price: airaloPackage.price,
      wholesalePrice: airaloPackage.airaloPrice || airaloPackage.price,
      currency: airaloPackage.currency,
      slug: airaloPackage.slug,
      title: airaloPackage.title,
      airaloId: airaloPackage.airaloId,
      airaloPrice: airaloPackage.airaloPrice || undefined,
      destinationId: airaloPackage.destinationId || undefined,
      regionId: airaloPackage.regionId || undefined,
    };
  }

  return null;
}

/**
 * Get the provider-specific package ID based on the unified package
 * This is used to submit orders to the provider API
 */
export async function getProviderSpecificPackageId(
  providerPackageTable: string,
  providerPackageId: string
): Promise<string | null> {
  // Query the provider-specific table to get the API package ID
  let result;

  if (providerPackageTable === 'airalo_packages') {
    const { airaloPackages } = await import("@shared/schema");
    result = await db.query.airaloPackages.findFirst({
      where: eq(airaloPackages.id, providerPackageId),
    });
    return result?.airaloId || null;
  } else if (providerPackageTable === 'esim_access_packages') {
    const { esimAccessPackages } = await import("@shared/schema");
    result = await db.query.esimAccessPackages.findFirst({
      where: eq(esimAccessPackages.id, providerPackageId),
    });
    return result?.esimAccessId || null;
  } else if (providerPackageTable === 'esim_go_packages') {
    const { esimGoPackages } = await import("@shared/schema");
    result = await db.query.esimGoPackages.findFirst({
      where: eq(esimGoPackages.id, providerPackageId),
    });
    return result?.esimGoId || null;
  } else if (providerPackageTable === 'maya_packages') {
    const { mayaPackages } = await import("@shared/schema");
    result = await db.query.mayaPackages.findFirst({
      where: eq(mayaPackages.mayaId, providerPackageId),
    });
    return result?.mayaId || null;
  }

  return null;
}
