import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean, json, jsonb, serial, index, pgEnum, bigint, uuid, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";



// Express session store used by connect-pg-simple.
export const sessionTable = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull().$type<Record<string, unknown>>(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
}, (table) => ({
  expireIdx: index("IDX_session_expire").on(table.expire),
}));

// Users (customers) - email + OTP or password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  displayUserId: serial("display_user_id").unique(), // Sequential ID for display (UID001, UID002, etc.)
  email: text("email").notNull().unique(),
  name: text("name"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  address: text("address"),
  role: text("role").notNull().default("customer"), // customer, agent, reseller
  accountMode: text("account_mode").notNull().default("live"), // live, sandbox, demo
  hashedPassword: text("hashed_password"), // Optional - set after first OTP login
  passwordSetAt: timestamp("password_set_at"), // When password was set/changed
  lastPasswordLoginAt: timestamp("last_password_login_at"), // Last login via password
  kycStatus: text("kyc_status").notNull().default("pending"), // pending, submitted, approved, rejected
  kycSubmittedAt: timestamp("kyc_submitted_at"),
  kycReviewedAt: timestamp("kyc_reviewed_at"),
  kycReviewedBy: varchar("kyc_reviewed_by").references(() => admins.id),
  kycRejectionReason: text("kyc_rejection_reason"),
  kycVerificationRequired: boolean("kyc_verification_required").notNull().default(true),
  fcmToken: text("fcm_token"),
  imagePath: text("image_path"),
  deviceid: text("deviceid"),
  deviceType: text("device_type"), // android, ios
  deviceModel: text("device_model"),
  appVersion: text("app_version"),
  deviceManufacturer: text("device_manufacturer"),
  deviceLocation: text('device_location'),
  firebaseUid: varchar("firebase_uid").unique(),
  isFromGoogle: boolean("is_from_google").notNull().default(false),
  // Notification Preferences
  notifyLowData: boolean("notify_low_data").notNull().default(true), // Receive low data notifications
  notifyExpiring: boolean("notify_expiring").notNull().default(true), // Receive expiring package notifications
  lastLowDataNotifiedAt: timestamp("last_low_data_notified_at"),
  lastLowDataLevel: integer("last_low_data_level"), // 80, 90, 95
  currency: varchar("currency").references(() => currencyRates.id, { onDelete: "set null", onUpdate: "cascade" }), // Preferred currency
  destination: varchar("destination").references(() => destinations.id, { onDelete: "set null", onUpdate: "cascade" }), // Preferred destination for offers
  referralBalance: decimal("referral_balance", { precision: 10, scale: 2 }).notNull().default("0.00"), // Spendable referral credits
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  memberTier: text("member_tier").notNull().default("standard"), // standard, gold, platinum
  memberRewardBalance: decimal("member_reward_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  memberRewardLifetime: decimal("member_reward_lifetime", { precision: 10, scale: 2 }).notNull().default("0.00"),
  resellerSubdomain: varchar("reseller_subdomain", { length: 63 }).unique(),
  resellerStoreName: text("reseller_store_name"),
  resellerStoreTagline: text("reseller_store_tagline"),
  resellerContactEmail: text("reseller_contact_email"),
  resellerDefaultCurrency: varchar("reseller_default_currency").references(() => currencyRates.id, { onDelete: "set null", onUpdate: "cascade" }),
  resellerStoreConfig: jsonb("reseller_store_config").$type<Record<string, unknown>>(),
  resellerLogoUrl: text("reseller_logo_url"),
  resellerStoreActive: boolean("reseller_store_active").notNull().default(false),
  isBlocked: boolean("is_blocked").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// OTP codes for authentication
export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  purpose: text("purpose").notNull().default("login"), // login, password_reset
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  attempts: integer("attempts").notNull().default(0), // Track failed attempts
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


export const banners = pgTable("banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 150 }).notNull(),
  imageUrl: text("image_url").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  position: integer("position").default(1).notNull(),

  // OPTIONAL foreign key
  packageId: varchar("package_id")
    .references(() => unifiedPackages.id, {
      onDelete: "set null",   // if package deleted → keep banner but set null
      onUpdate: "cascade",
    }),

  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

// FCM Tokens - Multiple tokens per user for push notifications
export const fcmTokens = pgTable("fcm_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  deviceId: text("device_id"),
  deviceType: text("device_type"), // android, ios, web
  deviceModel: text("device_model"),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("fcm_tokens_user_id_idx").on(table.userId),
  tokenIdx: index("fcm_tokens_token_idx").on(table.token),
}));

// Admins
export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"), // admin, super_admin
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Currency Rates - Manual currency management
export const currencyRates = pgTable("currency_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // USD, EUR, GBP, etc.
  name: text("name").notNull(), // US Dollar, Euro, British Pound, etc.
  symbol: text("symbol").notNull(), // $, €, £, etc.
  conversionRate: decimal("conversion_rate", { precision: 10, scale: 6 }).notNull(), // Conversion rate to USD (base currency)
  isDefault: boolean("is_default").notNull().default(false), // Default currency for the platform
  isEnabled: boolean("is_enabled").notNull().default(true), // Enable/disable currency
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Country Code Mappings - Maps external provider codes (ISO3, etc.) to internal 2-letter codes
export const countryCodeMappings = pgTable("country_code_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalCode: text("external_code").notNull(), // External code from provider (IND, ABW, AFG, etc.)
  internalCode: text("internal_code").notNull(), // Internal 2-letter ISO code (IN, AW, AF, etc.)
  countryName: text("country_name").notNull(), // Full country name (India, Aruba, Afghanistan, etc.)
  codeType: text("code_type").notNull().default("iso3"), // Type: iso3, iso2, numeric, custom
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  externalCodeIdx: index("country_code_mappings_external_code_idx").on(table.externalCode),
  internalCodeIdx: index("country_code_mappings_internal_code_idx").on(table.internalCode),
}));

export const insertCountryCodeMappingSchema = createInsertSchema(countryCodeMappings).omit({ id: true, createdAt: true });
export type InsertCountryCodeMapping = z.infer<typeof insertCountryCodeMappingSchema>;
export type CountryCodeMapping = typeof countryCodeMappings.$inferSelect;

