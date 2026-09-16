CREATE TABLE "payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"user_id" varchar,
	"guest_access_token" text,
	"provider" text NOT NULL,
	"provider_payment_id" text,
	"provider_order_id" text,
	"provider_signature" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"base_amount" numeric(10, 2),
	"base_currency" text,
	"status" text DEFAULT 'created' NOT NULL,
	"refunded_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"metadata" jsonb,
	"source" text DEFAULT 'website',
	"webhook_event_id" text,
	"webhook_payload" jsonb,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supported_currency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"currency_id" uuid NOT NULL,
	"payment_gateway_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supported_currency" ADD CONSTRAINT "supported_currency_currency_id_currency_rates_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currency_rates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supported_currency" ADD CONSTRAINT "supported_currency_payment_gateway_id_payment_gateways_id_fk" FOREIGN KEY ("payment_gateway_id") REFERENCES "public"."payment_gateways"("id") ON DELETE cascade ON UPDATE no action;