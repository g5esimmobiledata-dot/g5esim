/**
 * Country Code Mapping Utility
 * 
 * Maps country names, slugs, and ISO codes to standardized ISO 3166-1 alpha-2 country codes.
 * Used for matching packages across different providers (Airalo, eSIM Go, eSIM Access).
 */

// ISO 3166-1 alpha-2 country codes with full names
export const COUNTRY_CODES: Record<string, { name: string; code: string }> = {
  "afghanistan": { name: "Afghanistan", code: "AF" },
  "albania": { name: "Albania", code: "AL" },
  "algeria": { name: "Algeria", code: "DZ" },
  "andorra": { name: "Andorra", code: "AD" },
  "angola": { name: "Angola", code: "AO" },
  "anguilla": { name: "Anguilla", code: "AI" },
  "antigua-and-barbuda": { name: "Antigua and Barbuda", code: "AG" },
  "argentina": { name: "Argentina", code: "AR" },
  "armenia": { name: "Armenia", code: "AM" },
  "aruba": { name: "Aruba", code: "AW" },
  "australia": { name: "Australia", code: "AU" },
  "austria": { name: "Austria", code: "AT" },
  "azerbaijan": { name: "Azerbaijan", code: "AZ" },
  "bahamas": { name: "Bahamas", code: "BS" },
  "bahrain": { name: "Bahrain", code: "BH" },
  "bangladesh": { name: "Bangladesh", code: "BD" },
  "barbados": { name: "Barbados", code: "BB" },
  "belarus": { name: "Belarus", code: "BY" },
  "belgium": { name: "Belgium", code: "BE" },
  "belize": { name: "Belize", code: "BZ" },
  "benin": { name: "Benin", code: "BJ" },
  "bermuda": { name: "Bermuda", code: "BM" },
  "bhutan": { name: "Bhutan", code: "BT" },
  "bolivia": { name: "Bolivia", code: "BO" },
  "bonaire": { name: "Bonaire", code: "BQ" },
  "bosnia-and-herzegovina": { name: "Bosnia and Herzegovina", code: "BA" },
  "botswana": { name: "Botswana", code: "BW" },
  "brazil": { name: "Brazil", code: "BR" },
  "british-virgin-islands": { name: "British Virgin Islands", code: "VG" },
  "brunei": { name: "Brunei", code: "BN" },
  "bulgaria": { name: "Bulgaria", code: "BG" },
  "burkina-faso": { name: "Burkina Faso", code: "BF" },
  "burundi": { name: "Burundi", code: "BI" },
  "cambodia": { name: "Cambodia", code: "KH" },
  "cameroon": { name: "Cameroon", code: "CM" },
  "canada": { name: "Canada", code: "CA" },
  "cape-verde": { name: "Cape Verde", code: "CV" },
  "cayman-islands": { name: "Cayman Islands", code: "KY" },
  "central-african-republic": { name: "Central African Republic", code: "CF" },
  "chad": { name: "Chad", code: "TD" },
  "chile": { name: "Chile", code: "CL" },
  "china": { name: "China", code: "CN" },
  "colombia": { name: "Colombia", code: "CO" },
  "comoros": { name: "Comoros", code: "KM" },
  "congo": { name: "Congo", code: "CG" },
  "congo-democratic-republic": { name: "Congo (DRC)", code: "CD" },
  "costa-rica": { name: "Costa Rica", code: "CR" },
  "cote-d-ivoire": { name: "Ivory Coast", code: "CI" },
  "croatia": { name: "Croatia", code: "HR" },
  "cuba": { name: "Cuba", code: "CU" },
  "curacao": { name: "Curacao", code: "CW" },
  "cyprus": { name: "Cyprus", code: "CY" },
  "czech-republic": { name: "Czech Republic", code: "CZ" },
  "czechia": { name: "Czech Republic", code: "CZ" },
  "denmark": { name: "Denmark", code: "DK" },
  "djibouti": { name: "Djibouti", code: "DJ" },
  "dominica": { name: "Dominica", code: "DM" },
  "dominican-republic": { name: "Dominican Republic", code: "DO" },
  "ecuador": { name: "Ecuador", code: "EC" },
  "egypt": { name: "Egypt", code: "EG" },
  "el-salvador": { name: "El Salvador", code: "SV" },
  "equatorial-guinea": { name: "Equatorial Guinea", code: "GQ" },
  "eritrea": { name: "Eritrea", code: "ER" },
  "estonia": { name: "Estonia", code: "EE" },
  "eswatini": { name: "Eswatini", code: "SZ" },
  "ethiopia": { name: "Ethiopia", code: "ET" },
  "fiji": { name: "Fiji", code: "FJ" },
  "finland": { name: "Finland", code: "FI" },
  "france": { name: "France", code: "FR" },
  "french-guiana": { name: "French Guiana", code: "GF" },
  "french-polynesia": { name: "French Polynesia", code: "PF" },
  "gabon": { name: "Gabon", code: "GA" },
  "gambia": { name: "Gambia", code: "GM" },
  "georgia": { name: "Georgia", code: "GE" },
  "germany": { name: "Germany", code: "DE" },
  "ghana": { name: "Ghana", code: "GH" },
  "gibraltar": { name: "Gibraltar", code: "GI" },
  "greece": { name: "Greece", code: "GR" },
  "greenland": { name: "Greenland", code: "GL" },
  "grenada": { name: "Grenada", code: "GD" },
  "guadeloupe": { name: "Guadeloupe", code: "GP" },
  "guam": { name: "Guam", code: "GU" },
  "guatemala": { name: "Guatemala", code: "GT" },
  "guernsey": { name: "Guernsey", code: "GG" },
  "guinea": { name: "Guinea", code: "GN" },
  "guinea-bissau": { name: "Guinea-Bissau", code: "GW" },
  "guyana": { name: "Guyana", code: "GY" },
  "haiti": { name: "Haiti", code: "HT" },
  "honduras": { name: "Honduras", code: "HN" },
  "hong-kong": { name: "Hong Kong", code: "HK" },
  "hungary": { name: "Hungary", code: "HU" },
  "iceland": { name: "Iceland", code: "IS" },
  "india": { name: "India", code: "IN" },
  "indonesia": { name: "Indonesia", code: "ID" },
  "iran": { name: "Iran", code: "IR" },
  "iraq": { name: "Iraq", code: "IQ" },
  "ireland": { name: "Ireland", code: "IE" },
  "isle-of-man": { name: "Isle of Man", code: "IM" },
  "israel": { name: "Israel", code: "IL" },
  "italy": { name: "Italy", code: "IT" },
  "jamaica": { name: "Jamaica", code: "JM" },
  "japan": { name: "Japan", code: "JP" },
  "jersey": { name: "Jersey", code: "JE" },
  "jordan": { name: "Jordan", code: "JO" },
  "kazakhstan": { name: "Kazakhstan", code: "KZ" },
  "kenya": { name: "Kenya", code: "KE" },
  "kiribati": { name: "Kiribati", code: "KI" },
  "kosovo": { name: "Kosovo", code: "XK" },
  "kuwait": { name: "Kuwait", code: "KW" },
  "kyrgyzstan": { name: "Kyrgyzstan", code: "KG" },
  "laos": { name: "Laos", code: "LA" },
  "latvia": { name: "Latvia", code: "LV" },
  "lebanon": { name: "Lebanon", code: "LB" },
  "lesotho": { name: "Lesotho", code: "LS" },
  "liberia": { name: "Liberia", code: "LR" },
  "libya": { name: "Libya", code: "LY" },
  "liechtenstein": { name: "Liechtenstein", code: "LI" },
  "lithuania": { name: "Lithuania", code: "LT" },
  "luxembourg": { name: "Luxembourg", code: "LU" },
  "macao": { name: "Macao", code: "MO" },
  "macau": { name: "Macau", code: "MO" },
  "madagascar": { name: "Madagascar", code: "MG" },
  "malawi": { name: "Malawi", code: "MW" },
  "malaysia": { name: "Malaysia", code: "MY" },
  "maldives": { name: "Maldives", code: "MV" },
  "mali": { name: "Mali", code: "ML" },
  "malta": { name: "Malta", code: "MT" },
  "martinique": { name: "Martinique", code: "MQ" },
  "mauritania": { name: "Mauritania", code: "MR" },
  "mauritius": { name: "Mauritius", code: "MU" },
  "mayotte": { name: "Mayotte", code: "YT" },
  "mexico": { name: "Mexico", code: "MX" },
  "moldova": { name: "Moldova", code: "MD" },
  "monaco": { name: "Monaco", code: "MC" },
  "mongolia": { name: "Mongolia", code: "MN" },
  "montenegro": { name: "Montenegro", code: "ME" },
  "montserrat": { name: "Montserrat", code: "MS" },
  "morocco": { name: "Morocco", code: "MA" },
  "mozambique": { name: "Mozambique", code: "MZ" },
  "myanmar": { name: "Myanmar", code: "MM" },
  "namibia": { name: "Namibia", code: "NA" },
  "nauru": { name: "Nauru", code: "NR" },
  "nepal": { name: "Nepal", code: "NP" },
  "netherlands": { name: "Netherlands", code: "NL" },
  "new-caledonia": { name: "New Caledonia", code: "NC" },
  "new-zealand": { name: "New Zealand", code: "NZ" },
  "nicaragua": { name: "Nicaragua", code: "NI" },
  "niger": { name: "Niger", code: "NE" },
  "nigeria": { name: "Nigeria", code: "NG" },
  "north-korea": { name: "North Korea", code: "KP" },
  "north-macedonia": { name: "North Macedonia", code: "MK" },
  "norway": { name: "Norway", code: "NO" },
  "oman": { name: "Oman", code: "OM" },
  "pakistan": { name: "Pakistan", code: "PK" },
  "palau": { name: "Palau", code: "PW" },
  "palestine": { name: "Palestine", code: "PS" },
  "panama": { name: "Panama", code: "PA" },
  "papua-new-guinea": { name: "Papua New Guinea", code: "PG" },
  "paraguay": { name: "Paraguay", code: "PY" },
  "peru": { name: "Peru", code: "PE" },
  "philippines": { name: "Philippines", code: "PH" },
  "poland": { name: "Poland", code: "PL" },
  "portugal": { name: "Portugal", code: "PT" },
  "puerto-rico": { name: "Puerto Rico", code: "PR" },
  "qatar": { name: "Qatar", code: "QA" },
  "reunion": { name: "Reunion", code: "RE" },
  "romania": { name: "Romania", code: "RO" },
  "russia": { name: "Russia", code: "RU" },
  "rwanda": { name: "Rwanda", code: "RW" },
  "saint-kitts-and-nevis": { name: "Saint Kitts and Nevis", code: "KN" },
  "saint-lucia": { name: "Saint Lucia", code: "LC" },
  "saint-martin": { name: "Saint Martin", code: "MF" },
  "saint-vincent-and-the-grenadines": { name: "Saint Vincent and the Grenadines", code: "VC" },
  "samoa": { name: "Samoa", code: "WS" },
  "san-marino": { name: "San Marino", code: "SM" },
  "sao-tome-and-principe": { name: "Sao Tome and Principe", code: "ST" },
  "saudi-arabia": { name: "Saudi Arabia", code: "SA" },
  "senegal": { name: "Senegal", code: "SN" },
  "serbia": { name: "Serbia", code: "RS" },
  "seychelles": { name: "Seychelles", code: "SC" },
  "sierra-leone": { name: "Sierra Leone", code: "SL" },
  "singapore": { name: "Singapore", code: "SG" },
  "sint-maarten": { name: "Sint Maarten", code: "SX" },
  "slovakia": { name: "Slovakia", code: "SK" },
  "slovenia": { name: "Slovenia", code: "SI" },
  "solomon-islands": { name: "Solomon Islands", code: "SB" },
  "somalia": { name: "Somalia", code: "SO" },
  "south-africa": { name: "South Africa", code: "ZA" },
  "south-korea": { name: "South Korea", code: "KR" },
  "south-sudan": { name: "South Sudan", code: "SS" },
  "spain": { name: "Spain", code: "ES" },
  "sri-lanka": { name: "Sri Lanka", code: "LK" },
  "sudan": { name: "Sudan", code: "SD" },
  "suriname": { name: "Suriname", code: "SR" },
  "sweden": { name: "Sweden", code: "SE" },
  "switzerland": { name: "Switzerland", code: "CH" },
  "syria": { name: "Syria", code: "SY" },
  "taiwan": { name: "Taiwan", code: "TW" },
  "tajikistan": { name: "Tajikistan", code: "TJ" },
  "tanzania": { name: "Tanzania", code: "TZ" },
  "thailand": { name: "Thailand", code: "TH" },
  "timor-leste": { name: "Timor-Leste", code: "TL" },
  "togo": { name: "Togo", code: "TG" },
  "tonga": { name: "Tonga", code: "TO" },
  "trinidad-and-tobago": { name: "Trinidad and Tobago", code: "TT" },
  "tunisia": { name: "Tunisia", code: "TN" },
  "turkey": { name: "Turkey", code: "TR" },
  "turkmenistan": { name: "Turkmenistan", code: "TM" },
  "turks-and-caicos-islands": { name: "Turks and Caicos Islands", code: "TC" },
  "tuvalu": { name: "Tuvalu", code: "TV" },
  "uganda": { name: "Uganda", code: "UG" },
  "ukraine": { name: "Ukraine", code: "UA" },
  "united-arab-emirates": { name: "United Arab Emirates", code: "AE" },
  "united-kingdom": { name: "United Kingdom", code: "GB" },
  "united-states": { name: "United States", code: "US" },
  "uruguay": { name: "Uruguay", code: "UY" },
  "uzbekistan": { name: "Uzbekistan", code: "UZ" },
  "vanuatu": { name: "Vanuatu", code: "VU" },
  "vatican-city": { name: "Vatican City", code: "VA" },
  "venezuela": { name: "Venezuela", code: "VE" },
  "vietnam": { name: "Vietnam", code: "VN" },
  "virgin-islands": { name: "Virgin Islands", code: "VI" },
  "yemen": { name: "Yemen", code: "YE" },
  "zambia": { name: "Zambia", code: "ZM" },
  "zimbabwe": { name: "Zimbabwe", code: "ZW" },
};