// Destinations (countries and territories)
export const destinations = pgTable("destinations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  airaloId: text("airalo_id").unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  countryCode: text("country_code").notNull(),
  flagEmoji: text("flag_emoji"),
  image: text("image"),
  bannerImage: text("banner_image"),
  isTerritory: boolean("is_territory").notNull().default(false), // Territories like Canary Islands, Puerto Rico
  parentCountryCode: text("parent_country_code"), // Parent country code for territories (e.g., "ES" for Canary Islands)
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Regions (multi-country packages)
export const regions = pgTable("regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  airaloId: text("airalo_id").unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  countries: text("countries").array(),
  image: text("image"),
  bannerImage: text("banner_image"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Providers (Multi-provider support)
export const providers = pgTable("providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // "Airalo", "eSIM Access", "eSIM Go"
  slug: text("slug").notNull().unique(), // "airalo", "esim-access", "esim-go"
  apiBaseUrl: text("api_base_url").notNull(), // Base URL for API calls
  enabled: boolean("enabled").notNull().default(false), // Enable/disable provider
  isPreferred: boolean("is_preferred").notNull().default(false), // Fallback provider for auto mode
  pricingMargin: decimal("pricing_margin", { precision: 5, scale: 2 }).notNull().default("15.00"), // Percentage margin (e.g., 15.00 = 15%)
  syncIntervalMinutes: integer("sync_interval_minutes").notNull().default(60), // How often to sync packages
  lastSyncAt: timestamp("last_sync_at"), // Last successful sync timestamp
  apiRateLimitPerHour: integer("api_rate_limit_per_hour").notNull().default(1000), // API rate limit
  webhookSecret: text("webhook_secret"), // Secret for validating webhooks
  failoverPriority: integer("failover_priority").notNull().default(100), // Lower = higher priority in failover (1 = first)
  minMarginPercent: decimal("min_margin_percent", { precision: 5, scale: 2 }).notNull().default("0.00"), // Minimum profit margin % required
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Provider-specific package tables for isolated storage
// Airalo Packages (renamed from packages table for multi-provider consistency)
export const airaloPackages = pgTable("airalo_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").references(() => providers.id), // References Airalo provider
  airaloId: text("airalo_id").unique().notNull(),
  destinationId: varchar("destination_id").references(() => destinations.id),
  regionId: varchar("region_id").references(() => regions.id),
  slug: text("slug").notNull().unique(), // SEO-friendly URL slug
  title: text("title").notNull(),
  dataAmount: text("data_amount").notNull(), // "1GB", "5GB", "10GB", "Unlimited"
  validity: integer("validity").notNull(), // days
  airaloPrice: decimal("airalo_price", { precision: 10, scale: 2 }), // Original Airalo price (nullable for migration)
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Customer-facing price (airaloPrice + margin)
  currency: text("currency").notNull().default("USD"),
  type: text("type").notNull(), // local, regional, global
  operator: text("operator"),
  operatorImage: text("operator_image"), // Operator logo URL from Airalo
  coverage: text("coverage").array(),
  voiceCredits: integer("voice_credits").default(0), // Voice minutes included
  smsCredits: integer("sms_credits").default(0), // SMS credits included
  isUnlimited: boolean("is_unlimited").notNull().default(false),
  active: boolean("active").notNull().default(true),
  // Admin-controlled tags and customizations
  isPopular: boolean("is_popular").notNull().default(false),
  isTrending: boolean("is_trending").notNull().default(false),
  isRecommended: boolean("is_recommended").notNull().default(false),
  isBestValue: boolean("is_best_value").notNull().default(false),
  salesCount: integer("sales_count").notNull().default(0), // Track real sales for auto-popular
  customImage: text("custom_image"), // Admin override for package image
  customDescription: text("custom_description"), // Admin-added description
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// eSIM Access Packages
export const esimAccessPackages = pgTable("esim_access_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull().references(() => providers.id),
  esimAccessId: text("esim_access_id").unique().notNull(),
  destinationId: varchar("destination_id").references(() => destinations.id),
  regionId: varchar("region_id").references(() => regions.id),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  dataAmount: text("data_amount").notNull(),
  validity: integer("validity").notNull(),
  wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  type: text("type").notNull(),
  operator: text("operator"),
  operatorImage: text("operator_image"),
  coverage: text("coverage").array(),
  voiceCredits: integer("voice_credits").default(0),
  smsCredits: integer("sms_credits").default(0),
  isUnlimited: boolean("is_unlimited").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// eSIM Go Packages
export const esimGoPackages = pgTable("esim_go_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull().references(() => providers.id),
  esimGoId: text("esim_go_id").unique().notNull(),
  destinationId: varchar("destination_id").references(() => destinations.id),
  regionId: varchar("region_id").references(() => regions.id),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  dataAmount: text("data_amount").notNull(),
  validity: integer("validity").notNull(),
  wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  type: text("type").notNull(),
  operator: text("operator"),
  operatorImage: text("operator_image"),
  coverage: text("coverage").array(),
  voiceCredits: integer("voice_credits").default(0),
  smsCredits: integer("sms_credits").default(0),
  isUnlimited: boolean("is_unlimited").notNull().default(false),
  canTopup: boolean("can_topup").notNull().default(true), // All eSIM Go packages can be used for topups
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================
// TOPUP PACKAGES - For reloading existing eSIMs
// ============================================

// Airalo Topup Packages
export const airaloTopups = pgTable("airalo_topups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").references(() => providers.id),
  airaloId: text("airalo_id").unique().notNull(),
  parentPackageId: varchar("parent_package_id").references(() => airaloPackages.id), // Link to base package
  parentOperator: text("parent_operator"), // Operator slug for matching
  destinationId: varchar("destination_id").references(() => destinations.id),
  regionId: varchar("region_id").references(() => regions.id),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  dataAmount: text("data_amount").notNull(),
  validity: integer("validity").notNull(),
  airaloPrice: decimal("airalo_price", { precision: 10, scale: 2 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  type: text("type").notNull(),
  operator: text("operator"),
  operatorImage: text("operator_image"),
  isUnlimited: boolean("is_unlimited").notNull().default(false),
  active: boolean("active").notNull().default(true),
  dataHash: text("data_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// eSIM Access Topup Packages
export const esimAccessTopups = pgTable("esim_access_topups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull().references(() => providers.id),
  esimAccessId: text("esim_access_id").unique().notNull(),
  basePackageCode: text("base_package_code").notNull(), // eSIM Access uses this code to link topups to base packages
  parentPackageId: varchar("parent_package_id").references(() => esimAccessPackages.id), // Link to base package
  destinationId: varchar("destination_id").references(() => destinations.id),
  regionId: varchar("region_id").references(() => regions.id),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  dataAmount: text("data_amount").notNull(),
  validity: integer("validity").notNull(),
  wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  type: text("type").notNull(),
  operator: text("operator"),
  operatorImage: text("operator_image"),
  isUnlimited: boolean("is_unlimited").notNull().default(false),
  active: boolean("active").notNull().default(true),
  dataHash: text("data_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// eSIM Go Topup Packages - Fetched from supported_topups of base packages
export const esimGoTopups = pgTable("esim_go_topups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull().references(() => providers.id),
  esimGoId: text("esim_go_id").unique().notNull(), // Bundle ID from eSIM Go API
  parentPackageId: varchar("parent_package_id").references(() => esimGoPackages.id), // Link to base package
  parentBundleId: text("parent_bundle_id"), // eSIM Go bundle ID of the parent package
  destinationId: varchar("destination_id").references(() => destinations.id),
  regionId: varchar("region_id").references(() => regions.id),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  dataAmount: text("data_amount").notNull(),
  validity: integer("validity").notNull(),
  wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  type: text("type").notNull(),
  operator: text("operator"),
  operatorImage: text("operator_image"),
  isUnlimited: boolean("is_unlimited").notNull().default(false),
  active: boolean("active").notNull().default(true),
  dataHash: text("data_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Maya Mobile Packages
export const mayaPackages = pgTable("maya_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull().references(() => providers.id),
  mayaId: text("maya_id").unique().notNull(), // Maya product UID
  destinationId: varchar("destination_id").references(() => destinations.id),
  regionId: varchar("region_id").references(() => regions.id),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  dataAmount: text("data_amount").notNull(), // "1GB", "5GB", "10GB", "Unlimited"
  dataMb: integer("data_mb").notNull(), // Data in MB
  dataBytes: bigint("data_bytes", { mode: "number" }), // Data in bytes (bigint for large packages)
  validity: integer("validity").notNull(), // days
  wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  type: text("type").notNull(), // local, regional, global
  operator: text("operator"), // Network/carrier name
  operatorImage: text("operator_image"), // Network logo URL
  policyId: integer("policy_id"),
  policyName: text("policy_name"),
  coverage: text("coverage").array(), // Countries enabled
  rrpUsd: text("rrp_usd"), // Recommended retail price USD
  rrpEur: text("rrp_eur"), // Recommended retail price EUR
  rrpGbp: text("rrp_gbp"), // Recommended retail price GBP
  isUnlimited: boolean("is_unlimited").notNull().default(false),
  active: boolean("active").notNull().default(true),
  dataHash: text("data_hash"), // For incremental sync
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Maya Mobile Topup Packages
export const mayaTopups = pgTable("maya_topups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull().references(() => providers.id),
  mayaId: text("maya_id").unique().notNull(), // Maya product UID
  parentPackageId: varchar("parent_package_id").references(() => mayaPackages.id),
  destinationId: varchar("destination_id").references(() => destinations.id),
  regionId: varchar("region_id").references(() => regions.id),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  dataAmount: text("data_amount").notNull(),
  dataMb: integer("data_mb").notNull(),
  validity: integer("validity").notNull(),
  wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  type: text("type").notNull(),
  operator: text("operator"), // Network/carrier name
  operatorImage: text("operator_image"), // Network logo URL
  policyId: integer("policy_id"),
  policyName: text("policy_name"),
  coverage: text("coverage").array(),
  active: boolean("active").notNull().default(true),
  dataHash: text("data_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});


// Airhub Packages
export const airhubPackages = pgTable("airhub_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull().references(() => providers.id),
  airhubId: text("airhub_id").unique().notNull(),
  destinationId: varchar("destination_id").references(() => destinations.id),
  regionId: varchar("region_id").references(() => regions.id),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  dataAmount: text("data_amount").notNull(),
  dataMb: integer("data_mb"),
  validity: integer("validity").notNull(),
  wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  type: text("type").notNull(),
  operator: text("operator"),
  operatorImage: text("operator_image"),
  coverage: text("coverage").array(),
  voiceCredits: integer("voice_credits").default(0),
  smsCredits: integer("sms_credits").default(0),
  isUnlimited: boolean("is_unlimited").notNull().default(false),
  connectivity: text("connectivity"),
  apnValue: text("apn_value"),
  activationPolicy: text("activation_policy"),
  hotspotSupported: boolean("hotspot_supported").notNull().default(false),
  topupAvailable: boolean("topup_available").notNull().default(false),
  additionalInfo: text("additional_info"),
  validityType: text("validity_type"),
  travelDateRequired: boolean("travel_date_required").notNull().default(false),
  active: boolean("active").notNull().default(true),
  dataHash: text("data_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Unified Packages View - Customer-facing catalog aggregating all provider packages
export const unifiedPackages = pgTable("unified_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull().references(() => providers.id),

  // Reference to provider-specific package (store the source table and package ID)
  providerPackageTable: text("provider_package_table").notNull(), // "airalo_packages", "esim_access_packages", "esim_go_packages"
  providerPackageId: varchar("provider_package_id").notNull(), // ID in the provider-specific table

  // Core package details (denormalized for performance)
  destinationId: varchar("destination_id").references(() => destinations.id),
  regionId: varchar("region_id").references(() => regions.id),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  dataAmount: text("data_amount").notNull(),
  validity: integer("validity").notNull(),
  type: text("type").notNull(), // local, regional, global

  // Pricing
  wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }).notNull(), // Provider's wholesale price
  retailPrice: decimal("retail_price", { precision: 10, scale: 2 }).notNull(), // Customer-facing price (wholesale + margin)
  resellerPrice: decimal("reseller_price", { precision: 10, scale: 2 }), // Reseller cost (admin price charged to reseller)
  currency: text("currency").notNull().default("USD"),

  // Provider & network info
  operator: text("operator"),
  operatorImage: text("operator_image"),
  coverage: text("coverage").array(),
  voiceCredits: integer("voice_credits").default(0),
  smsCredits: integer("sms_credits").default(0),
  isUnlimited: boolean("is_unlimited").notNull().default(false),

  // Normalized fields for cross-provider comparison
  dataMb: integer("data_mb"), // Data amount in megabytes (null for unlimited)
  validityDays: integer("validity_days").notNull(), // Same as validity, but explicitly named
  voiceMinutes: integer("voice_minutes").default(0), // Voice credits in minutes
  smsCount: integer("sms_count").default(0), // SMS credits count

  // Country/Region identification for package matching
  countryCode: text("country_code"), // ISO 2-letter country code (e.g., "US", "DE", "FR") for local packages
  countryName: text("country_name"), // Full country name for display
  packageGroupKey: text("package_group_key"), // Unique key for matching same packages: {countryCode}_{dataMb}_{validityDays}

  // Multi-provider management flags
  isEnabled: boolean("is_enabled").notNull().default(false), // Show to customers
  isBestPrice: boolean("is_best_price").notNull().default(false), // Cheapest among providers for this destination/data/validity
  manualOverride: boolean("manual_override").notNull().default(false), // Admin manually enabled/disabled (overrides auto-selection)

  // Admin-controlled tags and customizations
  isPopular: boolean("is_popular").notNull().default(false),
  isTrending: boolean("is_trending").notNull().default(false),
  isRecommended: boolean("is_recommended").notNull().default(false),
  isBestValue: boolean("is_best_value").notNull().default(false),
  salesCount: integer("sales_count").notNull().default(0), // Track real sales
  customImage: text("custom_image"), // Admin override for package image
  customDescription: text("custom_description"), // Admin-added description

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Indexes for search performance
  titleIdx: index("unified_packages_title_idx").on(table.title),
  operatorIdx: index("unified_packages_operator_idx").on(table.operator),
  retailPriceIdx: index("unified_packages_retail_price_idx").on(table.retailPrice),
  dataMbIdx: index("unified_packages_data_mb_idx").on(table.dataMb),
  validityDaysIdx: index("unified_packages_validity_days_idx").on(table.validityDays),
  destinationIdIdx: index("unified_packages_destination_id_idx").on(table.destinationId),
  regionIdIdx: index("unified_packages_region_id_idx").on(table.regionId),
  typeIdx: index("unified_packages_type_idx").on(table.type),
  isEnabledIdx: index("unified_packages_is_enabled_idx").on(table.isEnabled),
  countryCodeIdx: index("unified_packages_country_code_idx").on(table.countryCode),
  packageGroupKeyIdx: index("unified_packages_package_group_key_idx").on(table.packageGroupKey),
}));

// Per-reseller customer selling prices. The reseller's cost is derived
// from unified_packages.reseller_price, so admin-side cost updates stay live.
export const resellerPackagePrices = pgTable("reseller_package_prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resellerId: varchar("reseller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  packageId: varchar("package_id").notNull().references(() => unifiedPackages.id, { onDelete: "cascade" }),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  markupPercent: decimal("markup_percent", { precision: 6, scale: 2 }),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  resellerIdx: index("reseller_package_prices_reseller_idx").on(table.resellerId),
  packageIdx: index("reseller_package_prices_package_idx").on(table.packageId),
  uniqueResellerPackage: unique().on(table.resellerId, table.packageId),
}));

// Per-reseller provider switches. Missing rows mean the provider is enabled
// for that reseller, so existing reseller stores keep their current catalog.
export const resellerProviderSettings = pgTable("reseller_provider_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resellerId: varchar("reseller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerId: varchar("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  resellerIdx: index("reseller_provider_settings_reseller_idx").on(table.resellerId),
  providerIdx: index("reseller_provider_settings_provider_idx").on(table.providerId),
  uniqueResellerProvider: unique().on(table.resellerId, table.providerId),
}));

// Customers created or managed by a reseller. The users table remains the
// customer account source of truth; this table scopes visibility per reseller.
export const resellerCustomerLinks = pgTable("reseller_customer_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resellerId: varchar("reseller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  resellerIdx: index("reseller_customer_links_reseller_idx").on(table.resellerId),
  customerIdx: index("reseller_customer_links_customer_idx").on(table.customerId),
  uniqueResellerCustomer: unique().on(table.resellerId, table.customerId),
}));

export const rateTables = pgTable("rate_tables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  defaultMarginPercent: decimal("default_margin_percent", { precision: 6, scale: 2 }).notNull().default("0.00"),
  status: text("status").notNull().default("active"),
  createdBy: varchar("created_by").references(() => admins.id, { onDelete: "set null" }),
  ownerUserId: varchar("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
  ownerType: text("owner_type").notNull().default("admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("rate_tables_status_idx").on(table.status),
  ownerUserIdx: index("rate_tables_owner_user_idx").on(table.ownerUserId),
}));

export const rateTablePrices = pgTable("rate_table_prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rateTableId: varchar("rate_table_id").notNull().references(() => rateTables.id, { onDelete: "cascade" }),
  packageId: varchar("package_id").notNull().references(() => unifiedPackages.id, { onDelete: "cascade" }),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  marginPercent: decimal("margin_percent", { precision: 6, scale: 2 }),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  rateTableIdx: index("rate_table_prices_rate_table_idx").on(table.rateTableId),
  packageIdx: index("rate_table_prices_package_idx").on(table.packageId),
  uniqueRateTablePackage: unique().on(table.rateTableId, table.packageId),
}));

export const rateTableAssignments = pgTable("rate_table_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rateTableId: varchar("rate_table_id").notNull().references(() => rateTables.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedBy: varchar("assigned_by").references(() => admins.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  rateTableIdx: index("rate_table_assignments_rate_table_idx").on(table.rateTableId),
  userIdx: index("rate_table_assignments_user_idx").on(table.userId),
  uniqueUserRateTable: unique().on(table.userId),
}));

export const priceBrackets = pgTable("price_brackets", {
  id: uuid("id").defaultRandom().primaryKey(),
  minPrice: decimal("min_price", { precision: 10, scale: 2 }).notNull(),
  maxPrice: decimal("max_price", { precision: 10, scale: 2 }),
  packageImage: text("package_image"),
  setPrice: decimal("set_price", { precision: 10, scale: 2 }),
  productId: text("product_id").notNull(),
  currency: text("currency").notNull(),

  androidStatus: text("android_status").notNull().default("pending"),
  androidSyncError: text("android_sync_error"),
  androidLastSyncAt: timestamp("android_last_sync_at"),

  appleStatus: text("apple_status").notNull().default("pending"),
  appleSyncError: text("apple_sync_error"),
  appleLastSyncAt: timestamp("apple_last_sync_at"),

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint including productId
  uniqueCurrencyPriceRange: unique().on(
    table.currency,
    table.minPrice,
    table.maxPrice,
    table.productId
  ),
}));

// Orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  displayOrderId: serial("display_order_id").unique(), // Sequential ID for display (OID001, OID002, etc.)
  userId: varchar("user_id").references(() => users.id), // Nullable for admin-ordered eSIMs
  packageId: varchar("package_id").notNull().references(() => unifiedPackages.id),

  // Multi-Provider Support
  providerId: varchar("provider_id").references(() => providers.id), // Which provider service to use
  providerOrderId: text("provider_order_id"), // Provider's order ID (generic field for all providers)

  // Airalo Order Details (legacy - keep for backwards compatibility)
  airaloOrderId: text("airalo_order_id"), // Airalo's order ID (from single order API)
  requestId: text("request_id"), // For async orders - the request_id to track webhook
  orderType: text("order_type").notNull().default("single"), // "single" or "batch"
  quantity: integer("quantity").notNull().default(1), // Number of eSIMs in order

  // eSIM Installation Details
  iccid: text("iccid"),
  qrCode: text("qr_code"), // QR code data string (LPA format)
  qrCodeUrl: text("qr_code_url"), // Pre-generated QR code image URL from Airalo
  lpaCode: text("lpa_code"), // Full LPA string
  smdpAddress: text("smdp_address"), // SMDP+ address (e.g., "lpa.airalo.com")
  activationCode: text("activation_code"), // Matching ID for manual installation
  directAppleUrl: text("direct_apple_url"), // iOS 17.4+ universal link
  esimStatus: text("esim_status"), // "pending" | "paid" | "provisioning" | "ready" | "active" | "used_up" | "expired" |"suspended" | "canceled" | "revoked"

  // Network Configuration
  apnType: text("apn_type"), // "automatic" or "manual"
  apnValue: text("apn_value"), // APN value if manual
  isRoaming: boolean("is_roaming").default(false),

  // Order Management
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed, cancelled, refund_requested, refunded
  orderedBy: varchar("ordered_by").references(() => admins.id), // Admin who placed order (null for customer orders)
  assignedBy: varchar("assigned_by").references(() => admins.id), // Admin who assigned eSIM to customer
  webhookReceivedAt: timestamp("webhook_received_at"), // When webhook was received for async orders
  bulkOrderId: varchar("bulk_order_id"), // Enterprise bulk order this eSIM belongs to (if applicable)

  // Retry & Status Tracking
  retryCount: integer("retry_count").notNull().default(0), // Number of retry attempts
  lastRetryAt: timestamp("last_retry_at"), // Last retry timestamp
  lastStatusCheck: timestamp("last_status_check"), // Last time we checked status with Airalo
  failureReason: text("failure_reason"), // Airalo error message for failed orders

  // Pricing and Package Info
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Customer-facing price
  airaloPrice: decimal("airalo_price", { precision: 10, scale: 2 }), // What we pay to Airalo (per eSIM) - LEGACY
  wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }), // Generic wholesale price from any provider (per eSIM)
  currency: text("currency").notNull().default("USD"),
  orderCurrency: text("order_currency").notNull().default("USD"), // Currency used at time of purchase (for historical accuracy)
  resellerId: varchar("reseller_id").references(() => users.id, { onDelete: "set null" }),
  storefrontHost: text("storefront_host"),
  dataAmount: text("data_amount").notNull(),
  validity: integer("validity").notNull(),

  // Usage Tracking
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
  usageData: jsonb("usage_data"), // {used: "500MB", total: "1GB", percentage: 50}
  installationSent: boolean("installation_sent").notNull().default(false),

  // Payment Tracking
  stripePaymentIntentId: text("stripe_payment_intent_id"), // Stripe payment intent ID for this order
  paymentMethod: text("payment_method").default("card"), // card, paypal, apple_pay, google_pay, bank_transfer

  // Guest Access
  guestAccessToken: text("guest_access_token").unique(), // Unique token for guest order access via URL
  guestEmail: text("guest_email"), // Email provided during guest checkout (before user account created)
  guestPhone: text("guest_phone"), // Phone provided during guest checkout

  // Smart Failover Tracking
  originalProviderId: varchar("original_provider_id").references(() => providers.id), // Initially selected provider
  finalProviderId: varchar("final_provider_id").references(() => providers.id), // Provider that fulfilled the order
  failoverAttempts: jsonb("failover_attempts"), // Array of {providerId, timestamp, success, error, margin}
  orderSource: text("order_source").default("website"), // website, api, mobile, admin

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});



