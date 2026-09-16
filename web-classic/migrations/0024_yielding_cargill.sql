CREATE TYPE "public"."contact_status" AS ENUM('new', 'read', 'replied', 'closed');--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(180) NOT NULL,
	"subject" varchar(250) NOT NULL,
	"message" text NOT NULL,
	"status" "contact_status" DEFAULT 'new',
	"is_spam" boolean DEFAULT false,
	"ip_address" varchar(100),
	"user_agent" text,
	"admin_notes" text,
	"replied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_plans_packages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar NOT NULL,
	"slug" text NOT NULL,
	"destination_id" varchar,
	"region_id" varchar,
	"title" text NOT NULL,
	"data_amount" text NOT NULL,
	"data_mb" integer NOT NULL,
	"validity" integer NOT NULL,
	"wholesale_price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"type" text NOT NULL,
	"operator" text,
	"operator_image" text,
	"coverage" text[],
	"is_unlimited" boolean DEFAULT false NOT NULL,
	"voice_credits" integer DEFAULT 0,
	"sms_credits" integer DEFAULT 0,
	"active" boolean DEFAULT true NOT NULL,
	"data_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "data_plans_packages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "data_plans_packages" ADD CONSTRAINT "data_plans_packages_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_plans_packages" ADD CONSTRAINT "data_plans_packages_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_plans_packages" ADD CONSTRAINT "data_plans_packages_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;