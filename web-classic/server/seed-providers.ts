import { db } from "./db";
import { providers, settings, type InsertProvider } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

async function seedProviders() {
  console.log("🌱 Seeding providers and settings...");

  try {
    // ---------------- All Providers ----------------
    const allProviders: InsertProvider[] = [
      {
        name: "Airalo",
        slug: "airalo",
        apiBaseUrl: "https://api.airalo.com/v2",
        enabled: true,
        isPreferred: true,
        pricingMargin: "20.00",
        syncIntervalMinutes: 1440,
        apiRateLimitPerHour: 1000,
        webhookSecret: null,
      },
      {
        name: "eSIM Access",
        slug: "esim-access",
        apiBaseUrl: "https://api.esimaccess.com",
        enabled: false,
        isPreferred: false,
        pricingMargin: "20.00",
        syncIntervalMinutes: 1440,
        apiRateLimitPerHour: 480,
        webhookSecret: null,
      },
      {
        name: "eSIM Go",
        slug: "esim-go",
        apiBaseUrl: "https://api.esim-go.com/v2.5",
        enabled: false,
        isPreferred: false,
        pricingMargin: "20.00",
        syncIntervalMinutes: 1440,
        apiRateLimitPerHour: 3600,
        webhookSecret: null,
      },
      {
        name: "Maya Mobile",
        slug: "maya",
        apiBaseUrl: "https://api.mayamobile.com",
        enabled: false,
        isPreferred: false,
        pricingMargin: "20.00",
        syncIntervalMinutes: 1440,
        apiRateLimitPerHour: 3600,
        webhookSecret: null,
      },
      {
        name: "Airhub",
        slug: "airhub",
        apiBaseUrl: "https://api.airhubapp.com",
        enabled: false,
        isPreferred: false,
        pricingMargin: "20.00",
        syncIntervalMinutes: 1440,
        apiRateLimitPerHour: 1000,
        webhookSecret: null,
      },
    ];

    // ---------------- Existing Providers ----------------
    const existing = await db.query.providers.findMany({
      columns: { slug: true },
    });

    const existingSlugs = new Set(existing.map(p => p.slug));

    // ---------------- Filter Missing ----------------
    const providersToInsert = allProviders.filter(
      p => !existingSlugs.has(p.slug)
    );

    if (providersToInsert.length === 0) {
      console.log("⚠️  All providers already exist. Nothing to insert.");
    } else {
      console.log(`📦 Inserting ${providersToInsert.length} new provider(s)...`);

      const inserted = await db
        .insert(providers)
        .values(providersToInsert)
        .returning();

      inserted.forEach(p =>
        console.log(`   ✓ ${p.name} (${p.slug}) inserted`)
      );
    }

    // ---------------- Settings (seed once) ----------------
    const settingsCount = await db.query.settings.findMany({ limit: 1 });

    if (settingsCount.length === 0) {
      const airalo = await db.query.providers.findFirst({
        where: eq(providers.slug, "airalo"),
      });

      if (!airalo) throw new Error("Airalo provider not found");

      await db.insert(settings).values([
        {
          key: "package_selection_mode",
          value: "auto",
          category: "general",
        },
        {
          key: "preferred_provider_id",
          value: airalo.id,
          category: "general",
        },
      ]);

      console.log("⚙️  Default settings created");
    } else {
      console.log("⚠️  Settings already exist. Skipping.");
    }

    console.log("\n🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

seedProviders()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

export { seedProviders };