export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // 🔗 Relation
  orderId: varchar("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),

  userId: varchar("user_id").references(() => users.id), // null for guest
  guestAccessToken: text("guest_access_token"), // for guest payments

  // 💳 Gateway Info
  provider: text("provider").notNull(),
  // stripe | razorpay | paypal | paystack

  providerPaymentId: text("provider_payment_id"), // pay_xxx / pi_xxx
  providerOrderId: text("provider_order_id"), // Razorpay order_id
  providerSignature: text("provider_signature"), // Razorpay signature

  // 💰 Amount Info (MOST IMPORTANT)
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // paid amount
  currency: text("currency").notNull(), // INR / USD
  baseAmount: decimal("base_amount", { precision: 10, scale: 2 }), // order price
  baseCurrency: text("base_currency"), // USD (catalog)

  // 📌 Status
  status: text("status").notNull().default("created"),
  // created | authorized | captured | failed | refunded | partial_refund

  // 🔁 Refund Tracking
  refundedAmount: decimal("refunded_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),

  // 🧾 Metadata
  metadata: jsonb("metadata"), // gateway metadata / coupon / notes

  // 🌐 Source
  source: text("source").default("website"),
  // website | mobile | api | admin

  // 🔔 Webhook tracking
  webhookEventId: text("webhook_event_id"),
  webhookPayload: jsonb("webhook_payload"),

  // 🕒 Timestamps
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});


// Top-ups
export const topups = pgTable("topups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  displayTopupId: serial("display_topup_id").unique(), // Sequential ID for display (TID001, TID002, etc.)
  orderId: varchar("order_id").notNull().references(() => orders.id), // Original eSIM order
  userId: varchar("user_id").notNull().references(() => users.id),
  packageId: varchar("package_id").notNull().references(() => airaloPackages.id), // Top-up package
  iccid: text("iccid").notNull(), // eSIM ICCID to top-up

  // Airalo Top-up Details
  airaloTopupId: text("airalo_topup_id"), // Airalo's top-up transaction ID
  requestId: text("request_id"), // For async top-up tracking

  // Pricing
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Customer price (with margin)
  airaloPrice: decimal("airalo_price", { precision: 10, scale: 2 }), // What we pay Airalo
  currency: text("currency").notNull().default("USD"),
  dataAmount: text("data_amount").notNull(),
  validity: integer("validity").notNull(), // days

  // Status & Tracking
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  webhookReceivedAt: timestamp("webhook_received_at"),
  failureReason: text("failure_reason"),

  // Payment Tracking
  stripePaymentIntentId: text("stripe_payment_intent_id"), // Stripe payment intent ID for this top-up

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Support Tickets
// export const tickets = pgTable("tickets", {
//   id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
//   userId: varchar("user_id").notNull().references(() => users.id),
//   orderId: varchar("order_id").references(() => orders.id),
//   subject: text("subject").notNull(),
//   message: text("message").notNull(),
//   status: text("status").notNull().default("open"), // open, in_progress, resolved, closed
//   priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
//   createdAt: timestamp("created_at").notNull().defaultNow(),
//   updatedAt: timestamp("updated_at").notNull().defaultNow(),
// });

// Ticket Replies
export const ticketReplies = pgTable("ticket_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id),
  userId: varchar("user_id").references(() => users.id),
  adminId: varchar("admin_id").references(() => admins.id),
  message: text("message").notNull(),
  isInternal: boolean("is_internal").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --------------------
// Enums
// --------------------
export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent",
  "normal",
]);

// --------------------
// Tickets Table
// --------------------
export const tickets = pgTable("tickets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  title: text("title").notNull(),
  description: text("description").notNull(),

  status: ticketStatusEnum("status")
    .notNull()
    .default("open"),

  priority: ticketPriorityEnum("priority")
    .notNull()
    .default("medium"),

  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  userName: text("user_name").notNull(),  // cached user name

  // Admin assignment fields
  assignedToId: varchar("assigned_to_id")
    .references(() => admins.id, { onDelete: "set null" }),

  assignedToName: text("assigned_to_name"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),

  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
});

// --------------------
// Ticket Messages Table
// --------------------
export const ticketMessages = pgTable("ticket_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  ticketId: varchar("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),

  senderId: varchar("sender_id").notNull(),
  senderType: text("sender_type").notNull(), // user | admin | superadmin
  senderName: text("sender_name").notNull(),

  message: text("message").notNull(),

  isInternal: boolean("is_internal")
    .notNull()
    .default(false),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});


// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: text("type").notNull(), // otp, welcome, purchase, installation, topup, expiring, expired, ticket_reply
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Email Templates
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: varchar("event_type", { length: 50 }).notNull().unique(), // welcome, esim_purchased, topup_purchased, low_data_75, low_data_90, expiring_3days, expiring_1day, custom
  name: text("name").notNull(), // Human-readable name
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  variables: text("variables").array().notNull().default(sql`'{}'::text[]`), // Available variables like customer_name, esim_iccid, etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Settings
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  category: text("category").notNull(), // general, seo, airalo, smtp, timezone
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// IPTV settings and provider sync tables are also created defensively by
// server/services/iptv-service.ts; keeping them here prevents drizzle push
// from treating live IPTV data as unmanaged tables to drop.
export const iptvSettings = pgTable("iptv_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const iptvPackages = pgTable("iptv_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tvplusPackageId: text("tvplus_package_id").notNull().unique("iptv_packages_tvplus_package_id_key"),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  prices: jsonb("prices").notNull().default(sql`'{}'::jsonb`),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const iptvOrders = pgTable("iptv_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  packageId: varchar("package_id").references(() => iptvPackages.id, { onDelete: "set null" }),
  tvplusUserId: text("tvplus_user_id"),
  deviceType: text("device_type").notNull(),
  subscriptionMonths: integer("subscription_months").notNull(),
  subscriptionTermType: text("subscription_term_type").notNull().default("months"),
  subscriptionHours: integer("subscription_hours"),
  subscriptionLabel: text("subscription_label"),
  status: text("status").notNull().default("pending"),
  username: text("username"),
  password: text("password"),
  macAddress: text("mac_address"),
  portalUrl: text("portal_url"),
  m3uUrl: text("m3u_url"),
  protocolCode: text("protocol_code"),
  customerNote: text("customer_note"),
  adminNote: text("admin_note"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0.00"),
  currency: text("currency").notNull().default("USD"),
  providerResponse: jsonb("provider_response").notNull().default(sql`'{}'::jsonb`),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("iptv_orders_user_id_idx").on(table.userId),
  statusIdx: index("iptv_orders_status_idx").on(table.status),
  deviceTypeIdx: index("iptv_orders_device_type_idx").on(table.deviceType),
}));

export const iptvChannels = pgTable("iptv_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  name: text("name").notNull(),
  countryCode: text("country_code").notNull().default(""),
  category: text("category").notNull().default(""),
  language: text("language").notNull().default(""),
  quality: text("quality").notNull().default(""),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  providerExternalIdUnique: unique("iptv_channels_provider_external_id_key").on(table.provider, table.externalId),
  providerIdx: index("iptv_channels_provider_idx").on(table.provider),
  activeIdx: index("iptv_channels_active_idx").on(table.active),
}));


/* ---------------- CONTACT MESSAGES ---------------- */

export const contactStatusEnum = pgEnum("contact_status", [
  "new",
  "read",
  "replied",
  "closed",
]);

export const contactMessages = pgTable("contact_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  name: varchar("name", { length: 120 }).notNull(),

  email: varchar("email", { length: 180 }).notNull(),

  subject: varchar("subject", { length: 250 }).notNull(),

  message: text("message").notNull(),

  /* ---------------- STATUS TRACKING ---------------- */
  status: contactStatusEnum("status").default("new"),

  /* ---------------- SPAM / SECURITY ---------------- */
  isSpam: boolean("is_spam").default(false),

  ipAddress: varchar("ip_address", { length: 100 }),

  userAgent: text("user_agent"),

  /* ---------------- ADMIN ---------------- */
  adminNotes: text("admin_notes"),

  repliedAt: timestamp("replied_at"),

  /* ---------------- TIMESTAMPS ---------------- */
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow(),
});


