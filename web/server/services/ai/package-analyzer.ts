/**
 * AI Package Analyzer
 * 
 * GPT-powered service that:
 * - Analyzes package value propositions
 * - Scores quality factors (data/price ratio, validity value, provider reputation)
 * - Generates comparison insights
 * - Caches results with configurable TTL
 */

import { openAIService } from "./openai-service";

export interface PackageData {
  id: string;
  name: string;
  providerName: string;
  providerId: string;
  destinationName: string;
  destinationCode?: string;
  regionName?: string;
  dataMb: number | null;
  validityDays: number;
  retailPrice: string;
  wholesalePrice?: string;
  voiceMinutes?: number;
  smsCount?: number;
  description?: string;
  networkTypes?: string[];
  coverage?: string[];
}

export interface PackageScore {
  packageId: string;
  overallScore: number;
  valueScore: number;
  dataValueScore: number;
  validityScore: number;
  providerScore: number;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
  analyzedAt: Date;
}

export interface PackageComparison {
  packages: PackageScore[];
  bestPackageId: string;
  comparisonSummary: string;
  recommendation: string;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: Date;
}

const PROVIDER_REPUTATION: Record<string, number> = {
  airalo: 85,
  "esim-access": 80,
  "esim-go": 78,
  maya: 75,
  default: 70,
};

export class PackageAnalyzerService {
  private scoreCache: Map<string, CacheEntry<PackageScore>> = new Map();
  private comparisonCache: Map<string, CacheEntry<PackageComparison>> = new Map();
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
   * Clear all caches
   */
  clearCache(): void {
    this.scoreCache.clear();
    this.comparisonCache.clear();
    console.log("[Package Analyzer] Cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { scoreEntries: number; comparisonEntries: number } {
    return {
      scoreEntries: this.scoreCache.size,
      comparisonEntries: this.comparisonCache.size,
    };
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid<T>(entry: CacheEntry<T> | undefined): boolean {
    if (!entry) return false;
    return new Date() < entry.expiresAt;
  }

  /**
   * Create cache expiry date
   */
  private getCacheExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + this.cacheTTLHours);
    return expiry;
  }

  /**
   * Calculate base scores without AI (fallback)
   */
  calculateBaseScores(pkg: PackageData): Omit<PackageScore, "reasoning" | "strengths" | "weaknesses"> {
    const price = parseFloat(pkg.retailPrice);
    const dataMb = pkg.dataMb || 0;
    const validityDays = pkg.validityDays;

    // Data value: MB per dollar (higher is better)
    const mbPerDollar = price > 0 ? dataMb / price : 0;
    const dataValueScore = Math.min(100, Math.round(mbPerDollar * 2));

    // Validity value: days per dollar (higher is better, but normalized)
    const daysPerDollar = price > 0 ? validityDays / price : 0;
    const validityScore = Math.min(100, Math.round(daysPerDollar * 10));

    // Provider reputation score
    const providerScore = PROVIDER_REPUTATION[pkg.providerId] || PROVIDER_REPUTATION.default;

    // Value score combines data and validity
    const valueScore = Math.round((dataValueScore * 0.7 + validityScore * 0.3));

    // Overall score
    const overallScore = Math.round(
      valueScore * 0.6 + providerScore * 0.4
    );

    return {
      packageId: pkg.id,
      overallScore,
      valueScore,
      dataValueScore,
      validityScore,
      providerScore,
      analyzedAt: new Date(),
    };
  }

  /**
   * Analyze a single package with AI
   */
  async analyzePackage(pkg: PackageData, useAI: boolean = true): Promise<PackageScore> {
    // Check cache
    const cached = this.scoreCache.get(pkg.id);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    // Calculate base scores
    const baseScores = this.calculateBaseScores(pkg);

    // If AI not ready or disabled, return base scores with generic reasoning
    if (!useAI || !openAIService.isReady()) {
      const score: PackageScore = {
        ...baseScores,
        reasoning: `Score based on data value (${pkg.dataMb || 0}MB for $${pkg.retailPrice}) and ${pkg.validityDays}-day validity from ${pkg.providerName}.`,
        strengths: this.generateGenericStrengths(pkg),
        weaknesses: this.generateGenericWeaknesses(pkg),
      };
      
      this.scoreCache.set(pkg.id, { data: score, expiresAt: this.getCacheExpiry() });
      return score;
    }

    // Use AI for enhanced analysis
    const prompt = `Analyze this eSIM data package and provide quality insights:

Package: ${pkg.name}
Provider: ${pkg.providerName}
Destination: ${pkg.destinationName}${pkg.regionName ? ` (${pkg.regionName})` : ""}
Data: ${pkg.dataMb ? `${pkg.dataMb}MB` : "Unlimited"}
Validity: ${pkg.validityDays} days
Price: $${pkg.retailPrice}
Voice: ${pkg.voiceMinutes || 0} minutes
SMS: ${pkg.smsCount || 0}
${pkg.description ? `Description: ${pkg.description}` : ""}

Provide a JSON response with:
{
  "reasoning": "1-2 sentence overall assessment",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"]
}

Focus on: value for money, data allowance adequacy, validity period appropriateness, provider reliability.`;

    const result = await openAIService.chatCompletionJSON<{
      reasoning: string;
      strengths: string[];
      weaknesses: string[];
    }>(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.3,
      maxTokens: 500,
    });

    let score: PackageScore;

    if (result.success && result.data) {
      score = {
        ...baseScores,
        reasoning: result.data.reasoning,
        strengths: result.data.strengths.slice(0, 3),
        weaknesses: result.data.weaknesses.slice(0, 3),
      };
    } else {
      // Fallback to generic reasoning
      score = {
        ...baseScores,
        reasoning: `${pkg.dataMb || "Unlimited"}MB package for $${pkg.retailPrice} over ${pkg.validityDays} days from ${pkg.providerName}.`,
        strengths: this.generateGenericStrengths(pkg),
        weaknesses: this.generateGenericWeaknesses(pkg),
      };
    }

