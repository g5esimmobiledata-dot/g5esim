"use strict";

import { db } from "../../db";
import { providers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { AiraloService } from "./index";

export class AiraloSyncService {
  async syncAll() {
    const provider = await db.query.providers.findFirst({
      where: eq(providers.slug, 'airalo'),
    });

    if (!provider) {
      return {
        countries: { created: 0, updated: 0, skipped: 0, errorCount: 0, errors: [] },
        regions: { created: 0, updated: 0, skipped: 0, errorCount: 0, errors: [] },
        packages: { created: 0, updated: 0, skipped: 0, errorCount: 1, errors: ['Airalo provider not found'] },
        totalErrorCount: 1,
        totalErrors: ['Airalo provider not found'],
      };
    }

    const service = new AiraloService(provider);
    const result = await service.syncPackages();

    return {
      countries: { created: 0, updated: 0, skipped: 0, errorCount: 0, errors: [] },
      regions: { created: 0, updated: 0, skipped: 0, errorCount: 0, errors: [] },
      packages: {
        created: result.packagesSynced,
        updated: result.packagesUpdated,
        skipped: 0,
        errorCount: result.errorMessage ? 1 : 0,
        errors: result.errorMessage ? [result.errorMessage] : [],
      },
      totalErrorCount: result.errorMessage ? 1 : 0,
      totalErrors: result.errorMessage ? [result.errorMessage] : [],
    };
  }
}

export const airaloSyncService = new AiraloSyncService();
