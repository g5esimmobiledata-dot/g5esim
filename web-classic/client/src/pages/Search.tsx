import { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation } from '@/contexts/TranslationContext';
import type { Destination } from '@shared/schema';

interface SearchPackage {
  id: string;
  slug: string;
  title: string;
  dataAmount: string;
  validity: number;
  price: string;
  currency: string;
  type: string;
  isUnlimited: boolean;
  isBestPrice: boolean;
  operator: string;
  destination?: {
    id: string;
    name: string;
    slug: string;
    flagEmoji: string | null;
  };
  region?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface SearchResponse {
  packages: SearchPackage[];
  total: number;
}

export default function Search() {
  const { t } = useTranslation();
  const { currency, currencies } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDestination, setSelectedDestination] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 200]);
  const [selectedDataAmounts, setSelectedDataAmounts] = useState<string[]>([]);
  const [selectedValidities, setSelectedValidities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('default');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Get currency symbol
  const getCurrencySymbol = (currencyCode: string) => {
    return currencies.find((c) => c.code === currencyCode)?.symbol || '$';
  };

  // Fetch destinations for filter dropdown
  const { data: destinations } = useQuery<Destination[]>({
    queryKey: ['/api/destinations'],
  });

  // Build search parameters
  const searchParams = useMemo(() => {
    const params = new URLSearchParams();

    if (debouncedQuery) params.append('q', debouncedQuery);
    if (selectedType !== 'all') params.append('type', selectedType);
    if (selectedDestination && selectedDestination !== 'all')
      params.append('destinationId', selectedDestination);
    if (priceRange[0] > 0) params.append('minPrice', priceRange[0].toString());
    if (priceRange[1] < 200) params.append('maxPrice', priceRange[1].toString());
    if (sortBy !== 'default') params.append('sortBy', sortBy);
    params.append('currency', currency);

    // Data amount filters
    selectedDataAmounts.forEach((amount) => {
      if (amount === 'unlimited') {
        // Handle unlimited separately in the backend
      } else if (amount === '20+') {
        params.append('minData', (20 * 1024).toString()); // 20GB in MB
      } else {
        const gb = parseInt(amount);
        const mb = gb * 1024;
        params.append('minData', mb.toString());
        params.append('maxData', mb.toString());
      }
    });

    // Validity filters
    selectedValidities.forEach((validity) => {
      if (validity === '90+') {
        params.append('minValidity', '90');
      } else {
        const days = parseInt(validity);
        params.append('minValidity', days.toString());
        params.append('maxValidity', days.toString());
      }
    });

    return params.toString();
  }, [
    debouncedQuery,
    selectedType,
    selectedDestination,
    priceRange,
    selectedDataAmounts,
    selectedValidities,
    sortBy,
    currency,
  ]);

  // Fetch search results
  const { data: searchResults, isLoading } = useQuery<SearchResponse>({
    queryKey: ['/api/search', searchParams],
    enabled: true,
  });

  const packages = searchResults?.packages || [];
  const total = searchResults?.total || 0;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedDestination('all');
    setPriceRange([0, 200]);
    setSelectedDataAmounts([]);
    setSelectedValidities([]);
    setSortBy('default');
  };

  const toggleDataAmount = (amount: string) => {
    setSelectedDataAmounts((prev) =>
      prev.includes(amount) ? prev.filter((a) => a !== amount) : [...prev, amount],
    );
  };

  const toggleValidity = (validity: string) => {
    setSelectedValidities((prev) =>
      prev.includes(validity) ? prev.filter((v) => v !== validity) : [...prev, validity],
    );
  };

  // Filters component (reusable for desktop and mobile)
  const FiltersContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3" data-testid="text-price-range-title">
          {t('search.priceRange')}
        </h3>
        <div className="space-y-4">
          <Slider
            min={0}
            max={200}
            step={5}
            value={priceRange}
            onValueChange={setPriceRange}
            data-testid="slider-price-range"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span data-testid="text-min-price">
              {getCurrencySymbol(currency)}
              {priceRange[0]}
            </span>
            <span data-testid="text-max-price">
              {getCurrencySymbol(currency)}
              {priceRange[1]}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3" data-testid="text-data-amount-title">
          {t('search.dataAmount')}
        </h3>
        <div className="space-y-2">
          {[
            { value: '1', label: '1GB' },
            { value: '3', label: '3GB' },
            { value: '5', label: '5GB' },
            { value: '10', label: '10GB' },
            { value: '20+', label: '20GB+' },
            { value: 'unlimited', label: t('search.unlimited') },
          ].map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`data-${option.value}`}
                checked={selectedDataAmounts.includes(option.value)}
                onCheckedChange={() => toggleDataAmount(option.value)}
                data-testid={`checkbox-data-${option.value}`}
              />
              <Label htmlFor={`data-${option.value}`} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3" data-testid="text-validity-title">
          {t('search.validity')}
        </h3>
        <div className="space-y-2">
          {[
            { value: '7', label: '7 days' },
            { value: '15', label: '15 days' },
            { value: '30', label: '30 days' },
            { value: '60', label: '60 days' },
            { value: '90+', label: '90+ days' },
          ].map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`validity-${option.value}`}
                checked={selectedValidities.includes(option.value)}
                onCheckedChange={() => toggleValidity(option.value)}
                data-testid={`checkbox-validity-${option.value}`}
              />
              <Label htmlFor={`validity-${option.value}`} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3" data-testid="text-package-type-title">
          {t('search.packageType')}
        </h3>
        <RadioGroup value={selectedType} onValueChange={setSelectedType}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="type-all" data-testid="radio-type-all" />
            <Label htmlFor="type-all" className="cursor-pointer">
              {t('search.allTypes')}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="local" id="type-local" data-testid="radio-type-local" />
            <Label htmlFor="type-local" className="cursor-pointer">
              {t('search.local')}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="regional" id="type-regional" data-testid="radio-type-regional" />
            <Label htmlFor="type-regional" className="cursor-pointer">
              {t('search.regional')}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="global" id="type-global" data-testid="radio-type-global" />
            <Label htmlFor="type-global" className="cursor-pointer">
              {t('search.global')}
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <h3 className="font-semibold mb-3" data-testid="text-destination-title">
          {t('search.destination')}
        </h3>
        <Select value={selectedDestination} onValueChange={setSelectedDestination}>
          <SelectTrigger data-testid="select-destination">
            <SelectValue placeholder={t('search.allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-destination-all">
              All Destinations
            </SelectItem>
            {destinations
              ?.filter((d) => d.active)
              .map((dest) => (
                <SelectItem
                  key={dest.id}
                  value={dest.id}
                  data-testid={`select-destination-${dest.slug}`}
                >
                  {dest.flagEmoji} {dest.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={clearFilters}
        data-testid="button-clear-filters"
      >
        <X className="h-4 w-4 mr-2" />
        {t('search.clearFilters')}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-[130px]">
      <Helmet>
        <title>{String(t('search.title', 'Search eSIM Packages'))} | eSIM Global</title>
        <meta
          name="description"
          content="Search and filter eSIM Packages for any destination. Find the perfect data plan for your travel needs with advanced search and filtering options."
        />
      </Helmet>

      {/* <SiteHeader /> */}

      <main className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-page-title">
            {t('search.title')}
          </h1>

          <div className="relative max-w-2xl">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('search.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold" data-testid="text-filters-title">
                    {t('search.filters')}
                  </h2>
                  <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
                </div>
                <FiltersContent />
              </CardContent>
            </Card>
          </aside>

          {/* Mobile Filters Button */}
          <div className="md:hidden">
            <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full" data-testid="button-mobile-filters">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  {t('search.filters')}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>{t('search.filters')}</SheetTitle>
                </SheetHeader>
                <div className="mt-6 overflow-y-auto max-h-[calc(100vh-100px)]">
                  <FiltersContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Main Results Area */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <p className="text-muted-foreground" data-testid="text-results-count">
                {t('search.resultsFound', { count: total })}
              </p>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-64" data-testid="select-sort">
                  <SelectValue placeholder={t('search.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" data-testid="select-sort-default">
                    {t('search.bestPrice')}
                  </SelectItem>
                  <SelectItem value="price_asc" data-testid="select-sort-price-asc">
                    {t('search.priceLowToHigh')}
                  </SelectItem>
                  <SelectItem value="price_desc" data-testid="select-sort-price-desc">
                    {t('search.priceHighToLow')}
                  </SelectItem>
                  <SelectItem value="data_desc" data-testid="select-sort-data-desc">
                    {t('search.dataMostToLeast')}
                  </SelectItem>
                  <SelectItem value="data_asc" data-testid="select-sort-data-asc">
                    {t('search.dataLeastToMost')}
                  </SelectItem>
                  <SelectItem value="validity_desc" data-testid="select-sort-validity-desc">
                    {t('search.validityLongestToShortest')}
                  </SelectItem>
                  <SelectItem value="popularity" data-testid="select-sort-popularity">
                    Popularity
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-48 w-full" />
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-4" />
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : packages.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="max-w-md mx-auto">
                  <SearchIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2" data-testid="text-no-results">
                    {t('search.noResults')}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters or search terms
                  </p>
                  <Button onClick={clearFilters} data-testid="button-clear-all-filters">
                    {t('search.clearFilters')}
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => (
                  <Link key={pkg.id} href={`/packages/${pkg.slug}`}>
                    <Card
                      className="h-full hover-elevate active-elevate-2 transition-all cursor-pointer overflow-hidden"
                      data-testid={`card-package-${pkg.id}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            {pkg.destination && (
                              <p className="text-sm text-muted-foreground mb-1">
                                {pkg.destination.flagEmoji} {pkg.destination.name}
                              </p>
                            )}
                            {pkg.region && (
                              <p className="text-sm text-muted-foreground mb-1">
                                🌍 {pkg.region.name}
                              </p>
                            )}
                            <h3
                              className="font-semibold text-lg leading-tight"
                              data-testid={`text-package-title-${pkg.id}`}
                            >
                              {pkg.title}
                            </h3>
                          </div>
                          {pkg.isBestPrice && (
                            <Badge
                              className="ml-2 flex-shrink-0"
                              data-testid={`badge-best-price-${pkg.id}`}
                            >
                              {t('search.bestPrice')}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Data:</span>
                            <span
                              className="font-medium"
                              data-testid={`text-data-amount-${pkg.id}`}
                            >
                              {pkg.isUnlimited ? t('search.unlimited') : pkg.dataAmount}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Validity:</span>
                            <span className="font-medium" data-testid={`text-validity-${pkg.id}`}>
                              {pkg.validity} days
                            </span>
                          </div>
                          {pkg.operator && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Operator:</span>
                              <span className="font-medium" data-testid={`text-operator-${pkg.id}`}>
                                {pkg.operator}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t">
                          <div className="flex items-baseline justify-between">
                            <span
                              className="text-2xl font-bold"
                              data-testid={`text-price-${pkg.id}`}
                            >
                              {getCurrencySymbol(pkg.currency)}
                              {pkg.price}
                            </span>
                            <span className="text-sm text-muted-foreground">{pkg.currency}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* <SiteFooter /> */}
    </div>
  );
}
