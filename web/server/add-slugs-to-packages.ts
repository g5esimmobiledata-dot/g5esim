import { db } from "./db";
import { packages, destinations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { generatePackageSlug } from "./utils/slug";

async function addSlugsToPackages() {
  console.log("📦 Adding slugs to existing packages...");

  const allPackages = await db.select().from(packages);
  console.log(`Found ${allPackages.length} packages to update`);

  for (const pkg of allPackages) {
    let destinationName = "";
    
    if (pkg.destinationId) {
      const [dest] = await db.select().from(destinations).where(eq(destinations.id, pkg.destinationId));
      if (dest) {
        destinationName = dest.name;
      }
    }

    const slug = generatePackageSlug(
      destinationName || "package",
      pkg.dataAmount,
      pkg.validity
    );

    await db.update(packages)
      .set({ slug })
      .where(eq(packages.id, pkg.id));

    console.log(`✓ Updated package: ${pkg.title} -> ${slug}`);
  }

  console.log("✨ All packages updated with slugs!");
}

addSlugsToPackages()
  .catch((error) => {
    console.error("❌ Error adding slugs:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
