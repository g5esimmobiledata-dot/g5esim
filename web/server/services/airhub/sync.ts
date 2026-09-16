"use strict";

import crypto from "crypto";
import { db } from "../../db";
import { airhubPackages, destinations, regions, type Provider } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { makeAirhubRequest } from "./api";
import { extractArray, extractValidity, firstNumber, firstString, formatDataAmount, slugify } from "./types";

function generateHash(plan: any): string {
  return crypto.createHash("md5").update(JSON.stringify(plan)).digest("hex");
}

function normalizeCountryCodes(plan: any, countryCodeByName: Map<string, string>): string[] {
  const raw =
    plan.countryCode ||
    plan.country_code ||
    plan.countryISO ||
    plan.iso ||
    plan.countries ||
    plan.countryCodes ||
    plan.countries_covered ||
    plan.coverage ||
    extractSupportedCountries(plan.additionalInfo) ||
    plan.countryName ||
    [];

  const values = Array.isArray(raw) ? raw : String(raw).split(/[,|/]/);
  return Array.from(
    new Set(
      values
        .map((item: any) => String(item).replace(/<[^>]+>/g, "").replace(/[.;]+$/g, "").trim())
        .map((item) => {
          const upper = item.toUpperCase();
          if (/^[A-Z]{2}$/.test(upper)) return upper;
          return countryCodeByName.get(item.toLowerCase()) || "";
        })
        .filter(Boolean)
    )
  );
}

