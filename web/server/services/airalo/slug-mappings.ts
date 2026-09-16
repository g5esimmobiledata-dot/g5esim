"use strict";

export const AIRALO_REGION_SLUG_ALIASES: Record<string, string> = {
  "world": "global",
  "eu-plus-uk": "europe",
  "latin-america": "south-america",
  "caribbean-islands": "caribbean",
  "oceania": "australia-and-oceania",
  "antilles": "caribbean",
};

export const AIRALO_TERRITORY_DESTINATIONS = [
  {
    slug: "saint-barthelemy",
    name: "Saint Barthélemy",
    countryCode: "BL",
    parentCountryCode: "FR",
  },
  {
    slug: "macedonia",
    name: "North Macedonia",
    countryCode: "MK",
    parentCountryCode: null,
  },
  {
    slug: "marie-galante",
    name: "Marie-Galante",
    countryCode: "GP",
    parentCountryCode: "FR",
  },
  {
    slug: "puerto-rico-us",
    name: "Puerto Rico",
    countryCode: "PR",
    parentCountryCode: "US",
  },
  {
    slug: "scotland",
    name: "Scotland",
    countryCode: "GB",
    parentCountryCode: "GB",
  },
  {
    slug: "canary-islands",
    name: "Canary Islands",
    countryCode: "ES",
    parentCountryCode: "ES",
  },
  {
    slug: "madeira",
    name: "Madeira",
    countryCode: "PT",
    parentCountryCode: "PT",
  },
  {
    slug: "northern-cyprus",
    name: "Northern Cyprus",
    countryCode: "CY",
    parentCountryCode: "CY",
  },
  {
    slug: "faroe-islands",
    name: "Faroe Islands",
    countryCode: "FO",
    parentCountryCode: "DK",
  },
  {
    slug: "palestine-state-of",
    name: "Palestine",
    countryCode: "PS",
    parentCountryCode: null,
  },
  {
    slug: "azores",
    name: "Azores",
    countryCode: "PT",
    parentCountryCode: "PT",
  },
  {
    slug: "saint-martinfrench-part",
    name: "Saint Martin (French)",
    countryCode: "MF",
    parentCountryCode: "FR",
  },
  {
    slug: "democratic-republic-of-the-congo",
    name: "DR Congo",
    countryCode: "CD",
    parentCountryCode: null,
  },
  {
    slug: "sint-maartendutch-part",
    name: "Sint Maarten",
    countryCode: "SX",
    parentCountryCode: "NL",
  },
  {
    slug: "sint-eustatius",
    name: "Sint Eustatius",
    countryCode: "BQ",
    parentCountryCode: "NL",
  },
  {
    slug: "cote-divoire",
    name: "Côte d'Ivoire",
    countryCode: "CI",
    parentCountryCode: null,
  },
  {
    slug: "saba",
    name: "Saba",
    countryCode: "BQ",
    parentCountryCode: "NL",
  },
];

export function resolveAiraloSlug(
  slug: string,
  destinationsBySlug: Map<string, any>,
  regionsBySlug: Map<string, any>
): { destinationId: string | null; regionId: string | null; matched: boolean } {
  if (destinationsBySlug.has(slug)) {
    return {
      destinationId: destinationsBySlug.get(slug).id,
      regionId: null,
      matched: true,
    };
  }

  if (regionsBySlug.has(slug)) {
    return {
      destinationId: null,
      regionId: regionsBySlug.get(slug).id,
      matched: true,
    };
  }

  const aliasedRegionSlug = AIRALO_REGION_SLUG_ALIASES[slug];
  if (aliasedRegionSlug && regionsBySlug.has(aliasedRegionSlug)) {
    return {
      destinationId: null,
      regionId: regionsBySlug.get(aliasedRegionSlug).id,
      matched: true,
    };
  }

  return { destinationId: null, regionId: null, matched: false };
}
