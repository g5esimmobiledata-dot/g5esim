CREATE TABLE "price_brackets" (
	"id" varchar PRIMARY KEY NOT NULL,
	"min_price" numeric(10, 2) NOT NULL,
	"max_price" numeric(10, 2),
	"product_id" text NOT NULL,
	"android_status" text DEFAULT 'pending' NOT NULL,
	"android_sync_error" text,
	"android_last_sync_at" timestamp,
	"apple_status" text DEFAULT 'pending' NOT NULL,
	"apple_sync_error" text,
	"apple_last_sync_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
