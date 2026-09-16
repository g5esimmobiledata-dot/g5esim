ALTER TABLE "orders" DROP CONSTRAINT "orders_package_id_airalo_packages_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_package_id_unified_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."unified_packages"("id") ON DELETE no action ON UPDATE no action;