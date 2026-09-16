"use strict";

export type AirhubPlan = Record<string, any>;
export type AirhubApiResponse<T = any> = T | { data?: T; result?: T; response?: T; message?: string; success?: boolean };

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function firstString(source: any, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = source?.[key];
    const text = String(value ?? "").trim();
    if (text && !/^(null|undefined|n\/a|na)$/i.test(text)) {
      return text;
    }
  }
  return fallback;
}

export function firstNumber(source: any, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = source?.[key];
    const parsed = Number.parseFloat(String(value ?? ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function extractArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of ["data", "result", "response", "getInformation", "plans", "plan", "planList", "items", "records"]) {
    const nested = value[key];
    if (Array.isArray(nested)) return nested;
    const deep = extractArray(nested);
    if (deep.length) return deep;
  }
  return [];
}

export function formatDataAmount(plan: AirhubPlan): { label: string; mb: number | null; unlimited: boolean } {
  const capacity = firstNumber(plan, ["capacity"], 0);
  const capacityUnit = firstString(plan, ["capacityUnit", "dataUnit"]).toUpperCase();
  if (capacity > 0 && capacityUnit) {
    if (capacityUnit === "GB") {
      return {
        label: `${capacity % 1 === 0 ? capacity.toFixed(0) : capacity}GB`,
        mb: Math.round(capacity * 1024),
        unlimited: false,
      };
    }
    if (capacityUnit === "MB") {
      return { label: `${Math.round(capacity)}MB`, mb: Math.round(capacity), unlimited: false };
    }
  }

  const raw = firstString(plan, ["data", "dataAmount", "data_amount", "planData", "volume", "packageData", "gb", "mb"]);
  const text = raw || firstString(plan, ["planName", "plan_name", "name", "packageName", "title"]);
  const unlimited = /unlimited/i.test(text);
  if (unlimited) return { label: "Unlimited", mb: null, unlimited: true };

  const gbMatch = text.match(/(\d+(?:\.\d+)?)\s*GB/i);
  if (gbMatch) {
    const gb = Number.parseFloat(gbMatch[1]);
    return { label: `${gb % 1 === 0 ? gb.toFixed(0) : gb}GB`, mb: Math.round(gb * 1024), unlimited: false };
  }

  const mbMatch = text.match(/(\d+(?:\.\d+)?)\s*MB/i);
  if (mbMatch) {
    const mb = Number.parseFloat(mbMatch[1]);
    return { label: `${Math.round(mb)}MB`, mb: Math.round(mb), unlimited: false };
  }

  const numeric = Number.parseFloat(text);
  if (Number.isFinite(numeric) && numeric > 0) {
    return { label: `${numeric}GB`, mb: Math.round(numeric * 1024), unlimited: false };
  }

  return { label: "Data", mb: null, unlimited: false };
}

export function extractValidity(plan: AirhubPlan): number {
  const direct = firstNumber(plan, ["validity", "vaildity", "validityDays", "validity_days", "duration", "days"], 0);
  if (direct > 0) return Math.round(direct);
  const title = firstString(plan, ["planName", "plan_name", "name", "packageName", "title"]);
  const match = title.match(/(\d+)\s*(day|days|d)\b/i);
  return match ? Number.parseInt(match[1], 10) : 1;
}