// Platform Settings - Marketplace and package management configuration
export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // Setting identifier
  value: text("value").notNull(), // Setting value (JSON string for complex values)
  description: text("description"), // Human-readable description of the setting
  category: text("category").notNull().default("general"), // Category: marketplace, packages, pricing, general
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: varchar("updated_by").references(() => admins.id), // Admin who last updated
});

// Custom Pages (Privacy Policy, Terms, etc.)
export const pages = pgTable("pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// KYC Documents
export const kycDocuments = pgTable("kyc_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentType: text("document_type").notNull(), // passport, national_id, drivers_license, proof_of_address
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Activity Logs
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  adminId: varchar("admin_id").references(() => admins.id),
  action: text("action").notNull(), // login, logout, profile_update, order_created, order_cancelled, topup_created, kyc_submitted, kyc_approved, kyc_rejected, ticket_created, ticket_updated
  entity: text("entity"), // user, order, topup, ticket, kyc
  entityId: varchar("entity_id"),
  metadata: jsonb("metadata"), // Additional context about the action
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Provider Webhooks (Generic webhook event logs for all providers)
export const providerWebhooks = pgTable("provider_webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // low_data, order_complete, order_status, etc.
  iccid: text("iccid"), // Related eSIM ICCID for low_data notifications
  orderId: varchar("order_id").references(() => orders.id), // Related order if applicable
  userId: varchar("user_id").references(() => users.id), // Related user if applicable
  threshold: text("threshold"), // For low_data: "75_percent", "90_percent", "3_days", "1_day"
  webhookPayload: jsonb("webhook_payload").notNull(), // Full webhook payload from provider
  signature: text("signature"), // Webhook signature for validation
  processed: boolean("processed").notNull().default(false), // Whether notification was processed
  emailSent: boolean("email_sent").notNull().default(false), // Whether customer email was sent
  inAppNotificationSent: boolean("in_app_notification_sent").notNull().default(false), // Whether in-app notification was sent
  errorMessage: text("error_message"), // If processing failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Airalo Notifications (Webhook event logs) - DEPRECATED: Use providerWebhooks instead
export const airaloNotifications = pgTable("airalo_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // low_data, credit_limit, async_order
  iccid: text("iccid"), // Related eSIM ICCID for low_data notifications
  orderId: varchar("order_id").references(() => orders.id), // Related order if applicable
  userId: varchar("user_id").references(() => users.id), // Related user if applicable
  threshold: text("threshold"), // For low_data: "75_percent", "90_percent", "3_days", "1_day"
  webhookPayload: jsonb("webhook_payload").notNull(), // Full webhook payload from Airalo
  signature: text("signature"), // airalo-signature header for validation
  processed: boolean("processed").notNull().default(false), // Whether notification was processed
  emailSent: boolean("email_sent").notNull().default(false), // Whether customer email was sent
  errorMessage: text("error_message"), // If processing failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Custom Notifications (Admin-sent emails)
export const customNotifications = pgTable("custom_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  recipientType: varchar("recipient_type", { length: 20 }).notNull(), // 'all' or 'single'
  recipientUserId: varchar("recipient_user_id"),
  sentBy: varchar("sent_by").notNull(), // admin ID
  emailsSent: integer("emails_sent").default(0),
  emailsFailed: integer("emails_failed").default(0),
  status: varchar("status", { length: 20 }).default("pending"), // pending, sending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
});

// Package Reviews
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packageId: varchar("package_id").notNull().references(() => unifiedPackages.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  orderId: varchar("order_id").references(() => orders.id), // Optional: verify purchase
  rating: integer("rating").notNull(), // 1-5 stars
  title: text("title").notNull(),
  comment: text("comment").notNull(),
  pros: text("pros").array(), // Array of positive points
  cons: text("cons").array(), // Array of negative points
  isVerifiedPurchase: boolean("is_verified_purchase").notNull().default(false),
  isApproved: boolean("is_approved").notNull().default(false), // Moderation
  approvedBy: varchar("approved_by").references(() => admins.id),
  approvedAt: timestamp("approved_at"),
  helpfulCount: integer("helpful_count").notNull().default(0), // Users who found review helpful
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  packageIdIdx: index("reviews_package_id_idx").on(table.packageId),
  userIdIdx: index("reviews_user_id_idx").on(table.userId),
  ratingIdx: index("reviews_rating_idx").on(table.rating),
  isApprovedIdx: index("reviews_is_approved_idx").on(table.isApproved),
}));

// Referral Program
export const referralProgram = pgTable("referral_program", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  referralCode: text("referral_code").notNull().unique(),
  totalReferrals: integer("total_referrals").notNull().default(0),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("referral_program_user_id_idx").on(table.userId),
  referralCodeIdx: index("referral_program_code_idx").on(table.referralCode),
}));

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  referredId: varchar("referred_id").notNull().references(() => users.id),
  referralCode: text("referral_code").notNull(),
  status: text("status").notNull().default("pending"),
  rewardAmount: decimal("reward_amount", { precision: 10, scale: 2 }),
  rewardPaid: boolean("reward_paid").notNull().default(false),
  referredOrderId: varchar("referred_order_id").references(() => orders.id),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  referrerIdIdx: index("referrals_referrer_id_idx").on(table.referrerId),
  referredIdIdx: index("referrals_referred_id_idx").on(table.referredId),
  statusIdx: index("referrals_status_idx").on(table.status),
}));

export const referralSettings = pgTable("referral_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enabled: boolean("enabled").notNull().default(true),
  rewardType: text("reward_type").notNull().default("percentage"),
  rewardValue: decimal("reward_value", { precision: 10, scale: 2 }).notNull().default("10.00"),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  referredUserDiscount: decimal("referred_user_discount", { precision: 10, scale: 2 }).notNull().default("5.00"),
  expiryDays: integer("expiry_days").notNull().default(90),
  termsAndConditions: text("terms_and_conditions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Referral Credit Transactions - Track credit earnings and redemptions
export const referralTransactions = pgTable("referral_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // credit_earned, credit_used, credit_expired, credit_adjusted
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  referralId: varchar("referral_id").references(() => referrals.id), // For credit_earned transactions
  orderId: varchar("order_id").references(() => orders.id), // For credit_used transactions
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("referral_transactions_user_id_idx").on(table.userId),
  typeIdx: index("referral_transactions_type_idx").on(table.type),
  orderIdIdx: index("referral_transactions_order_id_idx").on(table.orderId),
}));

export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  featuredImage: text("featured_image"),
  authorId: varchar("author_id").references(() => admins.id),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: index("blog_posts_slug_idx").on(table.slug),
  publishedIdx: index("blog_posts_published_idx").on(table.published),
}));

// Enterprise Accounts
export const enterpriseAccounts = pgTable("enterprise_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  billingAddress: text("billing_address"),
  taxId: text("tax_id"),
  status: text("status").notNull().default("pending"),
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }).default("0.00"),
  currentBalance: decimal("current_balance", { precision: 10, scale: 2 }).default("0.00"),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0.00"),
  userId: varchar("user_id").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => admins.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("enterprise_accounts_email_idx").on(table.email),
  statusIdx: index("enterprise_accounts_status_idx").on(table.status),
}));

export const bulkQuotes = pgTable("bulk_quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enterpriseAccountId: varchar("enterprise_account_id").references(() => enterpriseAccounts.id),
  packageId: varchar("package_id").references(() => unifiedPackages.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0.00"),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  validUntil: timestamp("valid_until").notNull(),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  enterpriseIdIdx: index("bulk_quotes_enterprise_id_idx").on(table.enterpriseAccountId),
  statusIdx: index("bulk_quotes_status_idx").on(table.status),
}));

export const bulkOrders = pgTable("bulk_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enterpriseAccountId: varchar("enterprise_account_id").references(() => enterpriseAccounts.id),
  quoteId: varchar("quote_id").references(() => bulkQuotes.id),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").default("pending"),
  invoiceNumber: text("invoice_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  enterpriseIdIdx: index("bulk_orders_enterprise_id_idx").on(table.enterpriseAccountId),
  statusIdx: index("bulk_orders_status_idx").on(table.status),
}));

// Enterprise Users - Portal login credentials
// Security: passwordHash stored with bcrypt (cost ≥12), totpSecret encrypted with AES-256-GCM before storage
// Constraints: role must be 'owner' or 'member' (enforced via Zod + SQL CHECK)
// Constraints: only one owner per enterprise account (enforced via partial unique index)
export const enterpriseUsers = pgTable("enterprise_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enterpriseAccountId: varchar("enterprise_account_id").notNull().references(() => enterpriseAccounts.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // bcrypt hashed, cost ≥12
  role: text("role").notNull().default("member").$type<"owner" | "member">(),
  name: text("name"),
  totpSecret: text("totp_secret"), // AES-256-GCM encrypted before storage
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  lastPasswordChangeAt: timestamp("last_password_change_at"),
  createdBy: varchar("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("enterprise_users_email_idx").on(table.email),
  accountIdIdx: index("enterprise_users_account_id_idx").on(table.enterpriseAccountId),
  coveringIdx: index("enterprise_users_covering_idx").on(table.enterpriseAccountId, table.role, table.isActive),
}));

export const enterpriseSessions = pgTable("enterprise_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enterpriseUserId: varchar("enterprise_user_id").notNull().references(() => enterpriseUsers.id),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  revokedAt: timestamp("revoked_at"),
}, (table) => ({
  userIdIdx: index("enterprise_sessions_user_id_idx").on(table.enterpriseUserId),
}));

// External API Keys - For partner integrations and mobile apps
// Security: apiKeyHash stores SHA-256 hash of full API key, apiSecretHash stores bcrypt hash of secret
// Keys are shown only once at creation, then only prefix is visible for identification
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Friendly name for the API key
  apiKeyPrefix: text("api_key_prefix").notNull(), // First 8 chars for identification (e.g., "sk_live_Ab")
  apiKeyHash: text("api_key_hash").notNull().unique(), // SHA-256 hash of full API key
  apiSecretHash: text("api_secret_hash").notNull(), // bcrypt hash of API secret
  enterpriseId: varchar("enterprise_id").references(() => enterpriseAccounts.id), // Link to enterprise account (optional)
  isActive: boolean("is_active").notNull().default(true),
  rateLimit: integer("rate_limit").notNull().default(100), // Requests per minute
  permissions: jsonb("permissions").default({}), // {orders: true, packages: true, refunds: false}
  allowedIps: text("allowed_ips").array(), // IP whitelist (optional)
  lastUsedAt: timestamp("last_used_at"),
  requestCount: integer("request_count").notNull().default(0), // Total requests made
  expiresAt: timestamp("expires_at"), // Optional expiration date
  createdBy: varchar("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  prefixIdx: index("api_keys_prefix_idx").on(table.apiKeyPrefix),
  hashIdx: index("api_keys_hash_idx").on(table.apiKeyHash),
  enterpriseIdx: index("api_keys_enterprise_idx").on(table.enterpriseId),
}));

// Enterprise Order Allocations - Track eSIM distribution to employees
// Security: downloadToken is SHA-256 hashed before storage, expires in 7 days
// Constraints: status must be valid enum value (enforced via Zod + SQL CHECK)
// Constraints: distribution_method must be valid enum or null (enforced via Zod + SQL CHECK)
export const enterpriseOrderAllocations = pgTable("enterprise_order_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bulkOrderId: varchar("bulk_order_id").notNull().references(() => bulkOrders.id),
  orderId: varchar("order_id").notNull().unique().references(() => orders.id), // 1:1 mapping
  employeeEmail: text("employee_email").notNull(),
  employeeName: text("employee_name"),
  status: text("status").notNull().default("allocated").$type<"allocated" | "email_sent" | "downloaded" | "activated" | "revoked">(),
  distributionMethod: text("distribution_method").$type<"email" | "export" | "download">(),
  sentAt: timestamp("sent_at"),
  downloadedAt: timestamp("downloaded_at"),
  downloadToken: text("download_token"), // SHA-256 hashed, 32-byte random token
  tokenExpiresAt: timestamp("token_expires_at"), // 7-day expiry
  allocatedBy: varchar("allocated_by").references(() => enterpriseUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  bulkOrderIdIdx: index("enterprise_allocations_bulk_order_idx").on(table.bulkOrderId),
  orderIdIdx: index("enterprise_allocations_order_idx").on(table.orderId),
  statusIdx: index("enterprise_allocations_status_idx").on(table.status),
  bulkOrderStatusIdx: index("enterprise_allocations_bulk_order_status_idx").on(table.bulkOrderId, table.status),
}));

