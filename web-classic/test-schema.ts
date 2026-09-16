import { pgTable, varchar, integer, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

const bulkQuotes = pgTable("bulk_quotes", {
  id: varchar("id"),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  validUntil: timestamp("valid_until").notNull(),
});

const schema = createInsertSchema(bulkQuotes);
console.log("Schema shape:", schema.shape);
