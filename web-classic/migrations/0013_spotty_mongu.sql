CREATE TYPE "public"."payment_provider" AS ENUM('stripe', 'razorpay', 'paypal', 'paystack');--> statement-breakpoint
CREATE TABLE "payment_gateways" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"public_key" varchar(255),
	"secret_key" varchar(255),
	"webhook_secret" varchar(255),
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