// Reverse mapping: ISO code -> country info
export const ISO_TO_COUNTRY: Record<string, { name: string; slug: string }> = {};
Object.entries(COUNTRY_CODES).forEach(([slug, info]) => {
  if (!ISO_TO_COUNTRY[info.code]) {
    ISO_TO_COUNTRY[info.code] = { name: info.name, slug };
  }
});

/**
 * Extract country code from Airalo slug
 * Example: "afghanistan-10gb-30days-sohbat-mobile" -> "AF"
 */
export function extractCountryCodeFromAiraloSlug(slug: string): { code: string | null; name: string | null } {
  // Airalo slugs start with country name: "country-name-data-days-..."
  const parts = slug.split("-");
  
  // Try matching increasing number of parts (for multi-word country names)
  for (let i = 4; i >= 1; i--) {
    const countrySlug = parts.slice(0, i).join("-");
    const countryInfo = COUNTRY_CODES[countrySlug];
    if (countryInfo) {
      return { code: countryInfo.code, name: countryInfo.name };
    }
  }
  
  return { code: null, name: null };
}

/**
 * Extract country code from eSIM Go slug
 * Example: "esim_1gb_7d_us_v2" -> "US" (from end of slug)
 * Or from coverage array: ["US"]
 */
export function extractCountryCodeFromEsimGoPackage(slug: string, coverage?: string[]): { code: string | null; name: string | null } {
  // eSIM Go local packages have country code in coverage array
  if (coverage && coverage.length === 1) {
    const code = coverage[0].toUpperCase();
    const countryInfo = ISO_TO_COUNTRY[code];
    if (countryInfo) {
      return { code, name: countryInfo.name };
    }
  }
  
  // Fallback: try extracting from slug pattern "esim_Xgb_Xd_XX_v2"
  const match = slug.match(/_([a-z]{2})(?:_v\d+)?$/i);
  if (match) {
    const code = match[1].toUpperCase();
    const countryInfo = ISO_TO_COUNTRY[code];
    if (countryInfo) {
      return { code, name: countryInfo.name };
    }
  }
  
  return { code: null, name: null };
}