// Gift Cards & Vouchers
export const giftCards = pgTable("gift_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  purchasedBy: varchar("purchased_by").references(() => users.id),
  recipientEmail: text("recipient_email"),
  recipientName: text("recipient_name"),
  message: text("message"),
  theme: text("theme").default("default"), // Card design theme: default, birthday, holiday, travel, etc.
  deliveryDate: timestamp("delivery_date"), // Scheduled delivery date (null = immediate)
  deliverySent: boolean("delivery_sent").notNull().default(false), // Has delivery email been sent
  status: text("status").notNull().default("active"), // active, used, expired, cancelled
  expiresAt: timestamp("expires_at"),
  redeemedBy: varchar("redeemed_by").references(() => users.id),
  redeemedAt: timestamp("redeemed_at"),
  purchaseOrderId: varchar("purchase_order_id").references(() => orders.id),
  createdByAdmin: varchar("created_by_admin").references(() => admins.id), // Admin-created gift card
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  codeIdx: index("gift_cards_code_idx").on(table.code),
  statusIdx: index("gift_cards_status_idx").on(table.status),
  purchasedByIdx: index("gift_cards_purchased_by_idx").on(table.purchasedBy),
  deliveryDateIdx: index("gift_cards_delivery_date_idx").on(table.deliveryDate),
}));

// Gift Card Transactions - Track partial redemptions
export const giftCardTransactions = pgTable("gift_card_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  giftCardId: varchar("gift_card_id").notNull().references(() => giftCards.id),
  orderId: varchar("order_id").references(() => orders.id),
  amountUsed: decimal("amount_used", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  usedBy: varchar("used_by").references(() => users.id),
  usedAt: timestamp("used_at").notNull().defaultNow(),
}, (table) => ({
  giftCardIdIdx: index("gift_card_transactions_gift_card_id_idx").on(table.giftCardId),
  orderIdIdx: index("gift_card_transactions_order_id_idx").on(table.orderId),
}));

export const voucherCodes = pgTable("voucher_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  seriesCode: text("series_code"),
  serialNumber: text("serial_number").unique(),
  batchName: text("batch_name"),
  assignedRole: text("assigned_role").notNull().default("all"), // all, agent, reseller
  assignedUserId: varchar("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // 'percentage' or 'fixed'
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minPurchaseAmount: decimal("min_purchase_amount", { precision: 10, scale: 2 }).default("0.00"),
  maxDiscountAmount: decimal("max_discount_amount", { precision: 10, scale: 2 }), // Cap for percentage discounts
  maxUses: integer("max_uses"), // Overall usage limit
  perUserLimit: integer("per_user_limit").default(1), // Per-user usage limit
  currentUses: integer("current_uses").notNull().default(0),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  status: text("status").notNull().default("active"), // active, inactive, expired
  description: text("description"),
  targetCountries: text("target_countries").array(), // Restrict to specific country codes
  targetRegions: text("target_regions").array(), // Restrict to specific region slugs
  targetPackages: text("target_packages").array(), // Restrict to specific package IDs
  firstTimeOnly: boolean("first_time_only").notNull().default(false), // Only for new customers
  isStackable: boolean("is_stackable").notNull().default(false), // Can combine with other offers
  createdBy: varchar("created_by").references(() => admins.id),
  createdByUser: varchar("created_by_user").references(() => users.id, { onDelete: "set null" }),
  qrCode: text("qr_code"),
  qrPayload: text("qr_payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  codeIdx: index("voucher_codes_code_idx").on(table.code),
  seriesCodeIdx: index("voucher_codes_series_code_idx").on(table.seriesCode),
  assignedRoleIdx: index("voucher_codes_assigned_role_idx").on(table.assignedRole),
  assignedUserIdx: index("voucher_codes_assigned_user_idx").on(table.assignedUserId),
  statusIdx: index("voucher_codes_status_idx").on(table.status),
}));

export const voucherUsage = pgTable("voucher_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  voucherId: varchar("voucher_id").references(() => voucherCodes.id),
  userId: varchar("user_id").references(() => users.id),
  orderId: varchar("order_id").references(() => orders.id),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp("used_at").notNull().defaultNow(),
}, (table) => ({
  voucherIdIdx: index("voucher_usage_voucher_id_idx").on(table.voucherId),
  userIdIdx: index("voucher_usage_user_id_idx").on(table.userId),
}));

export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // payment_topup, voucher_redeem, voucher_debit, purchase_debit, refund, refund_debit, registration_bonus, sandbox_topup, adjustment
  status: text("status").notNull().default("pending"), // pending, completed, failed, cancelled
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull().default("0.00"),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull().default("0.00"),
  provider: text("provider"), // stripe, paypal, voucher, admin
  providerPaymentId: text("provider_payment_id"),
  paymentGatewayId: uuid("payment_gateway_id").references(() => paymentGateways.id, { onDelete: "set null" }),
  voucherId: varchar("voucher_id").references(() => voucherCodes.id, { onDelete: "set null" }),
  referenceId: text("reference_id"),
  description: text("description"),
  metadata: jsonb("metadata").default({}),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("wallet_transactions_user_id_idx").on(table.userId),
  statusIdx: index("wallet_transactions_status_idx").on(table.status),
  typeIdx: index("wallet_transactions_type_idx").on(table.type),
  providerPaymentIdIdx: index("wallet_transactions_provider_payment_id_idx").on(table.providerPaymentId),
  voucherIdIdx: index("wallet_transactions_voucher_id_idx").on(table.voucherId),
}));

export const conciergeSubscriptions = pgTable("concierge_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("inactive"), // inactive, trial_active, active, pending_payment, past_due, expired
  pricingMode: text("pricing_mode").notNull().default("free"), // free, paid
  billingCycle: text("billing_cycle").notNull().default("one_time"), // one_time, monthly
  paymentMethod: text("payment_method"), // wallet, other, free_trial
  fee: decimal("fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  currency: text("currency").notNull().default("USD"),
  trialRequestedAt: timestamp("trial_requested_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  activeFrom: timestamp("active_from"),
  activeUntil: timestamp("active_until"),
  nextChargeAt: timestamp("next_charge_at"),
  lastChargedAt: timestamp("last_charged_at"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("concierge_subscriptions_user_id_idx").on(table.userId),
  statusIdx: index("concierge_subscriptions_status_idx").on(table.status),
  nextChargeIdx: index("concierge_subscriptions_next_charge_at_idx").on(table.nextChargeAt),
}));

export const userSipAccounts = pgTable("user_sip_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  domain: text("domain").notNull(),
  uri: text("uri").notNull(),
  status: text("status").notNull().default("active"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("user_sip_accounts_user_id_idx").on(table.userId),
  usernameIdx: index("user_sip_accounts_username_idx").on(table.username),
  statusIdx: index("user_sip_accounts_status_idx").on(table.status),
}));

export const sipTariffs = pgTable("sip_tariffs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  tariffType: text("tariff_type").notNull().default("internal"), // internal, international
  description: text("description"),
  currency: text("currency").notNull().default("USD"),
  connectionFee: decimal("connection_fee", { precision: 10, scale: 4 }).notNull().default("0.0000"),
  ratePerMinute: decimal("rate_per_minute", { precision: 10, scale: 4 }).notNull().default("0.0000"),
  billingIncrementSeconds: integer("billing_increment_seconds").notNull().default(60),
  status: text("status").notNull().default("active"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  typeIdx: index("sip_tariffs_type_idx").on(table.tariffType),
  statusIdx: index("sip_tariffs_status_idx").on(table.status),
}));

export const sipRateGroups = pgTable("sip_rate_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("sip_rate_groups_status_idx").on(table.status),
}));

export const sipRegistrationProfiles = pgTable("sip_registration_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  isDefault: boolean("is_default").notNull().default(false),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("sip_registration_profiles_status_idx").on(table.status),
  defaultIdx: index("sip_registration_profiles_is_default_idx").on(table.isDefault),
}));

export const virtualNumberApplications = pgTable("virtual_number_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("vonage"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, fulfilled
  countryCode: text("country_code").notNull(),
  desiredNumber: text("desired_number"),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("virtual_number_applications_user_id_idx").on(table.userId),
  statusIdx: index("virtual_number_applications_status_idx").on(table.status),
  providerIdx: index("virtual_number_applications_provider_idx").on(table.provider),
}));

export const userVirtualNumbers = pgTable("user_virtual_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("vonage"),
  msisdn: text("msisdn").notNull().unique(),
  countryCode: text("country_code").notNull(),
  status: text("status").notNull().default("active"), // active, pending, suspended, released
  capabilities: jsonb("capabilities").default({}),
  webhookUrl: text("webhook_url"),
  applicationId: varchar("application_id").references(() => virtualNumberApplications.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").default({}),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  releasedAt: timestamp("released_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("user_virtual_numbers_user_id_idx").on(table.userId),
  msisdnIdx: index("user_virtual_numbers_msisdn_idx").on(table.msisdn),
  statusIdx: index("user_virtual_numbers_status_idx").on(table.status),
}));

export const virtualNumberInventory = pgTable("virtual_number_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull().default("vonage"),
  msisdn: text("msisdn").notNull().unique(),
  countryCode: text("country_code").notNull(),
  status: text("status").notNull().default("available"), // available, assigned, reserved, archived
  isPremium: boolean("is_premium").notNull().default(false),
  providerSetupCost: decimal("provider_setup_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  providerMonthlyCost: decimal("provider_monthly_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  providerInboundCost: decimal("provider_inbound_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  providerOutboundCost: decimal("provider_outbound_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  providerSmsCost: decimal("provider_sms_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  providerMmsCost: decimal("provider_mms_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  providerVoiceCost: decimal("provider_voice_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  setupFee: decimal("setup_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  inboundFee: decimal("inbound_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  outboundFee: decimal("outbound_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  smsFee: decimal("sms_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  mmsFee: decimal("mms_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  voiceFee: decimal("voice_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  capabilities: jsonb("capabilities").default({}),
  notes: text("notes"),
  assignedUserId: varchar("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
  assignedVirtualNumberId: varchar("assigned_virtual_number_id").references(() => userVirtualNumbers.id, { onDelete: "set null" }),
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  msisdnIdx: index("virtual_number_inventory_msisdn_idx").on(table.msisdn),
  countryIdx: index("virtual_number_inventory_country_code_idx").on(table.countryCode),
  statusIdx: index("virtual_number_inventory_status_idx").on(table.status),
  premiumIdx: index("virtual_number_inventory_is_premium_idx").on(table.isPremium),
  assignedUserIdx: index("virtual_number_inventory_assigned_user_id_idx").on(table.assignedUserId),
}));

export const virtualSmsMessages = pgTable("virtual_sms_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  virtualNumberId: varchar("virtual_number_id").notNull().references(() => userVirtualNumbers.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("vonage"),
  direction: text("direction").notNull(), // inbound, outbound
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  text: text("text").notNull(),
  providerMessageId: text("provider_message_id"),
  status: text("status").notNull().default("received"), // queued, sent, delivered, received, failed
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("virtual_sms_messages_user_id_idx").on(table.userId),
  virtualNumberIdx: index("virtual_sms_messages_virtual_number_id_idx").on(table.virtualNumberId),
  directionIdx: index("virtual_sms_messages_direction_idx").on(table.direction),
  providerMessageIdx: index("virtual_sms_messages_provider_message_id_idx").on(table.providerMessageId),
}));

export const virtualVoiceCalls = pgTable("virtual_voice_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  virtualNumberId: varchar("virtual_number_id").notNull().references(() => userVirtualNumbers.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("vonage"),
  direction: text("direction").notNull().default("outbound"), // inbound, outbound
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  status: text("status").notNull().default("session_created"),
  providerCallId: text("provider_call_id"),
  conversationId: text("conversation_id"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("virtual_voice_calls_user_id_idx").on(table.userId),
  virtualNumberIdx: index("virtual_voice_calls_virtual_number_id_idx").on(table.virtualNumberId),
  directionIdx: index("virtual_voice_calls_direction_idx").on(table.direction),
  statusIdx: index("virtual_voice_calls_status_idx").on(table.status),
  providerCallIdx: index("virtual_voice_calls_provider_call_id_idx").on(table.providerCallId),
}));

export const virtualVoicemails = pgTable("virtual_voicemails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  virtualNumberId: varchar("virtual_number_id").notNull().references(() => userVirtualNumbers.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("vonage"),
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  recordingUrl: text("recording_url"),
  recordingUuid: text("recording_uuid"),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  status: text("status").notNull().default("recorded"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("virtual_voicemails_user_id_idx").on(table.userId),
  virtualNumberIdx: index("virtual_voicemails_virtual_number_id_idx").on(table.virtualNumberId),
  recordingUuidIdx: index("virtual_voicemails_recording_uuid_idx").on(table.recordingUuid),
  statusIdx: index("virtual_voicemails_status_idx").on(table.status),
}));

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  direction: text("direction").notNull(), // inbound, outbound
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  text: text("text").notNull(),
  profileName: text("profile_name"),
  waMessageId: text("wa_message_id"),
  status: text("status").notNull().default("received"), // received, sent, delivered, read, failed
  rawPayload: jsonb("raw_payload").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("whatsapp_messages_user_id_idx").on(table.userId),
  directionIdx: index("whatsapp_messages_direction_idx").on(table.direction),
  fromNumberIdx: index("whatsapp_messages_from_number_idx").on(table.fromNumber),
  toNumberIdx: index("whatsapp_messages_to_number_idx").on(table.toNumber),
  waMessageIdIdx: index("whatsapp_messages_wa_message_id_idx").on(table.waMessageId),
}));

