import { eq } from "drizzle-orm";
import { db } from "server/db";
import { settings } from "@shared/schema";

const DEFAULT_BASE_URL = "https://tvpluspanel.net/api/api.php";

type TvplusSettings = {
  apiKey: string;
  baseUrl: string;
};

async function getSetting(key: string) {
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  });
  return row?.value || "";
}

async function upsertSetting(key: string, value: string, category = "iptv") {
  const existing = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  });

  if (existing) {
    const [updated] = await db
      .update(settings)
      .set({ value, category, updatedAt: new Date() })
      .where(eq(settings.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(settings)
    .values({ key, value, category })
    .returning();
  return created;
}

export async function getTvplusSettings(): Promise<TvplusSettings> {
  const apiKey = (await getSetting("tvplus_api_key")) || process.env.TVPLUS_API_KEY || "";
  const baseUrl = (await getSetting("tvplus_api_base_url")) || process.env.TVPLUS_API_BASE_URL || DEFAULT_BASE_URL;

  return {
    apiKey: apiKey.trim(),
    baseUrl: baseUrl.trim() || DEFAULT_BASE_URL,
  };
}

export async function saveTvplusSettings(input: { apiKey?: string; baseUrl?: string }) {
  if (typeof input.apiKey === "string") {
    await upsertSetting("tvplus_api_key", input.apiKey.trim());
  }
  if (typeof input.baseUrl === "string") {
    await upsertSetting("tvplus_api_base_url", input.baseUrl.trim() || DEFAULT_BASE_URL);
  }

  return getTvplusPublicSettings();
}

export async function getTvplusPublicSettings() {
  const { apiKey, baseUrl } = await getTvplusSettings();
  return {
    baseUrl,
    hasApiKey: Boolean(apiKey),
    maskedApiKey: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : "",
  };
}

function normalizeTvplusType(value: unknown) {
  const type = String(value || "").trim().toLowerCase();
  if (type === "mag" || type === "m3u" || type === "protocol") return type;
  throw new Error("TVPLUS type must be m3u, mag, or protocol");
}

function normalizeSub(value: unknown, allowDemo = false) {
  const sub = String(value || "").trim();
  const allowed = allowDemo ? ["1", "3", "6", "12", "99"] : ["1", "3", "6", "12"];
  if (!allowed.includes(sub)) {
    throw new Error(`Subscription must be one of: ${allowed.join(", ")}`);
  }
  return sub;
}

export async function tvplusRequest(params: Record<string, string | number | undefined | null>) {
  const { apiKey, baseUrl } = await getTvplusSettings();
  if (!apiKey) {
    throw new Error("TVPLUS API key is not configured");
  }

  const url = new URL(baseUrl || DEFAULT_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      url.searchParams.set(key, String(value).trim());
    }
  });
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), { method: "GET" });
  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`TVPLUS API error: ${response.status} - ${text.slice(0, 500)}`);
  }

  return data;
}

export async function getTvplusBouquets() {
  return tvplusRequest({ action: "bouquet" });
}

export async function getTvplusResellerInfo() {
  return tvplusRequest({ action: "reseller_info" });
}

export async function createTvplusDevice(input: {
  type: string;
  sub: string;
  pack: string;
  mac?: string;
  note?: string;
}) {
  const type = normalizeTvplusType(input.type);
  const sub = normalizeSub(input.sub, true);
  const pack = String(input.pack || "all").trim() || "all";

  if (type === "mag" && !String(input.mac || "").trim()) {
    throw new Error("MAC address is required for MAG devices");
  }

  return tvplusRequest({
    action: "new",
    type,
    sub,
    pack,
    mac: type === "mag" ? input.mac : undefined,
    note: input.note,
  });
}

export async function renewTvplusDevice(input: {
  type: string;
  sub: string;
  username?: string;
  password?: string;
  mac?: string;
}) {
  const type = normalizeTvplusType(input.type);
  const sub = normalizeSub(input.sub);

  if (type === "mag") {
    if (!String(input.mac || "").trim()) throw new Error("MAC address is required for MAG renew");
    return tvplusRequest({ action: "renew", type, mac: input.mac, sub });
  }

  if (!String(input.username || "").trim() || !String(input.password || "").trim()) {
    throw new Error("Username and password are required for M3U renew");
  }

  return tvplusRequest({
    action: "renew",
    type: "m3u",
    username: input.username,
    password: input.password,
    sub,
  });
}

export async function getTvplusDeviceInfo(input: {
  username?: string;
  password?: string;
  mac?: string;
}) {
  const mac = String(input.mac || "").trim();
  if (mac) return tvplusRequest({ action: "device_info", mac });

  if (!String(input.username || "").trim() || !String(input.password || "").trim()) {
    throw new Error("Enter MAC or username and password");
  }

  return tvplusRequest({
    action: "device_info",
    username: input.username,
    password: input.password,
  });
}
