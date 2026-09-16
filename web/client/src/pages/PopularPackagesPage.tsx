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
import { PlanCommonCard } from '@/components/PlanCommonCard';

const PopularPackagesPage = () => {
  const { t } = useTranslation();
  const { currency, currencies } = useCurrency();
  const currencySymbol = getCurrencySymbol(currency, currencies);

  const { data: packages = [], isLoading } = useQuery<CompletePackageType[]>({
    queryKey: ['/api/packages/featured'],
  });

  const { data: stats } = useQuery<{ totalPackages: number; totalDestinations: number }>({
    queryKey: ['/api/packages/stats'],
  });

  const calculatePerDay = (price: string, days: number) => {
    const priceNum = parseFloat(price);
    const convertedPrice = convertPrice(priceNum, 'USD', currency, currencies);
    return convertedPrice / days;
  };

  const transformPackageToCardProps = (pkg: CompletePackageType): PlanCommonCardProps => {
    const convertedPrice = convertPrice(parseFloat(pkg.retailPrice), 'USD', currency, currencies);

    return {
      id: pkg.id,
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
    <Card className="border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
      <CardContent className="p-0">
        <div className="p-5">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 animate-pulse rounded mb-4" />
          <div className="flex gap-6 mb-4">
            <div className="h-10 w-16 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
            <div className="h-10 w-16 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
            <div className="h-10 w-16 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
          </div>
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 animate-pulse rounded mb-2" />
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 animate-pulse rounded mb-4" />
          <div className="space-y-2 mb-4">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
          </div>
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 animate-pulse rounded mb-2" />
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background ">
      {/* Hero Section */}
      <section className="py-12 md:py-32 border-b border-gray-200 dark:border-gray-800 ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="mb-4 bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-1.5 rounded-full">
              <Star className="h-3.5 w-3.5 mr-1.5" />
              {t('website.home.popular.badge', 'Most Popular eSIMs')}
            </Badge>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {t('website.home.popular.title', 'Popular Packages')}
            </h1>

            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 max-w-3xl mx-auto">
              {t(
                'website.home.popular.subtitle',
                'Choose from {packages} total packages across {destinations}+ destinations',
                {
                  packages: stats?.totalPackages?.toLocaleString() || '1800+',
                  destinations: stats?.totalDestinations || '200',
                },
              )}
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm">Instant Activation</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm">24/7 Support</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm">No Hidden Fees</span>
              </div>
            </div>

            <Link href="/destinations">
              <Button className="bg-button-gradient text-white rounded-full text-base hover:shadow-lg transition-all">
                {t('website.home.popular.viewAll', 'View All Destinations')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Packages Grid Section */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Popular Packages
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {isLoading
                ? 'Loading Packages...'
                : `Showing ${packages.length} popular eSIM packages`}
            </p>
          </div>

          {/* Packages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoading
              ? Array(8)
                  .fill(0)
                  .map((_, i) => <SkeletonCard key={`skeleton-${i}`} />)
              : packages.map((pkg) => (
                  <PlanCommonCard key={pkg.id} {...transformPackageToCardProps(pkg)} />
                ))}
          </div>

          {/* Empty State */}
          {!isLoading && packages.length === 0 && (
            <div className="text-center py-16">
              <div className="mb-4">
                <Wifi className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Packages available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We're currently updating our package offerings. Please check back soon!
              </p>
              <Link href="/destinations">
                <Button className="bg-button-gradient text-white rounded-full px-6">
                  Browse All Destinations
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Can't find what you're looking for?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Explore all destinations or contact our support team for personalized recommendations.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/destinations">
              <Button className="bg-button-gradient text-white rounded-full px-6">
                View All Destinations
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                className="rounded-full px-6 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PopularPackagesPage;
