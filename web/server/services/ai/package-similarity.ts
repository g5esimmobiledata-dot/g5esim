/**
 * Package Similarity Engine
 * 
 * Uses AI to identify equivalent packages across providers:
 * - Fuzzy matching (7-day ≈ 8-day, 1GB ≈ 1.2GB)
 * - Group similar offerings
 * - Find best alternatives when exact match unavailable
 */

import { openAIService } from "./openai-service";

export interface PackageSpec {
  id: string;
  providerId: string;
  providerName: string;
  destinationId: string;
  destinationName: string;
  regionId?: string;
  regionName?: string;
  dataMb: number | null;
  validityDays: number;
  retailPrice: string;
  packageGroupKey?: string;
}

export interface SimilarityGroup {
  groupId: string;
  packages: PackageSpec[];
  similarity: number;
  groupLabel: string;
}

export interface AlternativePackage {
  package: PackageSpec;
  similarity: number;
  differenceDescription: string;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: Date;
}

const SIMILARITY_THRESHOLDS = {
  dataMbVariance: 0.25,
  validityDaysVariance: 0.15,
  priceVariance: 0.30,
};

export class PackageSimilarityService {
  private groupCache: Map<string, CacheEntry<SimilarityGroup[]>> = new Map();
  private cacheTTLHours: number = 24;

  constructor(cacheTTLHours: number = 24) {
    this.cacheTTLHours = cacheTTLHours;
  }

  /**
   * Set cache TTL
   */
  setCacheTTL(hours: number): void {
    this.cacheTTLHours = hours;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.groupCache.clear();
    console.log("[Package Similarity] Cache cleared");
  }

  /**
   * Calculate similarity score between two packages (0-100)
   */
  calculateSimilarity(pkg1: PackageSpec, pkg2: PackageSpec): number {
    if (pkg1.destinationId !== pkg2.destinationId && pkg1.regionId !== pkg2.regionId) {
      return 0;
    }

    let score = 100;
    const deductions: number[] = [];

    const data1 = pkg1.dataMb || 0;
    const data2 = pkg2.dataMb || 0;
    if (data1 === 0 && data2 === 0) {
    } else if (data1 === 0 || data2 === 0) {
      deductions.push(40);
    } else {
      const dataVariance = Math.abs(data1 - data2) / Math.max(data1, data2);
      if (dataVariance > SIMILARITY_THRESHOLDS.dataMbVariance) {
        deductions.push(Math.min(40, dataVariance * 80));
      } else {
        deductions.push(dataVariance * 20);
      }
    }

    const validityVariance = Math.abs(pkg1.validityDays - pkg2.validityDays) / Math.max(pkg1.validityDays, pkg2.validityDays);
    if (validityVariance > SIMILARITY_THRESHOLDS.validityDaysVariance) {
      deductions.push(Math.min(30, validityVariance * 60));
    } else {
      deductions.push(validityVariance * 15);
    }

    const price1 = parseFloat(pkg1.retailPrice);
    const price2 = parseFloat(pkg2.retailPrice);
    const priceVariance = Math.abs(price1 - price2) / Math.max(price1, price2);
    if (priceVariance > SIMILARITY_THRESHOLDS.priceVariance) {
      deductions.push(Math.min(20, priceVariance * 40));
    } else {
      deductions.push(priceVariance * 10);
    }

    score -= deductions.reduce((sum, d) => sum + d, 0);
    return Math.max(0, Math.round(score));
  }

  /**
   * Check if two packages are similar enough to be grouped
   */
  areSimilar(pkg1: PackageSpec, pkg2: PackageSpec, threshold: number = 70): boolean {
    return this.calculateSimilarity(pkg1, pkg2) >= threshold;
  }

  /**
   * Group similar packages together
   */
  groupSimilarPackages(packages: PackageSpec[], threshold: number = 70): SimilarityGroup[] {
    if (packages.length === 0) return [];

    const cacheKey = packages.map(p => p.id).sort().join("|") + `|t${threshold}`;
    const cached = this.groupCache.get(cacheKey);
    if (cached && new Date() < cached.expiresAt) {
      return cached.data;
    }

    const groups: SimilarityGroup[] = [];
    const assigned = new Set<string>();

    for (const pkg of packages) {
      if (assigned.has(pkg.id)) continue;

      const group: PackageSpec[] = [pkg];
      assigned.add(pkg.id);

      for (const other of packages) {
        if (assigned.has(other.id)) continue;
        if (this.areSimilar(pkg, other, threshold)) {
          group.push(other);
          assigned.add(other.id);
        }
      }

      const avgData = group.reduce((sum, p) => sum + (p.dataMb || 0), 0) / group.length;
      const avgValidity = group.reduce((sum, p) => sum + p.validityDays, 0) / group.length;
      
      const groupLabel = this.generateGroupLabel(avgData, avgValidity, pkg.destinationName);
      
      const avgSimilarity = group.length > 1
        ? group.slice(1).reduce((sum, p) => sum + this.calculateSimilarity(pkg, p), 0) / (group.length - 1)
        : 100;

      groups.push({
        groupId: `grp_${pkg.destinationId}_${Math.round(avgData)}_${Math.round(avgValidity)}`,
        packages: group,
        similarity: Math.round(avgSimilarity),
        groupLabel,
      });
    }

    const expiry = new Date();
    expiry.setHours(expiry.getHours() + this.cacheTTLHours);
    this.groupCache.set(cacheKey, { data: groups, expiresAt: expiry });

    return groups;
  }

