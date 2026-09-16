import { db } from "../../db";
import { providers, unifiedPackages } from "@shared/schema";
import { eq, and, ne } from "drizzle-orm";
import type { ProviderCandidate } from "./types";
import { marginCalculator } from "./margin-calculator";

export class ProviderSelector {
  async getEnabledProviders(): Promise<Array<{
    id: string;
    name: string;
    slug: string;
    failoverPriority: number;
    minMarginPercent: number;
  }>> {
    const enabledProviders = await db.query.providers.findMany({
      where: eq(providers.enabled, true),
    });

    return enabledProviders.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      failoverPriority: p.failoverPriority,
      minMarginPercent: parseFloat(p.minMarginPercent || "0"),
    }));
  }

  async findAlternativePackages(
    currentPackageId: string,
    currentProviderId: string,
    retailPrice: number
  ): Promise<ProviderCandidate[]> {
    const currentPackage = await db.query.unifiedPackages.findFirst({
      where: eq(unifiedPackages.id, currentPackageId),
    });

    if (!currentPackage) {
      return [];
    }

    const alternatives = await db.query.unifiedPackages.findMany({
      where: and(
        eq(unifiedPackages.destinationId, currentPackage.destinationId!),
        eq(unifiedPackages.dataAmount, currentPackage.dataAmount),
        eq(unifiedPackages.validity, currentPackage.validity),
        eq(unifiedPackages.isEnabled, true),
        ne(unifiedPackages.providerId, currentProviderId)
      ),
      with: {
        provider: true,
      },
    });

    const enabledProviders = await this.getEnabledProviders();
    const enabledProviderIds = new Set(enabledProviders.map(p => p.id));

    const candidates: ProviderCandidate[] = [];

    for (const pkg of alternatives) {
      if (!pkg.provider || !enabledProviderIds.has(pkg.providerId!)) {
        continue;
      }

      const provider = enabledProviders.find(p => p.id === pkg.providerId);
      if (!provider) continue;

      const wholesalePrice = parseFloat(pkg.wholesalePrice);
      const minMargin = await marginCalculator.getProviderMinMargin(pkg.providerId!);
      const marginCalc = marginCalculator.validateMargin(wholesalePrice, retailPrice, minMargin);

      if (!marginCalc.passed) {
        continue;
      }

      candidates.push({
        providerId: pkg.providerId!,
        providerName: pkg.provider.name,
        providerSlug: pkg.provider.slug,
        packageId: pkg.id,
        providerPackageId: pkg.providerPackageId!,
        wholesalePrice,
        priority: provider.failoverPriority,
        minMarginPercent: minMargin,
      });
    }

    return this.rankByPriority(candidates);
  }

  rankByPriority(candidates: ProviderCandidate[]): ProviderCandidate[] {
    return candidates.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.wholesalePrice - b.wholesalePrice;
    });
  }

  async isProviderEnabled(providerId: string): Promise<boolean> {
    const provider = await db.query.providers.findFirst({
      where: and(
        eq(providers.id, providerId),
        eq(providers.enabled, true)
      ),
    });
    return !!provider;
  }
}

export const providerSelector = new ProviderSelector();
