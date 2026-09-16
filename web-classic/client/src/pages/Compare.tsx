import { Link } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { X, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { SiteHeader } from "@/components/layout/SiteHeader";
// import { SiteFooter } from "@/components/layout/SiteFooter";
import { useComparison } from '@/contexts/ComparisonContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation } from '@/contexts/TranslationContext';

export default function Compare() {
  const { comparisonItems, removeFromComparison, clearComparison } = useComparison();
  const { currency, currencies } = useCurrency();
  const { t } = useTranslation();

  const getCurrencySymbol = (currencyCode: string) => {
    return currencies.find((c) => c.code === currencyCode)?.symbol || '$';
  };

  // Find the lowest price package
  const lowestPriceId =
    comparisonItems.length > 0
      ? comparisonItems.reduce((min, pkg) =>
          parseFloat(pkg.price) < parseFloat(min.price) ? pkg : min,
        ).id
      : null;

  // Check if there are differences in data amounts
  const hasDataDifferences =
    comparisonItems.length > 1 && new Set(comparisonItems.map((p) => p.dataAmount)).size > 1;

  // Check if there are differences in validity
  const hasValidityDifferences =
    comparisonItems.length > 1 && new Set(comparisonItems.map((p) => p.validity)).size > 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{String(t('comparison.title', 'Compare eSIM Packages'))} | eSIM Global</title>
        <meta
          name="description"
          content="Compare up to 4 eSIM Packages side-by-side to find the best deal for your travel needs."
        />
        <meta
          property="og:title"
          content={`${String(t('comparison.title', 'Compare eSIM Packages'))} | eSIM Global`}
        />
        <meta
          property="og:description"
          content="Compare up to 4 eSIM Packages side-by-side to find the best deal for your travel needs."
        />
      </Helmet>

      {/* <SiteHeader /> */}

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">
                {t('comparison.title', 'Compare eSIM Packages')}
              </h1>
              {comparisonItems.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('comparison.comparingPackages', 'Comparing {{count}} package(s)', {
                    count: comparisonItems.length,
                  })}
                </p>
              )}
            </div>
            {comparisonItems.length > 0 && (
              <Button
                variant="outline"
                onClick={clearComparison}
                data-testid="button-clear-comparison"
              >
                {t('comparison.clearAll', 'Clear All')}
              </Button>
            )}
          </div>

          {/* Empty State */}
          {comparisonItems.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="max-w-md mx-auto">
                  <h2 className="text-xl font-medium mb-2">
                    {t('comparison.emptyState', 'No packages selected for comparison')}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {t(
                      'comparison.emptyStateDesc',
                      'Add up to 4 packages to compare their features and prices',
                    )}
                  </p>
                  <Link href="/">
                    <Button data-testid="button-browse-plans">
                      {t('comparison.browsePlans', 'Browse Plans')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comparison Table */}
          {comparisonItems.length > 0 && (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${comparisonItems.length}, 1fr)` }}
                >
                  {comparisonItems.map((pkg) => (
                    <Card
                      key={pkg.id}
                      className="relative"
                      data-testid={`card-comparison-${pkg.id}`}
                    >
                      <CardHeader className="space-y-4 pb-4">
                        {/* Remove Button */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-2 right-2 h-8 w-8"
                          onClick={() => removeFromComparison(pkg.id)}
                          data-testid={`button-remove-comparison-${pkg.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>

                        {/* Package Title */}
                        <div className="pr-8">
                          <h3
                            className="font-semibold text-lg leading-tight"
                            data-testid={`text-title-${pkg.id}`}
                          >
                            {pkg.title}
                          </h3>
                        </div>

                        {/* Destination/Region */}
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            {t('comparison.destination', 'Destination')}
                          </div>
                          <div className="font-medium" data-testid={`text-destination-${pkg.id}`}>
                            {pkg.destination?.name || pkg.region?.name || 'N/A'}
                          </div>
                        </div>

                        {/* Data Amount */}
                        <div
                          className={
                            hasDataDifferences ? 'bg-accent/30 -mx-6 px-6 py-2 rounded' : ''
                          }
                        >
                          <div className="text-xs text-muted-foreground mb-1">
                            {t('comparison.dataAmount', 'Data Amount')}
                          </div>
                          <div
                            className="font-semibold text-lg"
                            data-testid={`text-data-${pkg.id}`}
                          >
                            {pkg.dataAmount}
                            {pkg.isUnlimited && (
                              <Badge variant="secondary" className="ml-2">
                                {t('destinationDetails.unlimitedData', 'Unlimited')}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Validity */}
                        <div
                          className={
                            hasValidityDifferences ? 'bg-accent/30 -mx-6 px-6 py-2 rounded' : ''
                          }
                        >
                          <div className="text-xs text-muted-foreground mb-1">
                            {t('comparison.validity', 'Validity')}
                          </div>
                          <div className="font-medium" data-testid={`text-validity-${pkg.id}`}>
                            {pkg.validity} {t('destinations.days', 'Days')}
                          </div>
                        </div>

                        {/* Price */}
                        <div
                          className={
                            pkg.id === lowestPriceId
                              ? 'bg-green-500/20 -mx-6 px-6 py-2 rounded'
                              : ''
                          }
                        >
                          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                            {t('comparison.price', 'Price')}
                            {pkg.id === lowestPriceId && (
                              <Badge variant="default" className="bg-green-600">
                                {t('comparison.lowestPrice', 'Lowest Price')}
                              </Badge>
                            )}
                          </div>
                          <div className="font-bold text-2xl" data-testid={`text-price-${pkg.id}`}>
                            {getCurrencySymbol(pkg.currency)}
                            {pkg.price}
                          </div>
                        </div>

                        {/* Operator */}
                        {pkg.operator && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              {t('comparison.operator', 'Operator')}
                            </div>
                            <div className="font-medium" data-testid={`text-operator-${pkg.id}`}>
                              {pkg.operator}
                            </div>
                          </div>
                        )}

                        {/* Type */}
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            {t('packageDetails.type', 'Type')}
                          </div>
                          <Badge variant="outline" data-testid={`badge-type-${pkg.id}`}>
                            {pkg.type}
                          </Badge>
                        </div>

                        {/* Best Price Badge */}
                        {pkg.isBestPrice && (
                          <div>
                            <Badge variant="default" data-testid={`badge-best-price-${pkg.id}`}>
                              {t('destinationDetails.bestPrice', 'Best Price')}
                            </Badge>
                          </div>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-2">
                        {/* Buy Now Button */}
                        <Link href={`/checkout/${pkg.slug}`}>
                          <Button className="w-full gap-2" data-testid={`button-buy-${pkg.id}`}>
                            <ShoppingCart className="h-4 w-4" />
                            {t('comparison.buyNow', 'Buy Now')}
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* <SiteFooter /> */}
    </div>
  );
}
