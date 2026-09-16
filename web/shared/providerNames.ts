export const ADMIN_PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  airalo: "Airalo",
  "esim-access": "eSIM Access",
  "esim-go": "eSIM Go",
  airhub: "Airhub",
  maya: "Maya Mobile",
};

export const RESELLER_PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  airalo: "eSIM Tier 1",
  "esim-access": "eSIM Tier 2",
  "esim-go": "eSIM Tier 3",
  maya: "eSIM Tier 4",
  airhub: "eSIM Tier 5",
};

export function adminProviderDisplayName(slug?: string | null, name?: string | null) {
  return (slug && ADMIN_PROVIDER_DISPLAY_NAMES[slug]) || name || "Provider";
}

export function resellerProviderDisplayName(slug?: string | null, name?: string | null) {
  const slugDisplayName = slug && RESELLER_PROVIDER_DISPLAY_NAMES[slug];
  if (slugDisplayName) return slugDisplayName;

  const normalizedName = String(name || "").trim().toLowerCase();
  if (normalizedName === "aya esim tier 2") return "eSIM Tier 2";
  if (normalizedName === "aya esim tier 3") return "eSIM Tier 3";

  return name || "Provider";
}

export function resellerProviderAliasSlugsForSearch(search: string) {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return [];

  return Object.entries(RESELLER_PROVIDER_DISPLAY_NAMES)
    .filter(([, alias]) => alias.toLowerCase().includes(normalizedSearch))
    .map(([slug]) => slug);
}
