import { db } from "./db";
import { currencyRates } from "@shared/schema";

const defaultCurrencies = [
  { code: "USD", name: "US Dollar", symbol: "$", conversionRate: "1.000000", isDefault: true },
  { code: "EUR", name: "Euro", symbol: "€", conversionRate: "0.920000" },
  { code: "GBP", name: "British Pound", symbol: "£", conversionRate: "0.790000" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", conversionRate: "1.360000" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", conversionRate: "1.520000" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", conversionRate: "149.500000" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", conversionRate: "7.240000" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", conversionRate: "83.120000" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", conversionRate: "4.980000" },
  { code: "MXN", name: "Mexican Peso", symbol: "$", conversionRate: "17.050000" },
];

async function seedCurrencies() {
  console.log("Seeding default currencies...");
  
  for (const currency of defaultCurrencies) {
    try {
      await db.insert(currencyRates).values(currency).onConflictDoNothing();
      console.log(`✓ Added ${currency.code} - ${currency.name}`);
    } catch (error) {
      console.log(`× Skipped ${currency.code} (already exists)`);
    }
  }
  
  console.log("Currency seeding complete!");
  process.exit(0);
}

seedCurrencies().catch((error) => {
  console.error("Error seeding currencies:", error);
  process.exit(1);
});