export const memberRewardTransactions = pgTable("member_reward_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // earned, converted, adjustment
  tier: text("tier").notNull().default("standard"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  sourceAmount: decimal("source_amount", { precision: 10, scale: 2 }),
  sourceType: text("source_type"),
  sourceId: text("source_id"),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull().default("0.00"),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull().default("0.00"),
  description: text("description"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("member_reward_transactions_user_id_idx").on(table.userId),
  typeIdx: index("member_reward_transactions_type_idx").on(table.type),
  sourceIdIdx: index("member_reward_transactions_source_id_idx").on(table.sourceId),
}));

export const resellerPaymentSettings = pgTable("reseller_payment_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resellerId: varchar("reseller_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  paypalEmail: text("paypal_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  resellerIdIdx: index("reseller_payment_settings_reseller_id_idx").on(table.resellerId),
}));

// Analytics Events
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: text("session_id"),
  eventType: text("event_type").notNull(),
  eventData: text("event_data"),
  page: text("page"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  ip: text("ip"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  eventTypeIdx: index("analytics_events_event_type_idx").on(table.eventType),
  userIdIdx: index("analytics_events_user_id_idx").on(table.userId),
  createdAtIdx: index("analytics_events_created_at_idx").on(table.createdAt),
}));

export const customerSegments = pgTable("customer_segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  criteria: text("criteria").notNull(),
  userCount: integer("user_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const abandonedCarts = pgTable("abandoned_carts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  packageId: varchar("package_id").references(() => unifiedPackages.id),
  sessionId: text("session_id"),
  cartData: text("cart_data"),
  reminderSent: boolean("reminder_sent").default(false),
  reminderSentAt: timestamp("reminder_sent_at"),
  convertedOrderId: varchar("converted_order_id").references(() => orders.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("abandoned_carts_user_id_idx").on(table.userId),
  reminderSentIdx: index("abandoned_carts_reminder_sent_idx").on(table.reminderSent),
}));

// Email Campaigns
export const emailCampaigns = pgTable("email_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  segmentId: varchar("segment_id").references(() => customerSegments.id),
  status: text("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count").default(0),
  openedCount: integer("opened_count").default(0),
  clickedCount: integer("clicked_count").default(0),
  createdBy: varchar("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("email_campaigns_status_idx").on(table.status),
}));

export const emailAutomations = pgTable("email_automations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  delayMinutes: integer("delay_minutes").default(0),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const emailSubscriptions = pgTable("email_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  email: text("email").notNull(),
  subscribed: boolean("subscribed").notNull().default(true),
  unsubscribedAt: timestamp("unsubscribed_at"),
  unsubscribeReason: text("unsubscribe_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("email_subscriptions_email_idx").on(table.email),
  subscribedIdx: index("email_subscriptions_subscribed_idx").on(table.subscribed),
}));

// Payment Settings
export const paymentSettings = pgTable("payment_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  method: text("method").notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  minimumAmount: decimal("minimum_amount", { precision: 10, scale: 2 }).default("0.00"),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  tickets: many(tickets),
  notifications: many(notifications),
  kycDocuments: many(kycDocuments),
  activityLogs: many(activityLogs),
  fcmTokens: many(fcmTokens),
  walletTransactions: many(walletTransactions),
  memberRewardTransactions: many(memberRewardTransactions),
  resellerPackagePrices: many(resellerPackagePrices),
  resellerProviderSettings: many(resellerProviderSettings),
  resellerCustomers: many(resellerCustomerLinks, { relationName: "resellerCustomers" }),
  managedByResellers: many(resellerCustomerLinks, { relationName: "managedByResellers" }),
  rateTableAssignments: many(rateTableAssignments),
}));

export const fcmTokensRelations = relations(fcmTokens, ({ one }) => ({
  user: one(users, { fields: [fcmTokens.userId], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  package: one(airaloPackages, { fields: [orders.packageId], references: [airaloPackages.id] }),
  topups: many(topups),
}));

export const topupsRelations = relations(topups, ({ one }) => ({
  order: one(orders, { fields: [topups.orderId], references: [orders.id] }),
  user: one(users, { fields: [topups.userId], references: [users.id] }),
  package: one(airaloPackages, { fields: [topups.packageId], references: [airaloPackages.id] }),
}));

export const airaloPackagesRelations = relations(airaloPackages, ({ one }) => ({
  provider: one(providers, { fields: [airaloPackages.providerId], references: [providers.id] }),
  destination: one(destinations, { fields: [airaloPackages.destinationId], references: [destinations.id] }),
  region: one(regions, { fields: [airaloPackages.regionId], references: [regions.id] }),
}));

export const providersRelations = relations(providers, ({ many }) => ({
  airaloPackages: many(airaloPackages),
  esimAccessPackages: many(esimAccessPackages),
  esimGoPackages: many(esimGoPackages),
  unifiedPackages: many(unifiedPackages),
  resellerProviderSettings: many(resellerProviderSettings),
}));

export const unifiedPackagesRelations = relations(unifiedPackages, ({ one, many }) => ({
  provider: one(providers, { fields: [unifiedPackages.providerId], references: [providers.id] }),
  destination: one(destinations, { fields: [unifiedPackages.destinationId], references: [destinations.id] }),
  region: one(regions, { fields: [unifiedPackages.regionId], references: [regions.id] }),
  resellerPrices: many(resellerPackagePrices),
  rateTablePrices: many(rateTablePrices),
}));

export const resellerPackagePricesRelations = relations(resellerPackagePrices, ({ one }) => ({
  reseller: one(users, { fields: [resellerPackagePrices.resellerId], references: [users.id] }),
  package: one(unifiedPackages, { fields: [resellerPackagePrices.packageId], references: [unifiedPackages.id] }),
}));

export const resellerProviderSettingsRelations = relations(resellerProviderSettings, ({ one }) => ({
  reseller: one(users, { fields: [resellerProviderSettings.resellerId], references: [users.id] }),
  provider: one(providers, { fields: [resellerProviderSettings.providerId], references: [providers.id] }),
}));

export const resellerCustomerLinksRelations = relations(resellerCustomerLinks, ({ one }) => ({
  reseller: one(users, {
    fields: [resellerCustomerLinks.resellerId],
    references: [users.id],
    relationName: "resellerCustomers",
  }),
  customer: one(users, {
    fields: [resellerCustomerLinks.customerId],
    references: [users.id],
    relationName: "managedByResellers",
  }),
}));

export const rateTablesRelations = relations(rateTables, ({ one, many }) => ({
  creator: one(admins, { fields: [rateTables.createdBy], references: [admins.id] }),
  prices: many(rateTablePrices),
  assignments: many(rateTableAssignments),
}));

export const rateTablePricesRelations = relations(rateTablePrices, ({ one }) => ({
  rateTable: one(rateTables, { fields: [rateTablePrices.rateTableId], references: [rateTables.id] }),
  package: one(unifiedPackages, { fields: [rateTablePrices.packageId], references: [unifiedPackages.id] }),
}));

export const rateTableAssignmentsRelations = relations(rateTableAssignments, ({ one }) => ({
  rateTable: one(rateTables, { fields: [rateTableAssignments.rateTableId], references: [rateTables.id] }),
  user: one(users, { fields: [rateTableAssignments.userId], references: [users.id] }),
  admin: one(admins, { fields: [rateTableAssignments.assignedBy], references: [admins.id] }),
}));

export const esimAccessPackagesRelations = relations(esimAccessPackages, ({ one }) => ({
  provider: one(providers, { fields: [esimAccessPackages.providerId], references: [providers.id] }),
  destination: one(destinations, { fields: [esimAccessPackages.destinationId], references: [destinations.id] }),
  region: one(regions, { fields: [esimAccessPackages.regionId], references: [regions.id] }),
}));

export const esimGoPackagesRelations = relations(esimGoPackages, ({ one }) => ({
  provider: one(providers, { fields: [esimGoPackages.providerId], references: [providers.id] }),
  destination: one(destinations, { fields: [esimGoPackages.destinationId], references: [destinations.id] }),
  region: one(regions, { fields: [esimGoPackages.regionId], references: [regions.id] }),
}));

// export const ticketsRelations = relations(tickets, ({ one, many }) => ({
//   user: one(users, { fields: [tickets.userId], references: [users.id] }),
//   order: one(orders, { fields: [tickets.orderId], references: [orders.id] }),
//   replies: many(ticketReplies),
// }));

export const ticketsRelations = relations(tickets, ({ many }) => ({
  messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketMessages.ticketId],
    references: [tickets.id],
  }),
}));

export const ticketRepliesRelations = relations(ticketReplies, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketReplies.ticketId], references: [tickets.id] }),
  user: one(users, { fields: [ticketReplies.userId], references: [users.id] }),
  admin: one(admins, { fields: [ticketReplies.adminId], references: [admins.id] }),
}));

