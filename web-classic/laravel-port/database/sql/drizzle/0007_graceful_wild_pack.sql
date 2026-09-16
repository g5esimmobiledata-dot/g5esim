CREATE TABLE "airalo_topups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar,
	"airalo_id" text NOT NULL,
	"parent_package_id" varchar,
	"parent_operator" text,
	"destination_id" varchar,
	"region_id" varchar,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"data_amount" text NOT NULL,
	"validity" integer NOT NULL,
	"airalo_price" numeric(10, 2),
	"price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"type" text NOT NULL,
	"operator" text,
	"operator_image" text,
	"is_unlimited" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"data_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "airalo_topups_airalo_id_unique" UNIQUE("airalo_id")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"api_key_prefix" text NOT NULL,
	"api_key_hash" text NOT NULL,
	"api_secret_hash" text NOT NULL,
	"enterprise_id" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"rate_limit" integer DEFAULT 100 NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"allowed_ips" text[],
	"last_used_at" timestamp,
	"request_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_api_key_hash_unique" UNIQUE("api_key_hash")
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(150) NOT NULL,
	"image_url" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"package_id" varchar,
	"created_at" timestamp with time zone DEFAULT NOW(),
	"updated_at" timestamp with time zone DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE "country_code_mappings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_code" text NOT NULL,
	"internal_code" text NOT NULL,
	"country_name" text NOT NULL,
	"code_type" text DEFAULT 'iso3' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "esim_access_topups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar NOT NULL,
	"esim_access_id" text NOT NULL,
	"base_package_code" text NOT NULL,
	"parent_package_id" varchar,
	"destination_id" varchar,
	"region_id" varchar,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"data_amount" text NOT NULL,
	"validity" integer NOT NULL,
	"wholesale_price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"type" text NOT NULL,
	"operator" text,
	"operator_image" text,
	"is_unlimited" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"data_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "esim_access_topups_esim_access_id_unique" UNIQUE("esim_access_id")
);
--> statement-breakpoint
CREATE TABLE "esim_go_topups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar NOT NULL,
	"esim_go_id" text NOT NULL,
	"parent_package_id" varchar,
	"parent_bundle_id" text,
	"destination_id" varchar,
	"region_id" varchar,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"data_amount" text NOT NULL,
	"validity" integer NOT NULL,
	"wholesale_price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"type" text NOT NULL,
	"operator" text,
	"operator_image" text,
	"is_unlimited" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"data_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "esim_go_topups_esim_go_id_unique" UNIQUE("esim_go_id")
);
--> statement-breakpoint
CREATE TABLE "fcm_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" text NOT NULL,
	"device_id" text,
	"device_type" text,
	"device_model" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_card_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gift_card_id" varchar NOT NULL,
	"order_id" varchar,
	"amount_used" numeric(10, 2) NOT NULL,
	"balance_after" numeric(10, 2) NOT NULL,
	"used_by" varchar,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" text NOT NULL,
	"native_name" text NOT NULL,
	"flag_code" varchar(10),
	"is_rtl" boolean DEFAULT false NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "languages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "maya_packages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar NOT NULL,
	"maya_id" text NOT NULL,
	"destination_id" varchar,
	"region_id" varchar,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"data_amount" text NOT NULL,
	"data_mb" integer NOT NULL,
	"data_bytes" bigint,
	"validity" integer NOT NULL,
	"wholesale_price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"type" text NOT NULL,
	"operator" text,
	"operator_image" text,
	"policy_id" integer,
	"policy_name" text,
	"coverage" text[],
	"rrp_usd" text,
	"rrp_eur" text,
	"rrp_gbp" text,
	"is_unlimited" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"data_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "maya_packages_maya_id_unique" UNIQUE("maya_id")
);
--> statement-breakpoint
CREATE TABLE "maya_topups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar NOT NULL,
	"maya_id" text NOT NULL,
	"parent_package_id" varchar,
	"destination_id" varchar,
	"region_id" varchar,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"data_amount" text NOT NULL,
	"data_mb" integer NOT NULL,
	"validity" integer NOT NULL,
	"wholesale_price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"type" text NOT NULL,
	"operator" text,
	"operator_image" text,
	"policy_id" integer,
	"policy_name" text,
	"coverage" text[],
	"active" boolean DEFAULT true NOT NULL,
	"data_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "maya_topups_maya_id_unique" UNIQUE("maya_id")
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" varchar,
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "referral_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"balance_before" numeric(10, 2) NOT NULL,
	"balance_after" numeric(10, 2) NOT NULL,
	"referral_id" varchar,
	"order_id" varchar,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"namespace" varchar(50) NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_values" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_id" varchar NOT NULL,
	"language_id" varchar NOT NULL,
	"value" text NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_by" varchar,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN "is_territory" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN "parent_country_code" text;--> statement-breakpoint
