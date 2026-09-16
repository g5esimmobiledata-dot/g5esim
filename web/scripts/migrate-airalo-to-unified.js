import { db } from '../server/db.js';
import { unifiedPackages, providers, airaloPackages } from '../shared/schema.js';
import { eq, sql } from 'drizzle-orm';

async function migrateAiraloPackages() {
  try {
    console.log('Starting Airalo packages migration to unified_packages...');
    
    // Get Airalo provider
    const [airaloProvider] = await db.select().from(providers).where(eq(providers.slug, 'airalo'));
    
    if (!airaloProvider) {
      console.error('Airalo provider not found!');
      return;
    }
    
    console.log(`Found Airalo provider: ${airaloProvider.id}`);
    
    // Get all Airalo packages
    const packages = await db.select().from(airaloPackages);
    console.log(`Found ${packages.length} Airalo packages to migrate`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const pkg of packages) {
      try {
        // Check if already exists in unified_packages
        const [existing] = await db.select()
          .from(unifiedPackages)
          .where(eq(unifiedPackages.providerPackageId, pkg.id))
          .limit(1);
        
        if (existing) {
          skipped++;
          continue;
        }
        
        // Calculate wholesale price (use airaloPrice or price)
        const wholesalePrice = pkg.airaloPrice || pkg.price;
        if (!wholesalePrice) {
          console.warn(`Skipping package ${pkg.id} - no price found`);
          errors++;
          continue;
        }
        
        // Calculate retail price based on provider margin
        const margin = parseFloat(airaloProvider.pricingMargin);
        const wholesale = parseFloat(wholesalePrice);
        const retail = wholesale * (1 + margin / 100);
        
        // Insert into unified_packages
        await db.insert(unifiedPackages).values({
          providerId: airaloProvider.id,
          providerPackageTable: 'airalo_packages',
          providerPackageId: pkg.id,
          destinationId: pkg.destinationId,
          regionId: null,
          slug: pkg.slug,
          title: pkg.title,
          dataAmount: pkg.data,
          validity: pkg.validity,
          type: pkg.type,
          wholesalePrice: wholesale.toFixed(2),
          retailPrice: retail.toFixed(2),
          currency: 'USD',
          operator: pkg.operator,
          operatorImage: pkg.operatorImage,
          coverage: pkg.countries || [],
          voiceCredits: pkg.voiceMinutes || 0,
          smsCredits: pkg.smsCredits || 0,
          isUnlimited: pkg.isUnlimited || false,
          isEnabled: false, // Start disabled, let auto-selection handle it
          isBestPrice: false,
          manualOverride: false,
          isPopular: false,
          isTrending: false,
          isRecommended: false,
          isBestValue: false,
          salesCount: 0
        });
        
        migrated++;
        
        if (migrated % 100 === 0) {
          console.log(`Progress: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
        }
      } catch (error) {
        console.error(`Error migrating package ${pkg.id}:`, error.message);
        errors++;
      }
    }
    
    console.log('Migration completed!');
    console.log(`Total: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    
    // Get final count
    const countResult = await db.select({ count: sql`count(*)` })
      .from(unifiedPackages)
      .where(eq(unifiedPackages.providerId, airaloProvider.id));
    
    console.log(`Airalo packages in unified_packages: ${countResult[0].count}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
  
  process.exit(0);
}

migrateAiraloPackages();