function htmlToText(value: any): string {
  return String(value || "")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSupportedCountries(additionalInfo: any): string[] {
  const text = htmlToText(additionalInfo);
  const match = text.match(/Supported Countries:\s*(.+?)(?:Package Details:|$)/i);
  if (!match) return [];
  return match[1]
    .split(/[,.;|/]/)
    .map((country) => country.replace(/[.;]+$/g, "").trim())
    .filter(Boolean);
}

function parseAirhubAdditionalInfo(additionalInfo: any) {
  const text = htmlToText(additionalInfo);
  const operatorMatch = text.match(/Operates on\s+(.+?)(?:\s+network|\s+Hotspot|\s+Validity|\s+Top up|\s+APN|$)/i);
  const apnMatch = text.match(/\bAPN\s*[-:]\s*([A-Za-z0-9._-]+)/i);
  const activationMatch = text.match(/Validity starts from\s+(.+?)(?:\s+Top up|\s+APN|\s+24\/7|$)/i);
  const operator = operatorMatch?.[1]?.replace(/[.]+$/, "").trim() || "";
  const callsSegment = text.match(/Calls:\s*([^|.]+)/i)?.[1] || "";
  const callMinuteValues = Array.from(callsSegment.matchAll(/(\d+)\s*(?:mins?|minutes?)/gi))
    .map((match) => Number(match[1]))
    .filter(Number.isFinite);
  const smsMatch = text.match(/SMS:\s*(\d+)/i) || text.match(/(\d+)\s*(?:intl\s*)?SMS/i);
  const hasVoice = /\b(call|calls|voice|minutes|mins)\b/i.test(text);
  const hasSms = /\b(sms|text)\b/i.test(text);

  return {
    operator: /multi\s*-?$/i.test(operator) ? "Multi-Network" : operator,
    apnValue: apnMatch?.[1]?.trim() || "",
    activationPolicy: activationMatch?.[1]?.replace(/[.]+$/, "").trim() || "",
    hotspotSupported: /hotspot supports?/i.test(text),
    topupAvailable: /top\s*up available/i.test(text),
    voiceCredits: hasVoice ? Math.max(...callMinuteValues, 1) : 0,
    smsCredits: hasSms ? Number(smsMatch?.[1] || 1) : 0,
  };
}

async function findRegionForCoverage(coverage: string[]) {
  if (coverage.length === 0) return null;

  if (coverage.length === 1) {
    return db.query.regions.findFirst({
      where: sql`${coverage[0]} = ANY(${regions.countries})`,
    });
  }

  return db.query.regions.findFirst({
    where: sql`
      ${regions.countries} && ARRAY[
        ${sql.join(
          coverage.map((code) => sql`${code}`),
          sql`, `
        )}
      ]::text[]
    `,
  });
}

export async function syncAirhubPackages(
  provider: Provider,
  token: string,
  partnerCode: number
): Promise<{ success: boolean; packagesSynced: number; packagesUpdated: number; packagesRemoved: number; errorMessage?: string }> {
  try {
    const response = await makeAirhubRequest<any>(
      "/api/ESIM/GetPlanInformation",
      "POST",
      { partnerCode, flag: 0, countryCode: "", multiplecountrycode: [] },
      token
    );
    const plans = extractArray(response);

    if (!plans.length) {
      return {
        success: false,
        packagesSynced: 0,
        packagesUpdated: 0,
        packagesRemoved: 0,
        errorMessage: "No Airhub plans returned from GetPlanInformation",
      };
    }

    const allDestinations = await db.select().from(destinations);
    const destByCode = new Map(allDestinations.map((d) => [d.countryCode.toUpperCase(), d]));
    const countryCodeByName = new Map(allDestinations.map((d) => [d.name.toLowerCase(), d.countryCode.toUpperCase()]));
    const existingPackages = await db.select().from(airhubPackages);
    const existingByAirhubId = new Map(existingPackages.map((p) => [p.airhubId, p]));
    const processed = new Set<string>();

    let packagesSynced = 0;
    let packagesUpdated = 0;
    let skipped = 0;

    for (const plan of plans) {
      const planCode = firstString(plan, ["planCode", "plancode", "plan_code", "PlanCode", "channel_Dataplan_Id", "id", "planId"]);
      if (!planCode) {
        skipped++;
        continue;
      }

      const wholesalePrice = firstNumber(plan, ["price", "amount", "cost", "wholesalePrice", "partnerPrice", "netPrice"], 0);
      if (wholesalePrice <= 0) {
        skipped++;
        continue;
      }

      const coverage = normalizeCountryCodes(plan, countryCodeByName);
      const typeRaw = firstString(plan, ["type", "planType", "category", "regionType"]).toLowerCase();
      const titlePreview = firstString(plan, ["planName", "plan_name", "name", "packageName", "title"]);
      const type =
        typeRaw.includes("global") || /^global\b/i.test(titlePreview) ? "global" :
          typeRaw.includes("region") ? "regional" :
            coverage.length > 10 ? "global" :
              coverage.length > 1 ? "regional" : "local";

      const data = formatDataAmount(plan);
      const validity = extractValidity(plan);
      const title = firstString(
        plan,
        ["planName", "plan_name", "name", "packageName", "title"],
        `${data.label} - ${validity} Days - ${coverage.join(", ") || "Airhub"}`
      );
      const parsedDetails = parseAirhubAdditionalInfo(plan.additionalInfo);
      const operator = firstString(plan, ["operator", "network", "network_operator", "carrier", "vendor"], parsedDetails.operator || "Airhub");
      const slug = `airhub-${slugify(`${title}-${planCode}`)}`;
      const existing = existingByAirhubId.get(planCode);
      const destinationId = type === "local" && coverage.length === 1 ? destByCode.get(coverage[0])?.id || null : null;
      const region = await findRegionForCoverage(coverage);
      const travelDateRaw = firstString(plan, ["travelDate", "travel_date", "isTravelDateRequired", "travelDateRequired"]);

      const packageData = {
        providerId: provider.id,
        airhubId: planCode,
        destinationId,
        regionId: region?.id || null,
        slug,
        title,
        dataAmount: data.label,
        dataMb: data.mb,
        validity,
        wholesalePrice: wholesalePrice.toFixed(2),
        currency: firstString(plan, ["currency", "currencyCode"], "USD").toUpperCase(),
        type,
        operator,
        operatorImage: firstString(plan, ["operatorImage", "operator_image", "image", "logo"]) || null,
        coverage,
        voiceCredits: firstNumber(plan, ["voice", "voiceCredits", "voiceMinutes"], parsedDetails.voiceCredits),
        smsCredits: firstNumber(plan, ["sms", "smsCredits", "smsCount"], parsedDetails.smsCredits),
        isUnlimited: data.unlimited,
        connectivity: firstString(plan, ["connectivity", "planType", "plan_type"]) || null,
        apnValue: parsedDetails.apnValue || null,
        activationPolicy: parsedDetails.activationPolicy || null,
        hotspotSupported: parsedDetails.hotspotSupported,
        topupAvailable: parsedDetails.topupAvailable,
        additionalInfo: firstString(plan, ["additionalInfo", "additional_info"]) || null,
        validityType: firstString(plan, ["validityType", "validity_type"]) || null,
        travelDateRequired: /mandatory|required|true|1/i.test(travelDateRaw),
        dataHash: generateHash(plan),
        updatedAt: new Date(),
      };

      processed.add(planCode);

      if (existing) {
        await db.update(airhubPackages).set(packageData).where(eq(airhubPackages.id, existing.id));
        packagesUpdated++;
      } else {
        await db.insert(airhubPackages).values(packageData);
        packagesSynced++;
      }
    }

    const orphaned = existingPackages.filter((pkg) => !processed.has(pkg.airhubId));
    for (const pkg of orphaned) {
      await db.delete(airhubPackages).where(eq(airhubPackages.id, pkg.id));
    }

    console.log(`[Airhub Sync] Complete: ${packagesSynced} new, ${packagesUpdated} updated, ${orphaned.length} removed, ${skipped} skipped`);
    return { success: true, packagesSynced, packagesUpdated, packagesRemoved: orphaned.length };
  } catch (error) {
    return {
      success: false,
      packagesSynced: 0,
      packagesUpdated: 0,
      packagesRemoved: 0,
      errorMessage: error instanceof Error ? error.message : "Unknown Airhub sync error",
    };
  }
}
