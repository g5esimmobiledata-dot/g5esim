import type { ProviderTopupPackage } from "../providers/provider-interface";
import { db } from "../db";
import { unifiedPackages } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getProviderSpecificPackageId } from "./packages/package-resolver";

type ProviderServiceWithTopups = {
  getTopupPackages(iccidOrPackageId: string): Promise<ProviderTopupPackage[]>;
};

export type NormalizedTopupPackage = {
  id: string;
  package_id: string;
  providerPackageId: string;
  title: string;
  data: string;
  dataAmount: string;
  validity: number;
  price: string;
  customer_price: string;
  currency: string;
  operator?: string;
  operatorImage?: string;
};

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringValue(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text && !/^(null|undefined|n\/a|na)$/i.test(text)) {
      return text;
    }
  }

  return "";
}

export function getTopupPackageIdentifier(pkg: any) {
  return stringValue(pkg?.id, pkg?.package_id, pkg?.providerPackageId, pkg?.provider_package_id);
}

export function getTopupWholesalePrice(pkg: any) {
  return numberValue(
    pkg?.wholesalePrice ??
      pkg?.wholesale_price ??
      pkg?.net_price ??
      pkg?.airaloPrice ??
      pkg?.price,
  );
}

export function normalizeTopupPackage(pkg: any, topupMargin: number): NormalizedTopupPackage | null {
  const providerPackageId = getTopupPackageIdentifier(pkg);
  if (!providerPackageId) return null;

  const wholesalePrice = getTopupWholesalePrice(pkg);
  const existingCustomerPrice = numberValue(pkg?.customer_price ?? pkg?.customerPrice, NaN);
  const customerPrice = Number.isFinite(existingCustomerPrice)
    ? existingCustomerPrice
    : Number((wholesalePrice * (1 + topupMargin / 100)).toFixed(2));
  const dataAmount = stringValue(pkg?.dataAmount, pkg?.data, pkg?.volume, "Data");
  const validity = numberValue(pkg?.validity ?? pkg?.day ?? pkg?.duration, 0);

  return {
    id: providerPackageId,
    package_id: providerPackageId,
    providerPackageId,
    title: stringValue(pkg?.title, pkg?.name, `${dataAmount} - ${validity} Days`),
    data: dataAmount,
    dataAmount,
    validity,
    price: customerPrice.toFixed(2),
    customer_price: customerPrice.toFixed(2),
    currency: stringValue(pkg?.currency, pkg?.currency_code, "USD"),
    operator: stringValue(pkg?.operator) || undefined,
    operatorImage: stringValue(pkg?.operatorImage, pkg?.operator_image) || undefined,
  };
}

export function findProviderTopupPackage(packages: any[], topupId: string) {
  const target = String(topupId || "");
  return packages.find((pkg: any) => {
    return [
      pkg?.id,
      pkg?.package_id,
      pkg?.providerPackageId,
      pkg?.provider_package_id,
    ].some((value) => String(value ?? "") === target);
  });
}

async function getOrderTopupLookupKeys(order: any) {
  const keys = [stringValue(order?.iccid)];
  const [pkg] = await db
    .select()
    .from(unifiedPackages)
    .where(eq(unifiedPackages.id, order.packageId))
    .limit(1);

  if (pkg?.providerPackageTable && pkg?.providerPackageId) {
    const providerPackageApiId = await getProviderSpecificPackageId(
      pkg.providerPackageTable,
      pkg.providerPackageId,
    );
    keys.push(stringValue(providerPackageApiId));
    keys.push(stringValue(pkg.providerPackageId));
  }

  keys.push(stringValue(order?.packageId));
  return Array.from(new Set(keys.filter(Boolean)));
}

export async function fetchProviderTopupPackages(
  order: any,
  providerService: ProviderServiceWithTopups,
) {
  const lookupKeys = await getOrderTopupLookupKeys(order);
  const errors: string[] = [];

  for (const lookupKey of lookupKeys) {
    try {
      const result = await providerService.getTopupPackages(lookupKey);
      const packages = Array.isArray((result as any)?.data)
        ? (result as any).data
        : Array.isArray(result)
          ? result
          : [];

      if (packages.length > 0) {
        return { packages, lookupKey, errors };
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return { packages: [], lookupKey: lookupKeys[0] || "", errors };
}
