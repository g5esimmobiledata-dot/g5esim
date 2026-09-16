import { db } from "../../db";
import { providers, platformSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { MarginCalculation, FailoverSettings } from "./types";

export class MarginCalculator {
  private settingsCache: FailoverSettings | null = null;
  private settingsCacheTime: number = 0;
  private readonly CACHE_TTL = 60000;

  async getFailoverSettings(): Promise<FailoverSettings> {
    if (this.settingsCache && Date.now() - this.settingsCacheTime < this.CACHE_TTL) {
      return this.settingsCache;
    }

    const settings = await db.query.platformSettings.findMany({
      where: (ps, { or }) => or(
        eq(ps.key, 'smartFailoverEnabled'),
        eq(ps.key, 'defaultMinMarginPercent')
      ),
    });

    const enabledSetting = settings.find(s => s.key === 'smartFailoverEnabled');
    const marginSetting = settings.find(s => s.key === 'defaultMinMarginPercent');

    this.settingsCache = {
      enabled: enabledSetting?.value === 'true',
      defaultMinMarginPercent: marginSetting ? parseFloat(marginSetting.value) : 10,
    };
    this.settingsCacheTime = Date.now();

    return this.settingsCache;
  }

  calculateMargin(wholesalePrice: number, retailPrice: number): number {
    if (wholesalePrice <= 0 || retailPrice <= 0) {
      return 0;
    }
    return ((retailPrice - wholesalePrice) / retailPrice) * 100;
  }

  validateMargin(
    wholesalePrice: number,
    retailPrice: number,
    minimumRequired: number
  ): MarginCalculation {
    const marginPercent = this.calculateMargin(wholesalePrice, retailPrice);
    const passed = marginPercent >= minimumRequired;

    return {
      wholesalePrice,
      retailPrice,
      marginPercent: Math.round(marginPercent * 100) / 100,
      minimumRequired,
      passed,
    };
  }

  async getProviderMinMargin(providerId: string): Promise<number> {
    const provider = await db.query.providers.findFirst({
      where: eq(providers.id, providerId),
    });

    if (provider && provider.minMarginPercent) {
      return parseFloat(provider.minMarginPercent);
    }

    const settings = await this.getFailoverSettings();
    return settings.defaultMinMarginPercent;
  }

  clearCache(): void {
    this.settingsCache = null;
    this.settingsCacheTime = 0;
  }
}

export const marginCalculator = new MarginCalculator();
