import { autoPackageSelectionService } from "../services/packages/auto-package-selection";

async function runAutoSelection() {
  console.log('🚀 Running auto package selection with normalized package matching...\n');
  
  const result = await autoPackageSelectionService.runAutoSelection();
  
  console.log('\n📊 Auto Selection Results:');
  console.log(`   Mode: ${result.mode}`);
  console.log(`   Packages enabled: ${result.packagesEnabled}`);
  console.log(`   Packages disabled: ${result.packagesDisabled}`);
  
  if (result.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered:`);
    result.errors.forEach(err => console.log(`   - ${err}`));
  }
}

runAutoSelection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Auto selection failed:', error);
    process.exit(1);
  });
