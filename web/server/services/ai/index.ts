/**
 * AI Services Index
 * 
 * Exports all AI-related services for package selection and analysis.
 */

export { openAIService, OpenAIService } from "./openai-service";
export { 
  packageAnalyzer, 
  PackageAnalyzerService,
  type PackageData,
  type PackageScore,
  type PackageComparison 
} from "./package-analyzer";
export { 
  packageSimilarity, 
  PackageSimilarityService,
  type PackageSpec,
  type SimilarityGroup,
  type AlternativePackage 
} from "./package-similarity";