/**
 * Extract country code from eSIM Access slug
 * Example: "US_1_7" -> "US"
 * Or from coverage array: ["US"]
 */
export function extractCountryCodeFromEsimAccessPackage(slug: string, coverage?: string[]): { code: string | null; name: string | null } {
  // eSIM Access local packages have country code in coverage array
  if (coverage && coverage.length === 1) {
    const code = coverage[0].toUpperCase();
    const countryInfo = ISO_TO_COUNTRY[code];
    if (countryInfo) {
      return { code, name: countryInfo.name };
    }
  }
  
  // Fallback: eSIM Access slugs start with 2-letter country code "XX_..."
  const match = slug.match(/^([A-Z]{2})_/);
  if (match) {
    const code = match[1];
    const countryInfo = ISO_TO_COUNTRY[code];
    if (countryInfo) {
      return { code, name: countryInfo.name };
    }
  }
  
  return { code: null, name: null };
}

/**
 * Extract country code from Maya package
 * Maya uses coverage array for local packages
 */
export function extractCountryCodeFromMayaPackage(slug: string, coverage?: string[]): { code: string | null; name: string | null } {
  // Maya local packages have country code in coverage array
  if (coverage && coverage.length === 1) {
    const code = coverage[0].toUpperCase();
    const countryInfo = ISO_TO_COUNTRY[code];
    if (countryInfo) {
      return { code, name: countryInfo.name };
    }
  }
  
  // Fallback: try extracting 2-letter country code from slug
  const match = slug.match(/[_-]([A-Z]{2})(?:[_-]|$)/i);
  if (match) {
    const code = match[1].toUpperCase();
    const countryInfo = ISO_TO_COUNTRY[code];
    if (countryInfo) {
      return { code, name: countryInfo.name };
    }
  }
  
  return { code: null, name: null };
}

