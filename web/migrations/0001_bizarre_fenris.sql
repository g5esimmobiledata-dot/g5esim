CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"sender_type" text NOT NULL,
	"sender_name" text NOT NULL,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_order_id_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."ticket_status";--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "status" SET DATA TYPE "public"."ticket_status" USING "status"::"public"."ticket_status";--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "priority" SET DEFAULT 'medium'::"public"."ticket_priority";--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "priority" SET DATA TYPE "public"."ticket_priority" USING "priority"::"public"."ticket_priority";--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "user_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "assigned_to_id" varchar;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "assigned_to_name" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "resolved_at" timestamp;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_id_admins_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" DROP COLUMN "order_id";--> statement-breakpoint
ALTER TABLE "tickets" DROP COLUMN "subject";--> statement-breakpoint
ALTER TABLE "tickets" DROP COLUMN "message";