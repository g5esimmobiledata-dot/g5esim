import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Globe, MapPin, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import ReactCountryFlag from 'react-country-flag';
import { useCurrency } from '@/contexts/CurrencyContext';
import { convertPrice, getCurrencySymbol } from '@/lib/currency';
import { useTranslation } from '@/contexts/TranslationContext';

interface Destination {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  minPrice?: string;
  currency?: string;
}

interface Region {
  id: string;
  name: string;
  slug: string;
  countries?: string[];
  image?: string;
  minPrice?: string;
  currency?: string;
}

interface GlobalPackage {
  id: string;
  title: string;
  dataAmount: string;
  validity: number;
  retailPrice: string;
  slug: string;
}

const regionIcons: Record<string, string> = {
  europe: 'EU',
  asia: 'AS',
  'north-america': 'NA',
  'south-america': 'SA',
  africa: 'AF',
  oceania: 'OC',
  'australia-and-oceania': 'AU',
  'middle-east': 'ME',
  'middle-east-and-north-africa': 'AE',
  caribbean: 'JM',
  'central-asia': 'KZ',
  'greater-china': 'CN',
  'usa-and-canada': 'US',
  gcc: 'SA',
  balkans: 'RS',
};

const popularCountryCodes = [
  'US',
  'GB',
  'JP',
  'DE',
  'FR',
  'IT',
  'ES',
  'AU',
  'CA',
  'TH',
  'AE',
  'KR',
];

