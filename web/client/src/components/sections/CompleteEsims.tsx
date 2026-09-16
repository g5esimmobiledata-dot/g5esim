import { Link } from 'wouter';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/contexts/TranslationContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { convertPrice, getCurrencySymbol } from '@/lib/currency';
import { PlanCommonCard } from '@/components/PlanCommonCard';
import { Card, CardContent } from '@/components/ui/card';
import { CompletePackageType, PlanCommonCardProps } from '@/types/types';

export function CompleteEsims() {
  const { t } = useTranslation();
  const { currency, currencies } = useCurrency();
  const currencySymbol = getCurrencySymbol(currency, currencies);

  const { data: packages = [], isLoading } = useQuery<CompletePackageType[]>({
    queryKey: ['/api/packages/complete'],
  });

  const completePackages = packages.slice(0, 4);

  console.log('completePackages', completePackages);

  const calculatePerDay = (price: string, days: number) => {
    const priceNum = parseFloat(price);
    const convertedPrice = convertPrice(priceNum, 'USD', currency, currencies);
    return convertedPrice / days;
  };

  const transformPackageToCardProps = (pkg: CompletePackageType): PlanCommonCardProps => {
    const convertedPrice = convertPrice(parseFloat(pkg.retailPrice), 'USD', currency, currencies);

    return {
      id: pkg.id,
      title: pkg.title,
      countryCode: pkg.destination?.countryCode || pkg.countryCode || undefined,
      countryName: pkg.destination?.name || pkg.countryName || 'Global',
      dataAmount: pkg.dataAmount,
      validity: pkg.validity,
      price: convertedPrice.toFixed(2),
      pricePerDay: calculatePerDay(pkg.retailPrice, pkg.validity).toFixed(2),
      currencySymbol,
      voiceMinutes: pkg.voiceMinutes,
      smsCount: pkg.smsCount,
      destinationSlug: pkg.destination?.slug,
      isComplete: true,
    };
  };

  const SkeletonCard = () => (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-0">
        <div className="p-5">
          <div className="h-6 w-32 bg-muted animate-pulse rounded mb-4" />
          <div className="flex gap-6 mb-4">
            <div className="h-10 w-16 bg-muted animate-pulse rounded" />
            <div className="h-10 w-16 bg-muted animate-pulse rounded" />
            <div className="h-10 w-16 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-8 w-24 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-20 bg-muted animate-pulse rounded mb-4" />
          <div className="space-y-2 mb-4">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-28 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-full bg-muted animate-pulse rounded mb-2" />
          <div className="h-10 w-full bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );

  if (!isLoading && completePackages.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-violet-50 to-white dark:from-violet-950/30 dark:to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-1.5 rounded-full">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {t("website.home.complete.badge", "All-in-One Plans")}
          </Badge>

          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {t("website.home.complete.title", "Data + Voice + SMS")}
          </h2>

          <p className="text-muted-foreground mb-6">
            {t("website.home.complete.subtitle", "Complete connectivity with data, voice calls, and text messaging included")}
          </p>

          <Link href="/destinations">
            <Button className="bg-primary-gradient hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white rounded-full px-6">
              {t("website.home.complete.viewAll", "View All Complete Plans")}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            completePackages.map((pkg) => (
              <PlanCommonCard key={pkg.id} {...transformPackageToCardProps(pkg)} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
