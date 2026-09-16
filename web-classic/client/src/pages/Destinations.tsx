import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { Search, Globe, MapPin, ChevronRight, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/contexts/TranslationContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import ReactCountryFlag from 'react-country-flag';
import type { Destination, Region } from '@shared/schema';

/* ---------------- TYPES ---------------- */

type DestinationWithPricing = Destination & {
  minPrice: string;
  currency?: string;
};

type RegionWithPricing = Region & {
  minPrice: string;
  currency?: string;
};

interface GlobalPackage {
  id: string;
  dataAmount: string;
  validity: number;
  retailPrice: string;
}

/* ---------------- COMPONENT ---------------- */

export default function Destinations() {
  const { t } = useTranslation();
  const { currency, currencies } = useCurrency();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] =
    useState<'all' | 'countries' | 'regions' | 'global'>('all');

  const getCurrencySymbol = (code: string) =>
    currencies.find((c) => c.code === code)?.symbol || '$';

  /* ---------------- API ---------------- */

  const { data: destinations } = useQuery<DestinationWithPricing[]>({
    queryKey: ['/api/destinations/with-pricing', { currency }],
  });

  const { data: regions } = useQuery<RegionWithPricing[]>({
    queryKey: ['/api/regions/with-pricing', { currency }],
  });

  const { data: globalPackages = [] } = useQuery<GlobalPackage[]>({
    queryKey: ['/api/packages/global', { currency }],
  });

  /* ---------------- FILTER ---------------- */

  const filteredDestinations = destinations?.filter(
    (d) =>
      d.active &&
      d.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredRegions = regions?.filter(
    (r) =>
      r.active &&
      r.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredGlobal = globalPackages.filter(
    (g) =>
      g.dataAmount.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalCount =
    (filteredDestinations?.length || 0) +
    (filteredRegions?.length || 0) +
    (filteredGlobal.length || 0);

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-background flex flex-col dark:bg-dark dark:text-white">
      <Helmet>
        <title>All Destinations</title>
      </Helmet>

      <main className="flex-1 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ---------------- HERO ---------------- */}

          <div className="text-center mb-10">
            <Badge className="mb-4 bg-teal-600 text-white px-4 py-1.5 rounded-full">
              <Globe className="h-3.5 w-3.5 mr-1.5" />
              Global Coverage
            </Badge>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              All Destinations
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Browse eSIM plans worldwide.
            </p>
          </div>

          {/* ---------------- TABS + SEARCH ---------------- */}

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">

              {[
                { key: 'all', label: `All (${totalCount})`, icon: null },
                { key: 'countries', label: 'Countries', icon: MapPin },
                { key: 'regions', label: 'Regions', icon: Globe },
                { key: 'global', label: 'Global', icon: Globe },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() =>
                      setActiveTab(tab.key as any)
                    }
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${activeTab === tab.key
                      ? 'bg-teal-600 text-white'
                      : 'bg-muted text-muted-foreground'
                      }`}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative w-full lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                placeholder="Search destination"
                className="pl-10 pr-10 rounded-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* ---------------- GRID ---------------- */}

          <div
            className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            xl:grid-cols-4
            gap-4
          "
          >
            {/* Countries */}
            {(activeTab === 'all' ||
              activeTab === 'countries') &&
              filteredDestinations?.map((dest) => (
                <Link
                  key={dest.id}
                  href={`/destination/${dest.slug}`}
                >
                  <Card>
                    <Flag code={dest.countryCode} image={dest.image} name={dest.name} />
                    <div>
                      <h3>{dest.name}</h3>
                      <Price
                        symbol={getCurrencySymbol(
                          dest.currency || 'USD',
                        )}
                        price={dest.minPrice}
                      />
                    </div>
                  </Card>
                </Link>
              ))}

            {/* Regions */}
            {(activeTab === 'all' ||
              activeTab === 'regions') &&
              filteredRegions?.map((r) => (
                <Link
                  key={r.id}
                  href={`/region/${r.slug}`}
                >
                  <Card>
                    <RegionIcon image={r.image} name={r.name} />
                    <div>
                      <h3>{r.name}</h3>
                      <Price
                        symbol={getCurrencySymbol(
                          r.currency || 'USD',
                        )}
                        price={r.minPrice}
                      />
                    </div>
                  </Card>
                </Link>
              ))}

            {/* Global */}
            {(activeTab === 'all' ||
              activeTab === 'global') &&
              filteredGlobal.map((g) => (
                <Link key={g.id} href="/global">
                  <Card>
                    <GlobeIcon />
                    <div>
                      <h3>
                        Global ({g.dataAmount})
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {g.validity} days
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------------- SMALL COMPONENTS ---------------- */

function Card({ children }: any) {
  return (
    <div
      className="
      flex items-center gap-3 sm:gap-4
      p-3 sm:p-4
      bg-card border rounded-xl
      hover:border-teal-400 hover:shadow-md
      transition cursor-pointer
    "
    >
      {children}
    </div>
  );
}

function Flag({ code, image, name }: any) {
  if (image) {
    return (
      <div className="w-12 h-12 rounded-full overflow-hidden border">
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-full overflow-hidden border flex items-center justify-center">
      <ReactCountryFlag
        countryCode={code}
        svg
        style={{ width: '150%', height: '150%', objectFit: 'cover' }}
      />
    </div>
  );
}

function RegionIcon({ image, name }: any) {
  if (image) {
    return (
      <div className="w-12 h-12 rounded-full overflow-hidden border">
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border">
      <Globe className="w-5 h-5 text-teal-600" />
    </div>
  );
}

function GlobeIcon() {
  return (
    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
      <Globe className="w-5 h-5" />
    </div>
  );
}

function Price({ symbol, price }: any) {
  return (
    <p className="text-sm text-muted-foreground">
      Starting from{' '}
      <span className="text-orange-500 font-semibold">
        {symbol}
        {price}
      </span>
    </p>
  );
}

