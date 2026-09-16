CREATE TABLE "abandoned_carts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"package_id" varchar,
	"session_id" text,
	"cart_data" text,
	"reminder_sent" boolean DEFAULT false,
	"reminder_sent_at" timestamp,
	"converted_order_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"admin_id" varchar,
	"action" text NOT NULL,
	"entity" text,
	"entity_id" varchar,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "airalo_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"iccid" text,
	"order_id" varchar,
	"user_id" varchar,
	"threshold" text,
	"webhook_payload" jsonb NOT NULL,
	"signature" text,
	"processed" boolean DEFAULT false NOT NULL,
	"email_sent" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "airalo_packages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar,
	"airalo_id" text NOT NULL,
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
	"coverage" text[],
	"voice_credits" integer DEFAULT 0,
	"sms_credits" integer DEFAULT 0,
	"is_unlimited" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"is_trending" boolean DEFAULT false NOT NULL,
	"is_recommended" boolean DEFAULT false NOT NULL,
	"is_best_value" boolean DEFAULT false NOT NULL,
	"sales_count" integer DEFAULT 0 NOT NULL,
	"custom_image" text,
	"custom_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "airalo_packages_airalo_id_unique" UNIQUE("airalo_id"),
	CONSTRAINT "airalo_packages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"session_id" text,
	"event_type" text NOT NULL,
	"event_data" text,
	"page" text,
	"referrer" text,
	"user_agent" text,
	"ip" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"featured_image" text,
	"author_id" varchar,
	"published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"meta_description" text,
	"meta_keywords" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bulk_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_account_id" varchar,
	"quote_id" varchar,
	"total_amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"payment_status" text DEFAULT 'pending',
	"invoice_number" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulk_quotes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_account_id" varchar,
	"package_id" varchar,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0.00',
	"total_price" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"valid_until" timestamp NOT NULL,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currency_rates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"conversion_rate" numeric(10, 6) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "currency_rates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "custom_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"recipient_type" varchar(20) NOT NULL,
	"recipient_user_id" varchar,
	"sent_by" varchar NOT NULL,
	"emails_sent" integer DEFAULT 0,
	"emails_failed" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_segments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"criteria" text NOT NULL,
	"user_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"airalo_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"country_code" text NOT NULL,
	"flag_emoji" text,
	"image" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "destinations_airalo_id_unique" UNIQUE("airalo_id"),
	CONSTRAINT "destinations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "email_automations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"trigger" text NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"delay_minutes" integer DEFAULT 0,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"segment_id" varchar,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"recipient_count" integer DEFAULT 0,
	"opened_count" integer DEFAULT 0,
	"clicked_count" integer DEFAULT 0,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"email" text NOT NULL,
	"subscribed" boolean DEFAULT true NOT NULL,
	"unsubscribed_at" timestamp,
	"unsubscribe_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"variables" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_templates_event_type_unique" UNIQUE("event_type")
);
--> statement-breakpoint
CREATE TABLE "enterprise_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"billing_address" text,
	"tax_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"credit_limit" numeric(10, 2) DEFAULT '0.00',
	"current_balance" numeric(10, 2) DEFAULT '0.00',
	"discount_percent" numeric(5, 2) DEFAULT '0.00',
	"user_id" varchar,
	"approved_by" varchar,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "enterprise_accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "enterprise_order_allocations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bulk_order_id" varchar NOT NULL,
	"order_id" varchar NOT NULL,
	"employee_email" text NOT NULL,
	"employee_name" text,
	"status" text DEFAULT 'allocated' NOT NULL,
	"distribution_method" text,
	"sent_at" timestamp,
	"downloaded_at" timestamp,
	"download_token" text,
	"token_expires_at" timestamp,
	"allocated_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "enterprise_order_allocations_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "enterprise_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_user_id" varchar NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "enterprise_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_account_id" varchar NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"name" text,
	"totp_secret" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"last_password_change_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "enterprise_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "esim_access_packages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar NOT NULL,
	"esim_access_id" text NOT NULL,
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
	"coverage" text[],
	"voice_credits" integer DEFAULT 0,
	"sms_credits" integer DEFAULT 0,
	"is_unlimited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "esim_access_packages_esim_access_id_unique" UNIQUE("esim_access_id")
);
--> statement-breakpoint
CREATE TABLE "esim_go_packages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar NOT NULL,
	"esim_go_id" text NOT NULL,
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
	"coverage" text[],
	"voice_credits" integer DEFAULT 0,
	"sms_credits" integer DEFAULT 0,
	"is_unlimited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "esim_go_packages_esim_go_id_unique" UNIQUE("esim_go_id")
);
--> statement-breakpoint
CREATE TABLE "gift_cards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"balance" numeric(10, 2) NOT NULL,
	"purchased_by" varchar,
	"recipient_email" text,
	"recipient_name" text,
	"message" text,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp,
	"redeemed_by" varchar,
	"redeemed_at" timestamp,
	"purchase_order_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gift_cards_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "kyc_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"document_type" text NOT NULL,
	"file_path" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_order_id" serial NOT NULL,
	"user_id" varchar,
	"package_id" varchar NOT NULL,
	"provider_id" varchar,
	"provider_order_id" text,
	"airalo_order_id" text,
	"request_id" text,
	"order_type" text DEFAULT 'single' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"iccid" text,
	"qr_code" text,
	"qr_code_url" text,
	"lpa_code" text,
	"smdp_address" text,
	"activation_code" text,
	"direct_apple_url" text,
	"apn_type" text,
	"apn_value" text,
	"is_roaming" boolean DEFAULT false,
	"status" text DEFAULT 'pending' NOT NULL,
	"ordered_by" varchar,
	"assigned_by" varchar,
	"webhook_received_at" timestamp,
	"bulk_order_id" varchar,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_retry_at" timestamp,
	"last_status_check" timestamp,
	"failure_reason" text,
	"price" numeric(10, 2) NOT NULL,
	"airalo_price" numeric(10, 2),
	"wholesale_price" numeric(10, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"order_currency" text DEFAULT 'USD' NOT NULL,
	"data_amount" text NOT NULL,
	"validity" integer NOT NULL,
	"activated_at" timestamp,
	"expires_at" timestamp,
	"usage_data" jsonb,
	"installation_sent" boolean DEFAULT false NOT NULL,
	"stripe_payment_intent_id" text,
	"payment_method" text DEFAULT 'card',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_display_order_id_unique" UNIQUE("display_order_id")
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"method" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"minimum_amount" numeric(10, 2) DEFAULT '0.00',
	"settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_settings_method_unique" UNIQUE("method")
);
--> statement-breakpoint
CREATE TABLE "provider_webhooks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar NOT NULL,
	"type" text NOT NULL,
	"iccid" text,
	"order_id" varchar,
	"user_id" varchar,
	"threshold" text,
	"webhook_payload" jsonb NOT NULL,
	"signature" text,
	"processed" boolean DEFAULT false NOT NULL,
	"email_sent" boolean DEFAULT false NOT NULL,
	"in_app_notification_sent" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"api_base_url" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"is_preferred" boolean DEFAULT false NOT NULL,
	"pricing_margin" numeric(5, 2) DEFAULT '15.00' NOT NULL,
	"sync_interval_minutes" integer DEFAULT 60 NOT NULL,
	"last_sync_at" timestamp,
	"api_rate_limit_per_hour" integer DEFAULT 1000 NOT NULL,
	"webhook_secret" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "referral_program" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"referral_code" text NOT NULL,
	"total_referrals" integer DEFAULT 0 NOT NULL,
	"total_earnings" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_program_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "referral_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"reward_type" text DEFAULT 'percentage' NOT NULL,
	"reward_value" numeric(10, 2) DEFAULT '10.00' NOT NULL,
	"min_order_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"referred_user_discount" numeric(10, 2) DEFAULT '5.00' NOT NULL,
	"expiry_days" integer DEFAULT 90 NOT NULL,
	"terms_and_conditions" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" varchar NOT NULL,
	"referred_id" varchar NOT NULL,
	"referral_code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reward_amount" numeric(10, 2),
	"reward_paid" boolean DEFAULT false NOT NULL,
	"referred_order_id" varchar,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"airalo_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"countries" text[],
	"image" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "regions_airalo_id_unique" UNIQUE("airalo_id"),
	CONSTRAINT "regions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"order_id" varchar,
	"rating" integer NOT NULL,
	"title" text NOT NULL,
	"comment" text NOT NULL,
	"pros" text[],
	"cons" text[],
	"is_verified_purchase" boolean DEFAULT false NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"category" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "ticket_replies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" varchar NOT NULL,
	"user_id" varchar,
	"admin_id" varchar,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"order_id" varchar,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_topup_id" serial NOT NULL,
	"order_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"package_id" varchar NOT NULL,
	"iccid" text NOT NULL,
	"airalo_topup_id" text,
	"request_id" text,
	"price" numeric(10, 2) NOT NULL,
	"airalo_price" numeric(10, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"data_amount" text NOT NULL,
	"validity" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"webhook_received_at" timestamp,
	"failure_reason" text,
	"stripe_payment_intent_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "topups_display_topup_id_unique" UNIQUE("display_topup_id")
);
--> statement-breakpoint
CREATE TABLE "unified_packages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar NOT NULL,
	"provider_package_table" text NOT NULL,
	"provider_package_id" varchar NOT NULL,
	"destination_id" varchar,
	"region_id" varchar,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"data_amount" text NOT NULL,
	"validity" integer NOT NULL,
	"type" text NOT NULL,
	"wholesale_price" numeric(10, 2) NOT NULL,
	"retail_price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"operator" text,
	"operator_image" text,
	"coverage" text[],
	"voice_credits" integer DEFAULT 0,
	"sms_credits" integer DEFAULT 0,
	"is_unlimited" boolean DEFAULT false NOT NULL,
	"data_mb" integer,
	"validity_days" integer NOT NULL,
	"voice_minutes" integer DEFAULT 0,
	"sms_count" integer DEFAULT 0,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"is_best_price" boolean DEFAULT false NOT NULL,
	"manual_override" boolean DEFAULT false NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"is_trending" boolean DEFAULT false NOT NULL,
	"is_recommended" boolean DEFAULT false NOT NULL,
	"is_best_value" boolean DEFAULT false NOT NULL,
	"sales_count" integer DEFAULT 0 NOT NULL,
	"custom_image" text,
	"custom_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_user_id" serial NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"phone" text,
	"address" text,
	"kyc_status" text DEFAULT 'pending' NOT NULL,
	"kyc_submitted_at" timestamp,
	"kyc_reviewed_at" timestamp,
	"kyc_reviewed_by" varchar,
	"kyc_rejection_reason" text,
	"notify_low_data" boolean DEFAULT true NOT NULL,
	"notify_expiring" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_display_user_id_unique" UNIQUE("display_user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "voucher_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"min_purchase_amount" numeric(10, 2) DEFAULT '0.00',
	"max_uses" integer,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_until" timestamp NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"description" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "voucher_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "voucher_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_id" varchar,
	"user_id" varchar,
	"order_id" varchar,
	"discount_amount" numeric(10, 2) NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_package_id_unified_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."unified_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_converted_order_id_orders_id_fk" FOREIGN KEY ("converted_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airalo_notifications" ADD CONSTRAINT "airalo_notifications_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airalo_notifications" ADD CONSTRAINT "airalo_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airalo_packages" ADD CONSTRAINT "airalo_packages_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airalo_packages" ADD CONSTRAINT "airalo_packages_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airalo_packages" ADD CONSTRAINT "airalo_packages_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_admins_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_orders" ADD CONSTRAINT "bulk_orders_enterprise_account_id_enterprise_accounts_id_fk" FOREIGN KEY ("enterprise_account_id") REFERENCES "public"."enterprise_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_orders" ADD CONSTRAINT "bulk_orders_quote_id_bulk_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."bulk_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_quotes" ADD CONSTRAINT "bulk_quotes_enterprise_account_id_enterprise_accounts_id_fk" FOREIGN KEY ("enterprise_account_id") REFERENCES "public"."enterprise_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_quotes" ADD CONSTRAINT "bulk_quotes_package_id_unified_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."unified_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_quotes" ADD CONSTRAINT "bulk_quotes_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_segment_id_customer_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."customer_segments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_subscriptions" ADD CONSTRAINT "email_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_accounts" ADD CONSTRAINT "enterprise_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_accounts" ADD CONSTRAINT "enterprise_accounts_approved_by_admins_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_order_allocations" ADD CONSTRAINT "enterprise_order_allocations_bulk_order_id_bulk_orders_id_fk" FOREIGN KEY ("bulk_order_id") REFERENCES "public"."bulk_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_order_allocations" ADD CONSTRAINT "enterprise_order_allocations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_order_allocations" ADD CONSTRAINT "enterprise_order_allocations_allocated_by_enterprise_users_id_fk" FOREIGN KEY ("allocated_by") REFERENCES "public"."enterprise_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_sessions" ADD CONSTRAINT "enterprise_sessions_enterprise_user_id_enterprise_users_id_fk" FOREIGN KEY ("enterprise_user_id") REFERENCES "public"."enterprise_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_users" ADD CONSTRAINT "enterprise_users_enterprise_account_id_enterprise_accounts_id_fk" FOREIGN KEY ("enterprise_account_id") REFERENCES "public"."enterprise_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_users" ADD CONSTRAINT "enterprise_users_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esim_access_packages" ADD CONSTRAINT "esim_access_packages_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esim_access_packages" ADD CONSTRAINT "esim_access_packages_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esim_access_packages" ADD CONSTRAINT "esim_access_packages_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esim_go_packages" ADD CONSTRAINT "esim_go_packages_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esim_go_packages" ADD CONSTRAINT "esim_go_packages_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esim_go_packages" ADD CONSTRAINT "esim_go_packages_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_purchased_by_users_id_fk" FOREIGN KEY ("purchased_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_redeemed_by_users_id_fk" FOREIGN KEY ("redeemed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_purchase_order_id_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_package_id_airalo_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."airalo_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_ordered_by_admins_id_fk" FOREIGN KEY ("ordered_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_by_admins_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_webhooks" ADD CONSTRAINT "provider_webhooks_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_webhooks" ADD CONSTRAINT "provider_webhooks_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_webhooks" ADD CONSTRAINT "provider_webhooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_program" ADD CONSTRAINT "referral_program_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_users_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_order_id_orders_id_fk" FOREIGN KEY ("referred_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_package_id_unified_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."unified_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_approved_by_admins_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topups" ADD CONSTRAINT "topups_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topups" ADD CONSTRAINT "topups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topups" ADD CONSTRAINT "topups_package_id_airalo_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."airalo_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_packages" ADD CONSTRAINT "unified_packages_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_packages" ADD CONSTRAINT "unified_packages_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_packages" ADD CONSTRAINT "unified_packages_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_kyc_reviewed_by_admins_id_fk" FOREIGN KEY ("kyc_reviewed_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_codes" ADD CONSTRAINT "voucher_codes_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_usage" ADD CONSTRAINT "voucher_usage_voucher_id_voucher_codes_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."voucher_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_usage" ADD CONSTRAINT "voucher_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_usage" ADD CONSTRAINT "voucher_usage_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abandoned_carts_user_id_idx" ON "abandoned_carts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "abandoned_carts_reminder_sent_idx" ON "abandoned_carts" USING btree ("reminder_sent");--> statement-breakpoint
CREATE INDEX "analytics_events_event_type_idx" ON "analytics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "analytics_events_user_id_idx" ON "analytics_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_posts_published_idx" ON "blog_posts" USING btree ("published");--> statement-breakpoint
CREATE INDEX "bulk_orders_enterprise_id_idx" ON "bulk_orders" USING btree ("enterprise_account_id");--> statement-breakpoint
CREATE INDEX "bulk_orders_status_idx" ON "bulk_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bulk_quotes_enterprise_id_idx" ON "bulk_quotes" USING btree ("enterprise_account_id");--> statement-breakpoint
CREATE INDEX "bulk_quotes_status_idx" ON "bulk_quotes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_campaigns_status_idx" ON "email_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_subscriptions_email_idx" ON "email_subscriptions" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_subscriptions_subscribed_idx" ON "email_subscriptions" USING btree ("subscribed");--> statement-breakpoint
CREATE INDEX "enterprise_accounts_email_idx" ON "enterprise_accounts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "enterprise_accounts_status_idx" ON "enterprise_accounts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "enterprise_allocations_bulk_order_idx" ON "enterprise_order_allocations" USING btree ("bulk_order_id");--> statement-breakpoint
CREATE INDEX "enterprise_allocations_order_idx" ON "enterprise_order_allocations" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "enterprise_allocations_status_idx" ON "enterprise_order_allocations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "enterprise_allocations_bulk_order_status_idx" ON "enterprise_order_allocations" USING btree ("bulk_order_id","status");--> statement-breakpoint
CREATE INDEX "enterprise_sessions_user_id_idx" ON "enterprise_sessions" USING btree ("enterprise_user_id");--> statement-breakpoint
CREATE INDEX "enterprise_users_email_idx" ON "enterprise_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "enterprise_users_account_id_idx" ON "enterprise_users" USING btree ("enterprise_account_id");--> statement-breakpoint
CREATE INDEX "enterprise_users_covering_idx" ON "enterprise_users" USING btree ("enterprise_account_id","role","is_active");--> statement-breakpoint
CREATE INDEX "gift_cards_code_idx" ON "gift_cards" USING btree ("code");--> statement-breakpoint
CREATE INDEX "gift_cards_status_idx" ON "gift_cards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "gift_cards_purchased_by_idx" ON "gift_cards" USING btree ("purchased_by");--> statement-breakpoint
CREATE INDEX "referral_program_user_id_idx" ON "referral_program" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "referral_program_code_idx" ON "referral_program" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "referrals_referrer_id_idx" ON "referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "referrals_referred_id_idx" ON "referrals" USING btree ("referred_id");--> statement-breakpoint
CREATE INDEX "referrals_status_idx" ON "referrals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviews_package_id_idx" ON "reviews" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "reviews_user_id_idx" ON "reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reviews_rating_idx" ON "reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "reviews_is_approved_idx" ON "reviews" USING btree ("is_approved");--> statement-breakpoint
CREATE INDEX "unified_packages_title_idx" ON "unified_packages" USING btree ("title");--> statement-breakpoint
CREATE INDEX "unified_packages_operator_idx" ON "unified_packages" USING btree ("operator");--> statement-breakpoint
CREATE INDEX "unified_packages_retail_price_idx" ON "unified_packages" USING btree ("retail_price");--> statement-breakpoint
CREATE INDEX "unified_packages_data_mb_idx" ON "unified_packages" USING btree ("data_mb");--> statement-breakpoint
CREATE INDEX "unified_packages_validity_days_idx" ON "unified_packages" USING btree ("validity_days");--> statement-breakpoint
CREATE INDEX "unified_packages_destination_id_idx" ON "unified_packages" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "unified_packages_region_id_idx" ON "unified_packages" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "unified_packages_type_idx" ON "unified_packages" USING btree ("type");--> statement-breakpoint
CREATE INDEX "unified_packages_is_enabled_idx" ON "unified_packages" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "voucher_codes_code_idx" ON "voucher_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "voucher_codes_status_idx" ON "voucher_codes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "voucher_usage_voucher_id_idx" ON "voucher_usage" USING btree ("voucher_id");--> statement-breakpoint
CREATE INDEX "voucher_usage_user_id_idx" ON "voucher_usage" USING btree ("user_id");