export const kycDocumentsRelations = relations(kycDocuments, ({ one }) => ({
  user: one(users, { fields: [kycDocuments.userId], references: [users.id] }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
  admin: one(admins, { fields: [activityLogs.adminId], references: [admins.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  package: one(unifiedPackages, { fields: [reviews.packageId], references: [unifiedPackages.id] }),
  order: one(orders, { fields: [reviews.orderId], references: [orders.id] }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  author: one(admins, { fields: [blogPosts.authorId], references: [admins.id] }),
}));

export const adminsRelations = relations(admins, ({ many }) => ({
  blogPosts: many(blogPosts),
  enterpriseAccountsApproved: many(enterpriseAccounts, { relationName: "approvedByAdmin" }),
  enterpriseUsersCreated: many(enterpriseUsers),
  bulkQuotesCreated: many(bulkQuotes, { relationName: "createdByAdmin" }),
  voucherCodesCreated: many(voucherCodes, { relationName: "createdByAdmin" }),
}));

export const enterpriseAccountsRelations = relations(enterpriseAccounts, ({ one, many }) => ({
  user: one(users, { fields: [enterpriseAccounts.userId], references: [users.id] }),
  approvedByAdmin: one(admins, { fields: [enterpriseAccounts.approvedBy], references: [admins.id], relationName: "approvedByAdmin" }),
  enterpriseUsers: many(enterpriseUsers),
  quotes: many(bulkQuotes),
  orders: many(bulkOrders),
}));

export const bulkQuotesRelations = relations(bulkQuotes, ({ one }) => ({
  enterpriseAccount: one(enterpriseAccounts, { fields: [bulkQuotes.enterpriseAccountId], references: [enterpriseAccounts.id] }),
  package: one(unifiedPackages, { fields: [bulkQuotes.packageId], references: [unifiedPackages.id] }),
  createdByAdmin: one(admins, { fields: [bulkQuotes.createdBy], references: [admins.id], relationName: "createdByAdmin" }),
}));

export const bulkOrdersRelations = relations(bulkOrders, ({ one, many }) => ({
  enterpriseAccount: one(enterpriseAccounts, { fields: [bulkOrders.enterpriseAccountId], references: [enterpriseAccounts.id] }),
  quote: one(bulkQuotes, { fields: [bulkOrders.quoteId], references: [bulkQuotes.id] }),
  allocations: many(enterpriseOrderAllocations),
}));

export const enterpriseUsersRelations = relations(enterpriseUsers, ({ one, many }) => ({
  enterpriseAccount: one(enterpriseAccounts, { fields: [enterpriseUsers.enterpriseAccountId], references: [enterpriseAccounts.id] }),
  createdByAdmin: one(admins, { fields: [enterpriseUsers.createdBy], references: [admins.id] }),
  sessions: many(enterpriseSessions),
  allocations: many(enterpriseOrderAllocations),
}));

export const enterpriseSessionsRelations = relations(enterpriseSessions, ({ one }) => ({
  user: one(enterpriseUsers, { fields: [enterpriseSessions.enterpriseUserId], references: [enterpriseUsers.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  enterprise: one(enterpriseAccounts, { fields: [apiKeys.enterpriseId], references: [enterpriseAccounts.id] }),
  createdByAdmin: one(admins, { fields: [apiKeys.createdBy], references: [admins.id] }),
}));

export const enterpriseOrderAllocationsRelations = relations(enterpriseOrderAllocations, ({ one }) => ({
  bulkOrder: one(bulkOrders, { fields: [enterpriseOrderAllocations.bulkOrderId], references: [bulkOrders.id] }),
  order: one(orders, { fields: [enterpriseOrderAllocations.orderId], references: [orders.id] }),
  allocatedByUser: one(enterpriseUsers, { fields: [enterpriseOrderAllocations.allocatedBy], references: [enterpriseUsers.id] }),
}));

export const giftCardsRelations = relations(giftCards, ({ one, many }) => ({
  purchaser: one(users, { fields: [giftCards.purchasedBy], references: [users.id], relationName: "purchaser" }),
  redeemer: one(users, { fields: [giftCards.redeemedBy], references: [users.id], relationName: "redeemer" }),
  purchaseOrder: one(orders, { fields: [giftCards.purchaseOrderId], references: [orders.id] }),
  createdBy: one(admins, { fields: [giftCards.createdByAdmin], references: [admins.id], relationName: "adminCreatedGiftCards" }),
  transactions: many(giftCardTransactions),
}));

export const giftCardTransactionsRelations = relations(giftCardTransactions, ({ one }) => ({
  giftCard: one(giftCards, { fields: [giftCardTransactions.giftCardId], references: [giftCards.id] }),
  order: one(orders, { fields: [giftCardTransactions.orderId], references: [orders.id] }),
  user: one(users, { fields: [giftCardTransactions.usedBy], references: [users.id] }),
}));

export const voucherCodesRelations = relations(voucherCodes, ({ one, many }) => ({
  createdByAdmin: one(admins, { fields: [voucherCodes.createdBy], references: [admins.id], relationName: "createdByAdmin" }),
  createdByUser: one(users, { fields: [voucherCodes.createdByUser], references: [users.id] }),
  assignedUser: one(users, { fields: [voucherCodes.assignedUserId], references: [users.id], relationName: "assignedVoucherUser" }),
  usage: many(voucherUsage),
  walletTransactions: many(walletTransactions),
}));

export const voucherUsageRelations = relations(voucherUsage, ({ one }) => ({
  voucher: one(voucherCodes, { fields: [voucherUsage.voucherId], references: [voucherCodes.id] }),
  user: one(users, { fields: [voucherUsage.userId], references: [users.id] }),
  order: one(orders, { fields: [voucherUsage.orderId], references: [orders.id] }),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  user: one(users, { fields: [walletTransactions.userId], references: [users.id] }),
  voucher: one(voucherCodes, { fields: [walletTransactions.voucherId], references: [voucherCodes.id] }),
}));

export const memberRewardTransactionsRelations = relations(memberRewardTransactions, ({ one }) => ({
  user: one(users, { fields: [memberRewardTransactions.userId], references: [users.id] }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  displayUserId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOtpSchema = createInsertSchema(otpCodes).omit({
  id: true,
  createdAt: true,
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
});

export const insertCurrencyRateSchema = createInsertSchema(currencyRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDestinationSchema = createInsertSchema(destinations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRegionSchema = createInsertSchema(regions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiraloPackageSchema = createInsertSchema(airaloPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiraloTopupSchema = createInsertSchema(airaloTopups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEsimAccessTopupSchema = createInsertSchema(esimAccessTopups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEsimGoTopupSchema = createInsertSchema(esimGoTopups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMayaPackageSchema = createInsertSchema(mayaPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMayaTopupSchema = createInsertSchema(mayaTopups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAirhubPackageSchema = createInsertSchema(airhubPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  displayOrderId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTopupSchema = createInsertSchema(topups).omit({
  id: true,
  displayTopupId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketReplySchema = createInsertSchema(ticketReplies).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

// Platform Settings insert schema
export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({
  id: true,
  updatedAt: true,
});


export const insertKycDocumentSchema = createInsertSchema(kycDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertFcmTokenSchema = createInsertSchema(fcmTokens).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export const insertProviderWebhookSchema = createInsertSchema(providerWebhooks).omit({
  id: true,
  createdAt: true,
});

export const insertAiraloNotificationSchema = createInsertSchema(airaloNotifications).omit({
  id: true,
  createdAt: true,
});

export const insertCustomNotificationSchema = createInsertSchema(customNotifications).omit({
  id: true,
  createdAt: true,
});

export const insertProviderSchema = createInsertSchema(providers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEsimAccessPackageSchema = createInsertSchema(esimAccessPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEsimGoPackageSchema = createInsertSchema(esimGoPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUnifiedPackageSchema = createInsertSchema(unifiedPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResellerPackagePriceSchema = createInsertSchema(resellerPackagePrices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResellerProviderSettingSchema = createInsertSchema(resellerProviderSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResellerCustomerLinkSchema = createInsertSchema(resellerCustomerLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRateTableSchema = createInsertSchema(rateTables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRateTablePriceSchema = createInsertSchema(rateTablePrices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRateTableAssignmentSchema = createInsertSchema(rateTableAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  helpfulCount: true,
  isApproved: true,
  approvedBy: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true
});

export const insertReferralProgramSchema = createInsertSchema(referralProgram).omit({
  id: true,
  totalReferrals: true,
  totalEarnings: true,
  createdAt: true,
  updatedAt: true
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertReferralSettingsSchema = createInsertSchema(referralSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertReferralTransactionSchema = createInsertSchema(referralTransactions).omit({
  id: true,
  createdAt: true
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEnterpriseAccountSchema = createInsertSchema(enterpriseAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBulkQuoteSchema = createInsertSchema(bulkQuotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBulkOrderSchema = createInsertSchema(bulkOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEnterpriseUserSchema = createInsertSchema(enterpriseUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  role: z.enum(["owner", "member"]).default("member"),
});

export const insertEnterpriseSessionSchema = createInsertSchema(enterpriseSessions).omit({
  id: true,
  createdAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
  requestCount: true,
});

export const insertEnterpriseOrderAllocationSchema = createInsertSchema(enterpriseOrderAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["allocated", "email_sent", "downloaded", "activated", "revoked"]).default("allocated"),
  distributionMethod: z.enum(["email", "export", "download"]).optional(),
});

export const insertGiftCardSchema = createInsertSchema(giftCards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGiftCardTransactionSchema = createInsertSchema(giftCardTransactions).omit({
  id: true,
  usedAt: true,
});

// export const baseSchema = createInsertSchema(voucherCodes).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// export const insertVoucherCodeSchema = baseSchema.extend({
//   // ✅ decimal → STRING (important)
//   value: z
//     .string({ required_error: "Value is required" })
//     .min(1)
//     .transform((val) => {
//       const num = Number(val.replace(/[^0-9.-]/g, "").trim());
//       if (isNaN(num)) {
//         throw new Error("Value must be a number or number with %");
//       }
//       return num.toFixed(2); // 👈 string for decimal
//     }),

//   // ✅ decimal → STRING
//   minPurchaseAmount: z
//     .string()
//     .optional()
//     .transform((val) => {
//       if (!val || val === "") return "0.00";
//       const num = Number(val);
//       if (isNaN(num)) return "0.00";
//       return num.toFixed(2);
//     }),

//   // ✅ integer → number | null
//   maxUses: z
//     .union([z.string(), z.number()])
//     .optional()
//     .transform((val) => {
//       if (val === "" || val === null || val === undefined) return null;
//       const num = typeof val === "string" ? Number(val) : val;
//       return isNaN(num) ? null : num;
//     }),

//   // ✅ timestamp → Date (perfect)
//   validFrom: z
//     .string({ required_error: "Valid from date is required" })
//     .refine((val) => !isNaN(Date.parse(val)), {
//       message: "Invalid validFrom date",
//     })
//     .transform((val) => new Date(val)),

//   validUntil: z
//     .string({ required_error: "Valid until date is required" })
//     .refine((val) => !isNaN(Date.parse(val)), {
//       message: "Invalid validUntil date",
//     })
//     .transform((val) => new Date(val)),

//   description: z.string().optional().nullable(),

//   status: z.enum(["active", "inactive"]),
// });




export const insertVoucherCodeSchema = createInsertSchema(voucherCodes, {
  // decimal → string
  value: z
    .string()
    .min(1)
    .transform((val) => {
      const num = Number(val.replace(/[^0-9.-]/g, ""));
      if (isNaN(num)) throw new Error("Invalid value");
      return num.toFixed(2);
    }),

  minPurchaseAmount: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val === "") return "0.00";
      const num = Number(val);
      return isNaN(num) ? "0.00" : num.toFixed(2);
    }),

  maxUses: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === "" || val === undefined || val === null) return null;
      const num = typeof val === "string" ? Number(val) : val;
      return isNaN(num) ? null : num;
    }),

  // 🔥 THIS IS THE KEY FIX
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),

  description: z.string().optional().nullable(),

  status: z.enum(["active", "inactive"]),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});



export const insertVoucherUsageSchema = createInsertSchema(voucherUsage).omit({
  id: true,
  usedAt: true,
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMemberRewardTransactionSchema = createInsertSchema(memberRewardTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSegmentSchema = createInsertSchema(customerSegments).omit({
  id: true,
  userCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAbandonedCartSchema = createInsertSchema(abandonedCarts).omit({
  id: true,
  reminderSent: true,
  reminderSentAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({
  id: true,
  status: true,
  sentAt: true,
  recipientCount: true,
  openedCount: true,
  clickedCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailAutomationSchema = createInsertSchema(emailAutomations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailSubscriptionSchema = createInsertSchema(emailSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSettingSchema = createInsertSchema(paymentSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpSchema>;

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type CurrencyRate = typeof currencyRates.$inferSelect;
export type InsertCurrencyRate = z.infer<typeof insertCurrencyRateSchema>;

export type Destination = typeof destinations.$inferSelect;
export type InsertDestination = z.infer<typeof insertDestinationSchema>;

export type Region = typeof regions.$inferSelect;
export type InsertRegion = z.infer<typeof insertRegionSchema>;

export type AiraloPackage = typeof airaloPackages.$inferSelect;
export type InsertAiraloPackage = z.infer<typeof insertAiraloPackageSchema>;

export type AiraloTopup = typeof airaloTopups.$inferSelect;
export type InsertAiraloTopup = z.infer<typeof insertAiraloTopupSchema>;

export type EsimAccessTopup = typeof esimAccessTopups.$inferSelect;
export type InsertEsimAccessTopup = z.infer<typeof insertEsimAccessTopupSchema>;

export type EsimGoTopup = typeof esimGoTopups.$inferSelect;
export type InsertEsimGoTopup = z.infer<typeof insertEsimGoTopupSchema>;

export type MayaPackage = typeof mayaPackages.$inferSelect;
export type InsertMayaPackage = z.infer<typeof insertMayaPackageSchema>;

export type MayaTopup = typeof mayaTopups.$inferSelect;
export type InsertMayaTopup = z.infer<typeof insertMayaTopupSchema>;

export type AirhubPackage = typeof airhubPackages.$inferSelect;
export type InsertAirhubPackage = z.infer<typeof insertAirhubPackageSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Topup = typeof topups.$inferSelect;
export type InsertTopup = z.infer<typeof insertTopupSchema>;

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

export type TicketReply = typeof ticketReplies.$inferSelect;
export type InsertTicketReply = z.infer<typeof insertTicketReplySchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;

export type KycDocument = typeof kycDocuments.$inferSelect;
export type InsertKycDocument = z.infer<typeof insertKycDocumentSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type ProviderWebhook = typeof providerWebhooks.$inferSelect;
export type InsertProviderWebhook = z.infer<typeof insertProviderWebhookSchema>;

export type AiraloNotification = typeof airaloNotifications.$inferSelect;
export type InsertAiraloNotification = z.infer<typeof insertAiraloNotificationSchema>;

export type CustomNotification = typeof customNotifications.$inferSelect;
export type InsertCustomNotification = z.infer<typeof insertCustomNotificationSchema>;

export type Provider = typeof providers.$inferSelect;
export type InsertProvider = z.infer<typeof insertProviderSchema>;

export type EsimAccessPackage = typeof esimAccessPackages.$inferSelect;
export type InsertEsimAccessPackage = z.infer<typeof insertEsimAccessPackageSchema>;

export type EsimGoPackage = typeof esimGoPackages.$inferSelect;
export type InsertEsimGoPackage = z.infer<typeof insertEsimGoPackageSchema>;

export type UnifiedPackage = typeof unifiedPackages.$inferSelect;
export type InsertUnifiedPackage = z.infer<typeof insertUnifiedPackageSchema>;
export type ResellerPackagePrice = typeof resellerPackagePrices.$inferSelect;
export type InsertResellerPackagePrice = z.infer<typeof insertResellerPackagePriceSchema>;
export type ResellerProviderSetting = typeof resellerProviderSettings.$inferSelect;
export type InsertResellerProviderSetting = z.infer<typeof insertResellerProviderSettingSchema>;
export type ResellerCustomerLink = typeof resellerCustomerLinks.$inferSelect;
export type InsertResellerCustomerLink = z.infer<typeof insertResellerCustomerLinkSchema>;
export type RateTable = typeof rateTables.$inferSelect;
export type InsertRateTable = z.infer<typeof insertRateTableSchema>;
export type RateTablePrice = typeof rateTablePrices.$inferSelect;
export type InsertRateTablePrice = z.infer<typeof insertRateTablePriceSchema>;
export type RateTableAssignment = typeof rateTableAssignments.$inferSelect;
export type InsertRateTableAssignment = z.infer<typeof insertRateTableAssignmentSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type ReferralProgram = typeof referralProgram.$inferSelect;
export type InsertReferralProgram = z.infer<typeof insertReferralProgramSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type ReferralSettings = typeof referralSettings.$inferSelect;
export type InsertReferralSettings = z.infer<typeof insertReferralSettingsSchema>;

export type ReferralTransaction = typeof referralTransactions.$inferSelect;
export type InsertReferralTransaction = z.infer<typeof insertReferralTransactionSchema>;

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;

export type EnterpriseAccount = typeof enterpriseAccounts.$inferSelect;
export type InsertEnterpriseAccount = z.infer<typeof insertEnterpriseAccountSchema>;

export type BulkQuote = typeof bulkQuotes.$inferSelect;
export type InsertBulkQuote = z.infer<typeof insertBulkQuoteSchema>;

export type BulkOrder = typeof bulkOrders.$inferSelect;
export type InsertBulkOrder = z.infer<typeof insertBulkOrderSchema>;

export type EnterpriseUser = typeof enterpriseUsers.$inferSelect;
export type InsertEnterpriseUser = z.infer<typeof insertEnterpriseUserSchema>;

export type EnterpriseSession = typeof enterpriseSessions.$inferSelect;
export type InsertEnterpriseSession = z.infer<typeof insertEnterpriseSessionSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export type EnterpriseOrderAllocation = typeof enterpriseOrderAllocations.$inferSelect;
export type InsertEnterpriseOrderAllocation = z.infer<typeof insertEnterpriseOrderAllocationSchema>;

export type GiftCard = typeof giftCards.$inferSelect;
export type InsertGiftCard = z.infer<typeof insertGiftCardSchema>;

export type GiftCardTransaction = typeof giftCardTransactions.$inferSelect;
export type InsertGiftCardTransaction = z.infer<typeof insertGiftCardTransactionSchema>;

export type VoucherCode = typeof voucherCodes.$inferSelect;
export type InsertVoucherCode = z.infer<typeof insertVoucherCodeSchema>;

export type VoucherUsage = typeof voucherUsage.$inferSelect;
export type InsertVoucherUsage = z.infer<typeof insertVoucherUsageSchema>;

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;

export type MemberRewardTransaction = typeof memberRewardTransactions.$inferSelect;
export type InsertMemberRewardTransaction = z.infer<typeof insertMemberRewardTransactionSchema>;

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;

export type CustomerSegment = typeof customerSegments.$inferSelect;
export type InsertCustomerSegment = z.infer<typeof insertCustomerSegmentSchema>;

export type AbandonedCart = typeof abandonedCarts.$inferSelect;
export type InsertAbandonedCart = z.infer<typeof insertAbandonedCartSchema>;

export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;

export type EmailAutomation = typeof emailAutomations.$inferSelect;
export type InsertEmailAutomation = z.infer<typeof insertEmailAutomationSchema>;

export type EmailSubscription = typeof emailSubscriptions.$inferSelect;
export type InsertEmailSubscription = z.infer<typeof insertEmailSubscriptionSchema>;

export type PaymentSetting = typeof paymentSettings.$inferSelect;
export type InsertPaymentSetting = z.infer<typeof insertPaymentSettingSchema>;

// ==================== INTERNATIONALIZATION ====================

// Languages - Supported languages for the platform
export const languages = pgTable("languages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 10 }).notNull().unique(), // en, ar, de, es, fr, hi, it, ja, pl, pt, sv, zh
  name: text("name").notNull(), // English, Arabic, German, etc.
  nativeName: text("native_name").notNull(), // English, العربية, Deutsch, etc.
  flagCode: varchar("flag_code", { length: 10 }), // Country code for flag (US, SA, DE, etc.)
  isRTL: boolean("is_rtl").notNull().default(false), // Right-to-left language (Arabic)
  isEnabled: boolean("is_enabled").notNull().default(true), // Enable/disable language
  isDefault: boolean("is_default").notNull().default(false), // Default language for new users
  sortOrder: integer("sort_order").notNull().default(0), // Display order in language selector
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  codeIdx: index("languages_code_idx").on(table.code),
  enabledIdx: index("languages_enabled_idx").on(table.isEnabled),
}));

// Translation Keys - Organized by namespace for easier management
export const translationKeys = pgTable("translation_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  namespace: varchar("namespace", { length: 50 }).notNull(), // website, userPanel, adminPanel, common
  key: text("key").notNull(), // nav.home, hero.title, button.submit, etc.
  description: text("description"), // Context for translators
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  namespaceKeyIdx: index("translation_keys_namespace_key_idx").on(table.namespace, table.key),
  namespaceIdx: index("translation_keys_namespace_idx").on(table.namespace),
}));

// Translation Values - Actual translations for each key-language pair
export const translationValues = pgTable("translation_values", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keyId: varchar("key_id").notNull().references(() => translationKeys.id, { onDelete: "cascade" }),
  languageId: varchar("language_id").notNull().references(() => languages.id, { onDelete: "cascade" }),
  value: text("value").notNull(), // The actual translated text
  isVerified: boolean("is_verified").notNull().default(false), // Has been reviewed
  verifiedBy: varchar("verified_by").references(() => admins.id),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  keyLanguageIdx: index("translation_values_key_language_idx").on(table.keyId, table.languageId),
  languageIdx: index("translation_values_language_idx").on(table.languageId),
}));

// Relations for translations
export const languagesRelations = relations(languages, ({ many }) => ({
  translations: many(translationValues),
}));

export const translationKeysRelations = relations(translationKeys, ({ many }) => ({
  values: many(translationValues),
}));

export const translationValuesRelations = relations(translationValues, ({ one }) => ({
  key: one(translationKeys, {
    fields: [translationValues.keyId],
    references: [translationKeys.id],
  }),
  language: one(languages, {
    fields: [translationValues.languageId],
    references: [languages.id],
  }),
}));


export const faqCategories = pgTable("faq_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  position: integer("position").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const faqs = pgTable("faqs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => faqCategories.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  position: integer("position").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  views: integer("views").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


export const privacyPolicies = pgTable("privacy_policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const termsConditions = pgTable("terms_conditions", {
  id: uuid("id").defaultRandom().primaryKey(),

  title: text("title").notNull(),
  content: text("content").notNull(), // HTML from CKEditor

  version: integer("version").notNull(),
  isActive: boolean("is_active").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas for translations
export const insertLanguageSchema = createInsertSchema(languages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTranslationKeySchema = createInsertSchema(translationKeys).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTranslationValueSchema = createInsertSchema(translationValues).omit({ id: true, createdAt: true, updatedAt: true });

export const insertPrivacyPolicySchema = z.object({
  title: z.string().min(3, "Title is required"),
  content: z.string().min(10, "Content is required"),
});

export const updatePrivacyPolicySchema = insertPrivacyPolicySchema.partial();

export const createTermsSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});


export const insertPageSchema = createInsertSchema(pages, {
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().optional(),
  isPublished: z.boolean().default(false),
});

export const updatePageSchema = insertPageSchema.partial().omit({ id: true });
export const selectPageSchema = createSelectSchema(pages);



export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;
export type UpdatePage = z.infer<typeof updatePageSchema>;


// Zod schemas for FAQ Categories
export const insertFaqCategorySchema = createInsertSchema(faqCategories, {
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().optional(),
  position: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateFaqCategorySchema = insertFaqCategorySchema.partial().omit({ id: true });
export const selectFaqCategorySchema = createSelectSchema(faqCategories);

// Zod schemas for FAQs
export const insertFaqSchema = createInsertSchema(faqs, {
  categoryId: z.string().uuid().optional(),
  question: z.string().min(1),
  answer: z.string().min(1),
  position: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  views: z.number().int().min(0).default(0),
});


/* -------------------------------
   ENUM: Payment Providers
-------------------------------- */
export const paymentProviderEnum = pgEnum("payment_provider", [
  "stripe",
  "razorpay",
  "paypal",
  "paystack",
  "powertranz",
  "nowpayments",
  "cryptomus",
  "ayamerchant"
]);

/* -------------------------------
   PAYMENT GATEWAYS (ADMIN CONFIG)
-------------------------------- */
export const paymentGateways = pgTable("payment_gateways", {
  id: uuid("id").defaultRandom().primaryKey(),

  provider: paymentProviderEnum("provider").notNull(),
  resellerId: varchar("reseller_id").references(() => users.id, { onDelete: "cascade" }),

  displayName: varchar("display_name", { length: 100 }).notNull(),
  // Example: "Card / Apple Pay", "UPI / NetBanking"

  isEnabled: boolean("is_enabled").default(false).notNull(),

  publicKey: varchar("public_key", { length: 255 }),
  secretKey: varchar("secret_key", { length: 255 }),
  webhookSecret: varchar("webhook_secret", { length: 255 }),

  config: jsonb("config").default({}),
  // provider specific extra config
  // ex: { currency: "INR", mode: "test" }

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


/*
supported currency 
 */

export const supportedCurrency = pgTable('supported_currency', {
  id: uuid('id').defaultRandom().primaryKey(),
  currencyId: varchar('currency_id')
    .notNull()
    .references(() => currencyRates.id, { onDelete: 'cascade' }),
  paymentGatewayId: uuid('payment_gateway_id')
    .notNull()
    .references(() => paymentGateways.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const createPaymentGatewaySchema = z.object({
  provider: z.enum(['stripe', 'razorpay', 'paypal', 'paystack', 'powertranz', 'nowpayments', 'cryptomus', 'ayamerchant']),
  displayName: z.string().min(2),
  publicKey: z.string().optional(),
  secretKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  config: z.record(z.any()).optional(),
  isEnabled: z.boolean().default(true),
  supportedCurrencies: z
    .array(
      z.object({
        currencyId: z.string().min(1), // VARCHAR
      }),
    )
    .min(1, 'At least one currency is required'),
});


export const updatePaymentGatewaySchema = z.object({
  displayName: z.string().optional(),
  publicKey: z.string().optional(),
  secretKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  config: z.record(z.any()).optional(),
  isEnabled: z.boolean().optional(),
  supportedCurrencies: z
    .array(
      z.object({
        currencyId: z.string().min(1), // VARCHAR
      }),
    )
    .min(1, 'At least one currency is required')
    .optional(),
});



export const updateFaqSchema = insertFaqSchema.partial().omit({ id: true });
export const selectFaqSchema = createSelectSchema(faqs);

// Types
export type FaqCategory = typeof faqCategories.$inferSelect;
export type InsertFaqCategory = z.infer<typeof insertFaqCategorySchema>;
export type UpdateFaqCategory = z.infer<typeof updateFaqCategorySchema>;

export type Faq = typeof faqs.$inferSelect;
export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type UpdateFaq = z.infer<typeof updateFaqSchema>;


export type Language = typeof languages.$inferSelect;
export type InsertLanguage = z.infer<typeof insertLanguageSchema>;

export type TranslationKey = typeof translationKeys.$inferSelect;
export type InsertTranslationKey = z.infer<typeof insertTranslationKeySchema>;

export type TranslationValue = typeof translationValues.$inferSelect;
export type InsertTranslationValue = z.infer<typeof insertTranslationValueSchema>;
