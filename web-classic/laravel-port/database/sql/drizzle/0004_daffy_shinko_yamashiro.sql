ALTER TABLE "users" ADD COLUMN "currency" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "destination" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_currency_currency_rates_id_fk" FOREIGN KEY ("currency") REFERENCES "public"."currency_rates"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_destination_destinations_id_fk" FOREIGN KEY ("destination") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE cascade;