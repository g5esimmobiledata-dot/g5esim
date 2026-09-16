ALTER TABLE "users" ADD COLUMN "firebase_uid" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid");