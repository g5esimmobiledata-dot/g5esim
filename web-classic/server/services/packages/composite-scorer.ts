/**
 * Composite Scoring System
 * 
 * Combines multiple scoring factors:
 * - Price score (normalized 0-100)
 * - AI quality score
 * - Provider reliability score
 * - Coverage score
 * 
 * Configurable weights stored in platform_settings
 */

import { db } from "../../db";
import { platformSettings, providers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { packageAnalyzer, type PackageData } from "../ai/package-analyzer";

export interface ScoringWeights {
  priceWeight: number;
  qualityWeight: number;
  providerWeight: number;
}

export interface CompositeScore {
  packageId: string;
  finalScore: number;
  priceScore: number;
  qualityScore: number;
  providerScore: number;
  weights: ScoringWeights;
  breakdown: {
    priceContribution: number;
    qualityContribution: number;
    providerContribution: number;
  };
  reasoning?: string;
  aiEnhanced: boolean;
}

export interface PackageWithScore extends PackageData {
  compositeScore: CompositeScore;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  priceWeight: 50,
  qualityWeight: 30,
  providerWeight: 20,
};

const PROVIDER_SCORES: Record<string, number> = {
  airalo: 90,
  "esim-access": 85,
  "esim-go": 82,
  maya: 78,
};

export class CompositeScorer {
  private weightsCache: ScoringWeights | null = null;
  private weightsCacheExpiry: Date | null = null;
  private providerScores: Map<string, number> = new Map();

  /**
   * Get scoring weights from platform settings
   */
  async getWeights(): Promise<ScoringWeights> {
    if (this.weightsCache && this.weightsCacheExpiry && new Date() < this.weightsCacheExpiry) {
      return this.weightsCache;
    }

    try {
      const settings = await db.query.platformSettings.findMany({
        where: (ps, { inArray }) => inArray(ps.key, [
          "ai_price_weight",
          "ai_quality_weight", 
          "ai_provider_weight"
        ]),
      });

      const weights: ScoringWeights = { ...DEFAULT_WEIGHTS };

      for (const setting of settings) {
        const value = parseInt(setting.value, 10);
        if (!isNaN(value) && value >= 0 && value <= 100) {
          switch (setting.key) {
            case "ai_price_weight":
              weights.priceWeight = value;
              break;
            case "ai_quality_weight":
              weights.qualityWeight = value;
              break;
            case "ai_provider_weight":
              weights.providerWeight = value;
              break;
          }
        }
      }

      const total = weights.priceWeight + weights.qualityWeight + weights.providerWeight;
      if (total !== 100) {
        const factor = 100 / total;
        weights.priceWeight = Math.round(weights.priceWeight * factor);
        weights.qualityWeight = Math.round(weights.qualityWeight * factor);
        weights.providerWeight = 100 - weights.priceWeight - weights.qualityWeight;
      }

      this.weightsCache = weights;
      this.weightsCacheExpiry = new Date(Date.now() + 5 * 60 * 1000);

      return weights;
    } catch (error) {
      console.warn("[Composite Scorer] Failed to load weights, using defaults:", error);
      return DEFAULT_WEIGHTS;
    }
  }

  /**
   * Get provider reliability score
   */
  async getProviderScore(providerId: string): Promise<number> {
    if (this.providerScores.has(providerId)) {
      return this.providerScores.get(providerId)!;
    }

    const baseScore = PROVIDER_SCORES[providerId] || 75;

    try {
      const provider = await db.query.providers.findFirst({
        where: eq(providers.id, providerId),
      });

      if (provider && provider.enabled) {
        this.providerScores.set(providerId, baseScore);
        return baseScore;
      }
    } catch (error) {
      console.warn("[Composite Scorer] Failed to get provider:", error);
    }

    this.providerScores.set(providerId, baseScore);
    return baseScore;
  }

  /**
   * Calculate price score (inverse - lower price = higher score)
   */
  calculatePriceScore(price: number, minPrice: number, maxPrice: number): number {
    if (minPrice === maxPrice) return 100;
    
    const range = maxPrice - minPrice;
    const normalized = (maxPrice - price) / range;
    
    return Math.round(normalized * 100);
  }

  /**
   * Score a single package
   */
  async scorePackage(
    pkg: PackageData,
    priceRange: { min: number; max: number },
    useAI: boolean = true
  ): Promise<CompositeScore> {
    const weights = await this.getWeights();
    const price = parseFloat(pkg.retailPrice);

    const priceScore = this.calculatePriceScore(price, priceRange.min, priceRange.max);

    let qualityScore = 75;
    let reasoning: string | undefined;
    let aiEnhanced = false;

    if (useAI) {
      try {
        const analysis = await packageAnalyzer.analyzePackage(pkg, true);
        qualityScore = analysis.valueScore;
        reasoning = analysis.reasoning;
        aiEnhanced = true;
      } catch (error) {
        console.warn("[Composite Scorer] AI analysis failed, using base quality score");
        const baseScores = packageAnalyzer.calculateBaseScores(pkg);
        qualityScore = baseScores.valueScore;
      }
    } else {
      const baseScores = packageAnalyzer.calculateBaseScores(pkg);
      qualityScore = baseScores.valueScore;
    }

    const providerScore = await this.getProviderScore(pkg.providerId);

    const priceContribution = (priceScore * weights.priceWeight) / 100;
    const qualityContribution = (qualityScore * weights.qualityWeight) / 100;
    const providerContribution = (providerScore * weights.providerWeight) / 100;

    const finalScore = Math.round(priceContribution + qualityContribution + providerContribution);

    return {
      packageId: pkg.id,
      finalScore,
      priceScore,
      qualityScore,
      providerScore,
      weights,
      breakdown: {
        priceContribution: Math.round(priceContribution),
        qualityContribution: Math.round(qualityContribution),
        providerContribution: Math.round(providerContribution),
      },
      reasoning,
      aiEnhanced,
    };
  }

  /**
   * Score multiple packages and find the best one
   */
  async scorePackages(
    packages: PackageData[],
    useAI: boolean = true
  ): Promise<PackageWithScore[]> {
    if (packages.length === 0) return [];

    const prices = packages.map(p => parseFloat(p.retailPrice));
    const priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };

    const scored = await Promise.all(
      packages.map(async (pkg) => ({
        ...pkg,
        compositeScore: await this.scorePackage(pkg, priceRange, useAI),
      }))
    );

    scored.sort((a, b) => b.compositeScore.finalScore - a.compositeScore.finalScore);

    return scored;
  }

  /**
   * Find the best package from a group
   */
  async findBestPackage(
    packages: PackageData[],
    useAI: boolean = true
  ): Promise<{ best: PackageWithScore; all: PackageWithScore[] } | null> {
    if (packages.length === 0) return null;

    const scored = await this.scorePackages(packages, useAI);
    
    return {
      best: scored[0],
      all: scored,
    };
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.weightsCache = null;
    this.weightsCacheExpiry = null;
    this.providerScores.clear();
  }
}

export const compositeScorer = new CompositeScorer();