/**
 * Parse data amount string to megabytes
 * Examples: "1 GB" -> 1024, "500 MB" -> 500, "Unlimited" -> null
 */
export function parseDataAmountToMb(dataAmount: string): number | null {
  if (!dataAmount) return null;
  
  const normalized = dataAmount.toLowerCase().trim();
  
  // Handle unlimited
  if (normalized.includes("unlimited")) {
    return null;
  }
  
  // Handle daily data (e.g., "2GB/Day") - use daily amount
  const dailyMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(gb|mb)\/day/i);
  if (dailyMatch) {
    const value = parseFloat(dailyMatch[1]);
    const unit = dailyMatch[2].toLowerCase();
    return unit === "gb" ? Math.round(value * 1024) : Math.round(value);
  }
  
  // Extract number and unit
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(gb|mb|g|m)/i);
  if (!match) return null;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  
  if (unit === "gb" || unit === "g") {
    return Math.round(value * 1024);
  }
  
  return Math.round(value);
}

/**
 * Generate package group key for matching same packages across providers
 * Format: {countryCode}_{dataMb}_{validityDays}
 */
export function generatePackageGroupKey(countryCode: string | null, dataMb: number | null, validityDays: number): string {
  const country = countryCode || "UNKNOWN";
  const data = dataMb !== null ? dataMb.toString() : "UNLIMITED";
  return `${country}_${data}_${validityDays}`;
}

/**
 * Get all unique destinations from country codes
 * Returns array of destinations ready for database insertion
 */
export function getAllDestinations(): Array<{ slug: string; name: string; countryCode: string }> {
  const destinations: Array<{ slug: string; name: string; countryCode: string }> = [];
  const seenCodes = new Set<string>();
  
  Object.entries(COUNTRY_CODES).forEach(([slug, info]) => {
    // Only add first occurrence of each country code
    if (!seenCodes.has(info.code)) {
      seenCodes.add(info.code);
      destinations.push({
        slug,
        name: info.name,
        countryCode: info.code,
      });
    }
  });
  
  return destinations.sort((a, b) => a.name.localeCompare(b.name));
}
