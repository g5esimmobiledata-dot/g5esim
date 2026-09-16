ALTER TABLE "pages" ALTER COLUMN "title" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "pages" ALTER COLUMN "slug" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "meta_title" varchar(255);--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "meta_description" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "is_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" DROP COLUMN "published";--> statement-breakpoint
ALTER TABLE "pages" DROP COLUMN "display_order";