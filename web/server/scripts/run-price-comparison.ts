import { priceComparisonService } from "../services/packages/price-comparison";

async function runPriceComparison() {
  console.log('🚀 Running price comparison with normalized package matching...\n');
  
  const result = await priceComparisonService.runPriceComparison();
  
  console.log('\n📊 Price Comparison Results:');
  console.log(`   Total packages: ${result.totalPackages}`);
  console.log(`   Best price packages: ${result.bestPricePackages}`);
  
  if (result.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered:`);
    result.errors.forEach(err => console.log(`   - ${err}`));
  }
  
  // Get statistics
  const stats = await priceComparisonService.getStatistics();
  console.log('\n📈 Statistics by Provider:');
  console.log('   Total packages:');
  Object.entries(stats.packagesByProvider).forEach(([provider, count]) => {
    console.log(`      ${provider}: ${count}`);
  });
  console.log('   Best price packages:');
  Object.entries(stats.bestPriceByProvider).forEach(([provider, count]) => {
    console.log(`      ${provider}: ${count}`);
  });
}

runPriceComparison()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Price comparison failed:', error);
    process.exit(1);
  });
