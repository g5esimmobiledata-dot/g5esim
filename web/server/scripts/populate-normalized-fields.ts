import { db } from "../db";
import { unifiedPackages } from "@shared/schema";
import { packageNormalizer } from "../services/packages/package-normalizer";
import { eq } from "drizzle-orm";

async function populateNormalizedFields() {
  console.log('🔄 Populating normalized fields for existing packages...');
  
  const allPackages = await db.select().from(unifiedPackages);
  console.log(`   Found ${allPackages.length} packages to update`);
  
  let updated = 0;
  for (const pkg of allPackages) {
    const normalized = packageNormalizer.normalizePackageData({
      dataAmount: pkg.dataAmount,
      validity: pkg.validity,
      voiceCredits: pkg.voiceCredits,
      smsCredits: pkg.smsCredits,
      isUnlimited: pkg.isUnlimited,
    });
    
    await db.update(unifiedPackages)
      .set({
        dataMb: normalized.dataMb,
        validityDays: normalized.validityDays,
        voiceMinutes: normalized.voiceMinutes,
        smsCount: normalized.smsCount,
      })
      .where(eq(unifiedPackages.id, pkg.id));
    
    updated++;
    if (updated % 100 === 0) {
      console.log(`   Updated ${updated}/${allPackages.length}...`);
    }
  }
  
  console.log(`✅ Updated ${updated} packages with normalized data`);
}

populateNormalizedFields()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
