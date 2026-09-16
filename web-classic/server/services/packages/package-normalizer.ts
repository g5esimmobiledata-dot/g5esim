/**
 * Package Data Normalizer Service
 * Converts various provider data formats into standardized values for comparison
 */

export interface NormalizedPackageData {
  dataMb: number | null; // null for unlimited
  validityDays: number;
  voiceMinutes: number;
  smsCount: number;
}

export class PackageNormalizerService {
  /**
   * Parse data amount string and convert to megabytes
   * Handles formats: "1GB", "1 GB", "500MB", "500 MB", "1000 MB", "Unlimited"
   */
  parseDataAmount(dataAmountStr: string): number | null {
    if (!dataAmountStr) return null;
    
    const normalized = dataAmountStr.trim().toUpperCase();
    
    // Check for unlimited
    if (normalized.includes('UNLIMITED') || normalized.includes('UNLIM')) {
      return null; // null represents unlimited
    }
    
    // Remove all spaces for easier parsing
    const noSpaces = normalized.replace(/\s+/g, '');
    
    // Match patterns like 1GB, 500MB, 1.5GB, etc.
    const gbMatch = noSpaces.match(/^(\d+\.?\d*)GB$/);
    if (gbMatch) {
      return Math.round(parseFloat(gbMatch[1]) * 1024); // Convert GB to MB
    }
    
    const mbMatch = noSpaces.match(/^(\d+\.?\d*)MB$/);
    if (mbMatch) {
      return Math.round(parseFloat(mbMatch[1]));
    }
    
    // Try to extract any number and assume it's in GB if > 100, MB otherwise
    const numberMatch = noSpaces.match(/(\d+\.?\d*)/);
    if (numberMatch) {
      const value = parseFloat(numberMatch[1]);
      // Heuristic: if value > 100, assume MB, otherwise assume GB
      if (value > 100) {
        return Math.round(value);
      } else {
        return Math.round(value * 1024);
      }
    }
    
    console.warn(`⚠️  Could not parse data amount: "${dataAmountStr}"`);
    return null;
  }

  /**
   * Parse validity to ensure it's in days
   * Input is already in days from provider tables, so this is mostly for validation
   */
  parseValidity(validity: number): number {
    return validity;
  }

  /**
   * Parse voice credits (minutes)
   * Could be in various formats depending on provider
   */
  parseVoiceCredits(voiceCredits: number | null | undefined): number {
    return voiceCredits || 0;
  }

  /**
   * Parse SMS credits (count)
   * Could be in various formats depending on provider
   */
  parseSmsCredits(smsCredits: number | null | undefined): number {
    return smsCredits || 0;
  }

  /**
   * Normalize a complete package data object
   */
  normalizePackageData(pkg: {
    dataAmount: string;
    validity: number;
    voiceCredits?: number | null;
    smsCredits?: number | null;
    isUnlimited?: boolean;
  }): NormalizedPackageData {
    return {
      dataMb: pkg.isUnlimited ? null : this.parseDataAmount(pkg.dataAmount),
      validityDays: this.parseValidity(pkg.validity),
      voiceMinutes: this.parseVoiceCredits(pkg.voiceCredits),
      smsCount: this.parseSmsCredits(pkg.smsCredits),
    };
  }

  /**
   * Check if two packages are comparable (same specs)
   * Uses tolerance for data amount to handle minor variations
   */
  arePackagesComparable(
    pkg1: NormalizedPackageData,
    pkg2: NormalizedPackageData,
    dataTolerance: number = 0.05 // 5% tolerance
  ): boolean {
    // Both must have same unlimited status
    if ((pkg1.dataMb === null) !== (pkg2.dataMb === null)) {
      return false;
    }
    
    // For unlimited packages, only check validity
    if (pkg1.dataMb === null && pkg2.dataMb === null) {
      return pkg1.validityDays === pkg2.validityDays;
    }
    
    // For limited packages, check data amount with tolerance
    if (pkg1.dataMb !== null && pkg2.dataMb !== null) {
      const diff = Math.abs(pkg1.dataMb - pkg2.dataMb);
      const maxValue = Math.max(pkg1.dataMb, pkg2.dataMb);
      const percentDiff = diff / maxValue;
      
      if (percentDiff > dataTolerance) {
        return false;
      }
    }
    
    // Check validity (must match exactly)
    if (pkg1.validityDays !== pkg2.validityDays) {
      return false;
    }
    
    // Check voice and SMS (must match exactly)
    if (pkg1.voiceMinutes !== pkg2.voiceMinutes) {
      return false;
    }
    
    if (pkg1.smsCount !== pkg2.smsCount) {
      return false;
    }
    
    return true;
  }

  /**
   * Create a comparison key for grouping similar packages
   * Used for efficient grouping in price comparison
   */
  createComparisonKey(
    destinationId: string | null,
    regionId: string | null,
    normalized: NormalizedPackageData
  ): string {
    const locationKey = destinationId ? `dest_${destinationId}` : `region_${regionId}`;
    const dataKey = normalized.dataMb === null ? 'unlimited' : `${normalized.dataMb}mb`;
    const validityKey = `${normalized.validityDays}d`;
    const voiceKey = normalized.voiceMinutes > 0 ? `v${normalized.voiceMinutes}` : '';
    const smsKey = normalized.smsCount > 0 ? `s${normalized.smsCount}` : '';
    
    return `${locationKey}:${dataKey}:${validityKey}${voiceKey}${smsKey}`;
  }
}

// Export singleton instance
export const packageNormalizer = new PackageNormalizerService();