export function DestinationsTabs() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('countries');
  const { currency, currencies } = useCurrency();
  const currencySymbol = getCurrencySymbol(currency, currencies);

  const { data: allDestinations = [], isLoading: loadingDestinations } = useQuery<Destination[]>({
    queryKey: ['/api/destinations/with-pricing'],
  });

  const { data: allRegions = [], isLoading: loadingRegions } = useQuery<Region[]>({
    queryKey: ['/api/regions/with-pricing'],
  });

  const { data: allGlobalPackages = [], isLoading: loadingGlobal } = useQuery<GlobalPackage[]>({
    queryKey: ['/api/packages/global'],
  });

  const popularDestinations = allDestinations
    .filter((d) => popularCountryCodes.includes(d.countryCode))
    .slice(0, 12);
  const destinations =
    popularDestinations.length > 0 ? popularDestinations : allDestinations.slice(0, 12);

  const regions = allRegions.filter((r) => r.name?.toLowerCase() !== 'global').slice(0, 12);

  const globalPackages = allGlobalPackages.slice(0, 6);

  const SkeletonCards = () => (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-border/50 h-full">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-muted animate-pulse mb-3" />
            <div className="h-4 w-20 bg-muted animate-pulse rounded mb-2" />
            <div className="h-3 w-16 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </>
  );

  return (
    <section className="relative bg-background py-16 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_18%,#0f172a_82%,#020617_100%)] md:py-24">
      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        <div className="absolute left-1/4 top-0 h-40 w-40 rounded-full bg-teal-500/6 blur-3xl" />
        <div className="absolute right-1/4 bottom-0 h-40 w-40 rounded-full bg-cyan-400/5 blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            {t('website.home.destinations.title', 'Where are you traveling next?')}
          </h2>
          <Link href="/destinations">
            <Button variant="ghost" className="text-primary hover:text-secondary dark:hover:text-white gap-1 p-0 h-auto">
              {t('website.home.destinations.seeAll', 'See all 200+ destinations')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className="
    mb-8
    max-w-full
    rounded-full
    bg-muted/50
    dark:bg-slate-900/70
    flex
    gap-1
    overflow-x-auto
    overflow-y-hidden
    whitespace-nowrap
    scrollbar-hide
    px-2 py-2
    md:overflow-visible
    md:w-fit
    md:px-1
  "
          >
            <div className="flex gap-1 min-w-max">
              <TabsTrigger
                value="countries"
                className="rounded-full px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base whitespace-nowrap data-[state=active]:bg-gradient-to-r from-primary to-primary-dark data-[state=active]:text-white flex items-center"
                data-testid="tab-countries"
              >
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">
                  {t('website.home.destinations.tabs.countries', 'Countries')}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="regional"
                className="rounded-full px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base whitespace-nowrap data-[state=active]:bg-gradient-to-r from-primary to-primary-dark data-[state=active]:text-white flex items-center"
                data-testid="tab-regional"
              >
                <Plane className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">
                  {t('website.home.destinations.tabs.regional', 'Regional eSIMs')}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="global"
                className="rounded-full px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base whitespace-nowrap data-[state=active]:bg-gradient-to-r from-primary to-primary-dark data-[state=active]:text-white flex items-center"
                data-testid="tab-global"
              >
                <Globe className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">
                  {t('website.home.destinations.tabs.global', 'Global eSIMs')}
                </span>
              </TabsTrigger>
            </div>
          </TabsList>

          <TabsContent value="countries" className="mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {loadingDestinations ? (
                <SkeletonCards />
              ) : destinations.length > 0 ? (
                destinations.map((destination) => (
                  <Link key={destination.id} href={`/destination/${destination.slug}`}>
                    <Card className="hover-elevate active-elevate-2 cursor-pointer border-border/50 h-full group">
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="h-14 w-14 rounded-full overflow-hidden mb-3 flex items-center justify-center bg-gradient-to-br from-teal-100 to-teal-50 dark:from-violet-950 dark:to-teal-900 shadow-sm group-hover:shadow-md transition-shadow">
                          <ReactCountryFlag
                            countryCode={destination.countryCode}
                            svg
                            style={{
                              width: '40px',
                              height: '40px',
                              objectFit: 'cover',
                              borderRadius: '50%',
                            }}
                          />
                        </div>
                        <h3 className="font-medium text-sm text-foreground mb-1 line-clamp-1">
                          {destination.name}
                        </h3>
                        {destination.minPrice && (
                          <p className="text-xs text-primary font-semibold">
                            {t('website.home.destinations.from', 'From')} {currencySymbol}
                            {convertPrice(
                              parseFloat(destination.minPrice),
                              'USD',
                              currency,
                              currencies,
                            ).toFixed(2)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <SkeletonCards />
              )}
            </div>
          </TabsContent>

          <TabsContent value="regional" className="mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {loadingRegions ? (
                <SkeletonCards />
              ) : regions.length > 0 ? (
                regions.map((region) => {
                  const iconCode = regionIcons[region.slug] || 'EU';
                  const countryCount = region.countries?.length || 0;

                  return (
                    <Link key={region.id} href={`/region/${region.slug}`}>
                      <Card className="hover-elevate active-elevate-2 cursor-pointer border-border/50 h-full group">
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <div className="h-14 w-14 rounded-full overflow-hidden mb-3 flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950 dark:to-amber-900 shadow-sm group-hover:shadow-md transition-shadow">
                            <ReactCountryFlag
                              countryCode={iconCode}
                              svg
                              style={{
                                width: '40px',
                                height: '40px',
                                objectFit: 'cover',
                                borderRadius: '50%',
                              }}
                            />
                          </div>
                          <h3 className="font-medium text-sm text-foreground mb-1 line-clamp-2">
                            {region.name}
                          </h3>
                          {countryCount > 0 && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {countryCount} {t('website.home.destinations.countries', 'countries')}
                            </p>
                          )}
                          {region.minPrice && (
                            <p className="text-xs text-orange-500 font-semibold">
                              {t('website.home.destinations.from', 'From')} {currencySymbol}
                              {convertPrice(
                                parseFloat(region.minPrice),
                                'USD',
                                currency,
                                currencies,
                              ).toFixed(2)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })
              ) : (
                <SkeletonCards />
              )}
            </div>
          </TabsContent>

          <TabsContent value="global" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingGlobal ? (
                <>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="border-border/50">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                        <div className="flex-1">
                          <div className="h-4 w-32 bg-muted animate-pulse rounded mb-2" />
                          <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                        </div>
                        <div className="h-5 w-16 bg-muted animate-pulse rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : globalPackages.length > 0 ? (
                globalPackages.map((pkg) => (
                  <Link key={pkg.id} href="/global">
                    <Card className="hover-elevate active-elevate-2 cursor-pointer border-border/50 h-full group bg-muted/30">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                          <Globe className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-foreground">
                            {t('website.home.destinations.global', 'Global')} ({pkg.dataAmount})
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {pkg.validity}{' '}
                            {t('website.home.destinations.daysValidity', 'days validity')}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-semibold text-foreground">
                            {currencySymbol}
                            {convertPrice(
                              parseFloat(pkg.retailPrice),
                              'USD',
                              currency,
                              currencies,
                            ).toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">{currency}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {t(
                      'website.home.destinations.globalComingSoon',
                      'Global eSIM packages coming soon!',
                    )}
                  </p>
                  <Link href="/destinations">
                    <Button variant="ghost" className="text-orange-500 mt-2">
                      {t('website.home.destinations.browseAll', 'Browse all destinations')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
