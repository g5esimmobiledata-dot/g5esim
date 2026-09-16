import { Link } from 'wouter';
import { ArrowRight, Star, Wifi, Phone, MessageSquare, Calendar, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import ReactCountryFlag from 'react-country-flag';
import { useCurrency } from '@/contexts/CurrencyContext';
import { convertPrice, getCurrencySymbol } from '@/lib/currency';
import { useTranslation } from '@/contexts/TranslationContext';
import { CompletePackageType, PlanCommonCardProps } from '@/types/types';
import { PlanCommonCard } from '../PlanCommonCard';

export function PopularEsims() {
  const { t } = useTranslation();
  const { currency, currencies } = useCurrency();
  const currencySymbol = getCurrencySymbol(currency, currencies);

  const { data: packages = [], isLoading } = useQuery<CompletePackageType[]>({
    queryKey: ['/api/packages/featured'],
  });

  const { data: stats } = useQuery<{ totalPackages: number; totalDestinations: number }>({
    queryKey: ['/api/packages/stats'],
  });

  const popularPackages = packages.slice(0, 4);

  const calculatePerDay = (price: string, days: number) => {
    const priceNum = parseFloat(price);
    const convertedPrice = convertPrice(priceNum, 'USD', currency, currencies);
    return convertedPrice / days;
  };

  const transformPackageToCardProps = (pkg: CompletePackageType): PlanCommonCardProps => {
    const convertedPrice = convertPrice(parseFloat(pkg.retailPrice), 'USD', currency, currencies);

    // console.log('pkg', pkg)
    return {
      id: pkg.id,
      countryCode: pkg.destination?.countryCode || pkg.countryCode || undefined,
      countryName: pkg.destination?.name || pkg.countryName || pkg.region?.name || 'Global',
      dataAmount: pkg.dataAmount,
      validity: pkg.validity,
      price: convertedPrice.toFixed(2),
      pricePerDay: calculatePerDay(pkg.retailPrice, pkg.validity).toFixed(2),
      currencySymbol,
      voiceMinutes: pkg.voiceMinutes,
      smsCount: pkg.smsCount,
      destinationSlug: pkg.destination?.slug,
      regionSlug: pkg.region?.slug,
      isComplete: true,
      slug: pkg.slug,
    };
  };

  const isUnlimited = (dataAmount: string) => {
    return dataAmount?.toLowerCase().includes('unlimited') || dataAmount === '-1MB';
  };

  const formatDataAmount = (dataAmount: string) => {
    if (isUnlimited(dataAmount)) return t('website.home.popular.unlimited', 'UNLIMITED');
    return dataAmount;
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

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-gradient-to-r from-primary to-secondary  text-white px-4 py-1.5 rounded-full">
            <Star className="h-3.5 w-3.5 mr-1.5" />
            {t('website.home.popular.badge', 'Most {count} Popular eSIMs', {
              count: popularPackages.length || 4,
            })}
          </Badge>

          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {t('website.home.popular.title', 'Popular eSIMs')}
          </h2>

          <p className="text-muted-foreground mb-6">
            {t(
              'website.home.popular.subtitle',
              'Choose from {packages} total packages across {destinations}+ destinations',
              {
                packages: stats?.totalPackages?.toLocaleString() || '1800+',
                destinations: stats?.totalDestinations || '200',
              },
            )}
          </p>

          <Link href="/populer-packages">
            <Button className="bg-button-gradient text-white rounded-full px-6">
              {t('website.home.popular.viewAll', 'View All Popular Packages')}
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading
            ? Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={`skeleton-${i}`} className="w-full sm:w-80 max-w-[300px]">
                  <SkeletonCard />
                </div>
              ))
            : popularPackages.map((pkg) => (
              <PlanCommonCard {...transformPackageToCardProps(pkg)} />
            ))}
        </div>
      </div>
    </section>
  );
}