ALTER TABLE "esim_go_packages" ADD COLUMN "can_topup" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD COLUMN "theme" text DEFAULT 'default';--> statement-breakpoint
ALTER TABLE "gift_cards" ADD COLUMN "delivery_date" timestamp;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD COLUMN "delivery_sent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD COLUMN "created_by_admin" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_access_token" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_email" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_phone" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "original_provider_id" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "final_provider_id" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "failover_attempts" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_source" text DEFAULT 'website';--> statement-breakpoint
ALTER TABLE "otp_codes" ADD COLUMN "purpose" text DEFAULT 'login' NOT NULL;--> statement-breakpoint
ALTER TABLE "otp_codes" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "failover_priority" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "min_margin_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "unified_packages" ADD COLUMN "country_code" text;--> statement-breakpoint
ALTER TABLE "unified_packages" ADD COLUMN "country_name" text;--> statement-breakpoint
ALTER TABLE "unified_packages" ADD COLUMN "package_group_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hashed_password" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_set_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_password_login_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referral_balance" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "voucher_codes" ADD COLUMN "max_discount_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "voucher_codes" ADD COLUMN "per_user_limit" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "voucher_codes" ADD COLUMN "target_countries" text[];--> statement-breakpoint
ALTER TABLE "voucher_codes" ADD COLUMN "target_regions" text[];--> statement-breakpoint
ALTER TABLE "voucher_codes" ADD COLUMN "target_packages" text[];--> statement-breakpoint
ALTER TABLE "voucher_codes" ADD COLUMN "first_time_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "voucher_codes" ADD COLUMN "is_stackable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "airalo_topups" ADD CONSTRAINT "airalo_topups_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airalo_topups" ADD CONSTRAINT "airalo_topups_parent_package_id_airalo_packages_id_fk" FOREIGN KEY ("parent_package_id") REFERENCES "public"."airalo_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airalo_topups" ADD CONSTRAINT "airalo_topups_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airalo_topups" ADD CONSTRAINT "airalo_topups_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_enterprise_id_enterprise_accounts_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprise_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_package_id_unified_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."unified_packages"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "esim_access_topups" ADD CONSTRAINT "esim_access_topups_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esim_access_topups" ADD CONSTRAINT "esim_access_topups_parent_package_id_esim_access_packages_id_fk" FOREIGN KEY ("parent_package_id") REFERENCES "public"."esim_access_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esim_access_topups" ADD CONSTRAINT "esim_access_topups_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esim_access_topups" ADD CONSTRAINT "esim_access_topups_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esim_go_topups" ADD CONSTRAINT "esim_go_topups_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esim_go_topups" ADD CONSTRAINT "esim_go_topups_parent_package_id_esim_go_packages_id_fk" FOREIGN KEY ("parent_package_id") REFERENCES "public"."esim_go_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esim_go_topups" ADD CONSTRAINT "esim_go_topups_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esim_go_topups" ADD CONSTRAINT "esim_go_topups_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fcm_tokens" ADD CONSTRAINT "fcm_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_gift_card_id_gift_cards_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "public"."gift_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maya_packages" ADD CONSTRAINT "maya_packages_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maya_packages" ADD CONSTRAINT "maya_packages_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maya_packages" ADD CONSTRAINT "maya_packages_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maya_topups" ADD CONSTRAINT "maya_topups_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maya_topups" ADD CONSTRAINT "maya_topups_parent_package_id_maya_packages_id_fk" FOREIGN KEY ("parent_package_id") REFERENCES "public"."maya_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maya_topups" ADD CONSTRAINT "maya_topups_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maya_topups" ADD CONSTRAINT "maya_topups_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_transactions" ADD CONSTRAINT "referral_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_transactions" ADD CONSTRAINT "referral_transactions_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_transactions" ADD CONSTRAINT "referral_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_values" ADD CONSTRAINT "translation_values_key_id_translation_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."translation_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_values" ADD CONSTRAINT "translation_values_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_values" ADD CONSTRAINT "translation_values_verified_by_admins_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_prefix_idx" ON "api_keys" USING btree ("api_key_prefix");--> statement-breakpoint
CREATE INDEX "api_keys_hash_idx" ON "api_keys" USING btree ("api_key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_enterprise_idx" ON "api_keys" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "country_code_mappings_external_code_idx" ON "country_code_mappings" USING btree ("external_code");--> statement-breakpoint
CREATE INDEX "country_code_mappings_internal_code_idx" ON "country_code_mappings" USING btree ("internal_code");--> statement-breakpoint
CREATE INDEX "fcm_tokens_user_id_idx" ON "fcm_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fcm_tokens_token_idx" ON "fcm_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "gift_card_transactions_gift_card_id_idx" ON "gift_card_transactions" USING btree ("gift_card_id");--> statement-breakpoint
CREATE INDEX "gift_card_transactions_order_id_idx" ON "gift_card_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "languages_code_idx" ON "languages" USING btree ("code");--> statement-breakpoint
CREATE INDEX "languages_enabled_idx" ON "languages" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "referral_transactions_user_id_idx" ON "referral_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "referral_transactions_type_idx" ON "referral_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "referral_transactions_order_id_idx" ON "referral_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "translation_keys_namespace_key_idx" ON "translation_keys" USING btree ("namespace","key");--> statement-breakpoint
CREATE INDEX "translation_keys_namespace_idx" ON "translation_keys" USING btree ("namespace");--> statement-breakpoint
CREATE INDEX "translation_values_key_language_idx" ON "translation_values" USING btree ("key_id","language_id");--> statement-breakpoint
CREATE INDEX "translation_values_language_idx" ON "translation_values" USING btree ("language_id");--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_created_by_admin_admins_id_fk" FOREIGN KEY ("created_by_admin") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_original_provider_id_providers_id_fk" FOREIGN KEY ("original_provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_final_provider_id_providers_id_fk" FOREIGN KEY ("final_provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gift_cards_delivery_date_idx" ON "gift_cards" USING btree ("delivery_date");--> statement-breakpoint
CREATE INDEX "unified_packages_country_code_idx" ON "unified_packages" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "unified_packages_package_group_key_idx" ON "unified_packages" USING btree ("package_group_key");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_guest_access_token_unique" UNIQUE("guest_access_token");