    // Cache the result
    this.scoreCache.set(pkg.id, { data: score, expiresAt: this.getCacheExpiry() });
    return score;
  }

  /**
   * Compare multiple packages and determine the best one
   */
  async comparePackages(packages: PackageData[], useAI: boolean = true): Promise<PackageComparison> {
    if (packages.length === 0) {
      throw new Error("No Packages to compare");
    }

    if (packages.length === 1) {
      const score = await this.analyzePackage(packages[0], useAI);
      return {
        packages: [score],
        bestPackageId: packages[0].id,
        comparisonSummary: "Only one package available for this destination.",
        recommendation: `${packages[0].providerName}'s ${packages[0].name} is the available option.`,
      };
    }

    // Create cache key from package IDs
    const cacheKey = packages.map(p => p.id).sort().join("|");
    const cached = this.comparisonCache.get(cacheKey);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    // Analyze all packages
    const scores = await Promise.all(
      packages.map(pkg => this.analyzePackage(pkg, useAI))
    );

    // If AI not ready or disabled, use score-based comparison
    if (!useAI || !openAIService.isReady()) {
      return this.createScoreBasedComparison(packages, scores);
    }

    // Use AI for intelligent comparison
    const packagesInfo = packages.map((pkg, i) => ({
      id: pkg.id,
      name: pkg.name,
      provider: pkg.providerName,
      data: pkg.dataMb ? `${pkg.dataMb}MB` : "Unlimited",
      validity: `${pkg.validityDays} days`,
      price: `$${pkg.retailPrice}`,
      score: scores[i].overallScore,
    }));

    const prompt = `Compare these eSIM packages for ${packages[0].destinationName} and recommend the best one:

${JSON.stringify(packagesInfo, null, 2)}

Provide a JSON response:
{
  "bestPackageId": "the id of the recommended package",
  "comparisonSummary": "Brief comparison of all options (2-3 sentences)",
  "recommendation": "Why the best package was chosen (1-2 sentences)"
}

Consider: value for money, data adequacy for typical usage, provider reliability.`;

    const result = await openAIService.chatCompletionJSON<{
      bestPackageId: string;
      comparisonSummary: string;
      recommendation: string;
    }>(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.3,
      maxTokens: 500,
    });

    let comparison: PackageComparison;

    if (result.success && result.data) {
      // Verify the recommended package exists
      const validBestId = packages.some(p => p.id === result.data!.bestPackageId);
      
      comparison = {
        packages: scores,
        bestPackageId: validBestId ? result.data.bestPackageId : this.getBestByScore(scores),
        comparisonSummary: result.data.comparisonSummary,
        recommendation: result.data.recommendation,
      };
    } else {
      comparison = this.createScoreBasedComparison(packages, scores);
    }

    // Cache the result
    this.comparisonCache.set(cacheKey, { data: comparison, expiresAt: this.getCacheExpiry() });
    return comparison;
  }

  /**
   * Create comparison based purely on scores
   */
  private createScoreBasedComparison(packages: PackageData[], scores: PackageScore[]): PackageComparison {
    const bestId = this.getBestByScore(scores);
    const bestPkg = packages.find(p => p.id === bestId)!;
    const bestScore = scores.find(s => s.packageId === bestId)!;

    return {
      packages: scores,
      bestPackageId: bestId,
      comparisonSummary: `Compared ${packages.length} packages. ${bestPkg.providerName}'s offering scored highest at ${bestScore.overallScore}/100.`,
      recommendation: `${bestPkg.name} offers the best combination of value, data allowance, and provider reliability.`,
    };
  }

  /**
   * Get best package ID by score
   */
  private getBestByScore(scores: PackageScore[]): string {
    return scores.reduce((best, current) => 
      current.overallScore > best.overallScore ? current : best
    ).packageId;
  }

  /**
   * Generate generic strengths based on package data
   */
  private generateGenericStrengths(pkg: PackageData): string[] {
    const strengths: string[] = [];
    const price = parseFloat(pkg.retailPrice);
    const dataMb = pkg.dataMb || 0;

    if (dataMb > 5000) strengths.push("Large data allowance");
    else if (dataMb === 0) strengths.push("Unlimited data");
    
    if (pkg.validityDays >= 30) strengths.push("Extended validity period");
    if (price < 10) strengths.push("Budget-friendly pricing");
    if (dataMb > 0 && price > 0 && dataMb / price > 500) strengths.push("Excellent data value ratio");
    if (pkg.voiceMinutes && pkg.voiceMinutes > 0) strengths.push("Includes voice minutes");

    return strengths.length > 0 ? strengths : ["Standard package offering"];
  }

  /**
   * Generate generic weaknesses based on package data
   */
  private generateGenericWeaknesses(pkg: PackageData): string[] {
    const weaknesses: string[] = [];
    const price = parseFloat(pkg.retailPrice);
    const dataMb = pkg.dataMb || 0;

    if (dataMb > 0 && dataMb < 1000) weaknesses.push("Limited data allowance");
    if (pkg.validityDays < 7) weaknesses.push("Short validity period");
    if (price > 50) weaknesses.push("Premium pricing");
    if (dataMb > 0 && price > 0 && dataMb / price < 100) weaknesses.push("Lower data value ratio");
    if (!pkg.voiceMinutes || pkg.voiceMinutes === 0) weaknesses.push("Data only - no voice");

    return weaknesses.length > 0 ? weaknesses : ["No significant weaknesses"];
  }
}

// Singleton instance
export const packageAnalyzer = new PackageAnalyzerService();
