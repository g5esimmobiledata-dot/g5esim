"use strict";

import { db } from "../../db";
import { destinations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { AIRALO_TERRITORY_DESTINATIONS } from "./slug-mappings";

export async function seedAiraloTerritories(): Promise<{
  added: number;
  updated: number;
  skipped: number;
}> {
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const territory of AIRALO_TERRITORY_DESTINATIONS) {
    const existing = await db.query.destinations.findFirst({
      where: eq(destinations.slug, territory.slug),
    });

    if (existing) {
      const needsUpdate =
        !existing.isTerritory ||
        existing.parentCountryCode !== territory.parentCountryCode ||
        existing.countryCode !== territory.countryCode ||
        existing.name !== territory.name;

      if (needsUpdate) {
        await db
          .update(destinations)
          .set({
            name: territory.name,
            countryCode: territory.countryCode,
            isTerritory: territory.parentCountryCode !== null,
            parentCountryCode: territory.parentCountryCode,
            active: true,
            updatedAt: new Date(),
          })
          .where(eq(destinations.id, existing.id));
        updated++;
        console.log(
          `[Territories] Updated: ${territory.name} (code: ${territory.countryCode}, parent: ${territory.parentCountryCode || "none"})`
        );
      } else {
        skipped++;
      }
      continue;
    }

    await db.insert(destinations).values({
      name: territory.name,
      slug: territory.slug,
      countryCode: territory.countryCode,
      isTerritory: territory.parentCountryCode !== null,
      parentCountryCode: territory.parentCountryCode,
      active: true,
    });

    added++;
    console.log(
      `[Territories] Added: ${territory.name} (${territory.slug}, parent: ${territory.parentCountryCode || "none"})`
    );
  }

  return { added, updated, skipped };
}