  /**
   * Generate human-readable group label
   */
  private generateGroupLabel(avgDataMb: number, avgValidityDays: number, destination: string): string {
    const dataLabel = avgDataMb === 0 
      ? "Unlimited" 
      : avgDataMb >= 1024 
        ? `${Math.round(avgDataMb / 1024)}GB` 
        : `${Math.round(avgDataMb)}MB`;
    
    const validityLabel = avgValidityDays >= 30 
      ? `${Math.round(avgValidityDays / 30)} month` 
      : `${Math.round(avgValidityDays)} day`;

    return `${destination} - ${dataLabel} / ${validityLabel}`;
  }

  /**
   * Find alternative packages when exact match not available
   */
  async findAlternatives(
    targetSpec: { dataMb: number; validityDays: number; destinationId: string },
    availablePackages: PackageSpec[],
    maxResults: number = 5,
    useAI: boolean = true
  ): Promise<AlternativePackage[]> {
    const sameDestination = availablePackages.filter(
      p => p.destinationId === targetSpec.destinationId
    );

    if (sameDestination.length === 0) {
      return [];
    }

    const targetPackage: PackageSpec = {
      id: "target",
      providerId: "target",
      providerName: "Target",
      destinationId: targetSpec.destinationId,
      destinationName: "",
      dataMb: targetSpec.dataMb,
      validityDays: targetSpec.validityDays,
      retailPrice: "0",
    };

    const withSimilarity = sameDestination.map(pkg => ({
      package: pkg,
      similarity: this.calculateSimilarity(targetPackage, pkg),
      differenceDescription: this.describeDifference(targetSpec, pkg),
    }));

    withSimilarity.sort((a, b) => b.similarity - a.similarity);

    const topResults = withSimilarity.slice(0, maxResults);

    if (useAI && openAIService.isReady() && topResults.length > 1) {
      try {
        const enhanced = await this.enhanceAlternativesWithAI(targetSpec, topResults);
        return enhanced;
      } catch (error) {
        console.warn("[Package Similarity] AI enhancement failed, using basic results");
      }
    }

    return topResults;
  }

  /**
   * Describe the difference between target and available package
   */
  private describeDifference(
    target: { dataMb: number; validityDays: number },
    pkg: PackageSpec
  ): string {
    const differences: string[] = [];
    const pkgData = pkg.dataMb || 0;

    if (pkgData !== target.dataMb) {
      const dataDiff = pkgData - target.dataMb;
      if (pkgData === 0) {
        differences.push("Unlimited data instead of limited");
      } else if (dataDiff > 0) {
        differences.push(`${Math.abs(dataDiff)}MB more data`);
      } else {
        differences.push(`${Math.abs(dataDiff)}MB less data`);
      }
    }

    if (pkg.validityDays !== target.validityDays) {
      const validityDiff = pkg.validityDays - target.validityDays;
      if (validityDiff > 0) {
        differences.push(`${validityDiff} days longer`);
      } else {
        differences.push(`${Math.abs(validityDiff)} days shorter`);
      }
    }

    return differences.length > 0 ? differences.join(", ") : "Exact match";
  }

  /**
   * Use AI to enhance alternative descriptions
   */
  private async enhanceAlternativesWithAI(
    target: { dataMb: number; validityDays: number },
    alternatives: AlternativePackage[]
  ): Promise<AlternativePackage[]> {
    const prompt = `Given a user looking for an eSIM with ${target.dataMb}MB data and ${target.validityDays} days validity, provide brief descriptions for these alternatives:

${alternatives.map((alt, i) => `${i + 1}. ${alt.package.providerName}: ${alt.package.dataMb || "Unlimited"}MB, ${alt.package.validityDays} days, $${alt.package.retailPrice}`).join("\n")}

Provide JSON array with improved descriptions:
[{"index": 0, "description": "brief recommendation note"}]`;

    const result = await openAIService.chatCompletionJSON<Array<{ index: number; description: string }>>(
      prompt,
      { model: "gpt-4o-mini", maxTokens: 300 }
    );

    if (result.success && result.data) {
      for (const item of result.data) {
        if (item.index >= 0 && item.index < alternatives.length) {
          alternatives[item.index].differenceDescription = item.description;
        }
      }
    }

    return alternatives;
  }
}

export const packageSimilarity = new PackageSimilarityService();
