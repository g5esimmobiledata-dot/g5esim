import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Helmet } from 'react-helmet-async';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  Shield,
  Zap,
  Smartphone,
  QrCode,
  Wifi,
  Headphones,
  CreditCard,
  Clock,
  Home,
  Star,
  MessageCircle,
  Plane,
  ScanLine,
  Signal,
  Phone,
  Filter,
  X,
  TrendingUp,
  Award,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useTranslation } from '@/contexts/TranslationContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { convertPrice, getCurrencySymbol } from '@/lib/currency';
import ReactCountryFlag from 'react-country-flag';
import { useSettingByKey } from '@/hooks/useSettings';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { isKycRequiredForUser, isKycVerified } from '@/lib/kyc';

type GlobalPackage = {
  id: string;
  slug: string;
  title: string;
  dataAmount: string;
  dataMb: number | null;
  validity: number;
  validityDays: number;
  price: string;
  retailPrice: string;
  currency: string;
  isUnlimited: boolean;
  isBestPrice: boolean;
  isPopular: boolean;
  isRecommended: boolean;
  isBestValue: boolean;
  isEnabled: boolean;
  providerId: string;
  providerName: string;
  providerSlug: string;
  operator: string | null;
  operatorImage: string | null;
  packageGroupKey: string | null;
  countriesCount?: number;
  countries?: string[];
  voiceMinutes: number | null;
  smsCount: number | null;
};

const formatDataAmount = (pkg: GlobalPackage): string => {
  if (pkg.isUnlimited) {
    return 'Unlimited';
  }

  if (pkg.dataMb !== null && pkg.dataMb !== undefined && pkg.dataMb >= 0) {
    if (pkg.dataMb >= 1000) {
      const gb = pkg.dataMb / 1024;
      if (gb >= 1 && gb === Math.floor(gb)) {
        return `${Math.floor(gb)} GB`;
      }
      return `${gb.toFixed(1)} GB`;
    }
    return `${pkg.dataMb} MB`;
  }

  if (pkg.dataAmount && !pkg.dataAmount.includes('-1')) {
    return pkg.dataAmount;
  }

  return 'Unlimited';
};

const GLOBAL_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TH', name: 'Thailand' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'AE', name: 'UAE' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'Egypt' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'MA', name: 'Morocco' },
  { code: 'IN', name: 'India' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TR', name: 'Turkey' },
  { code: 'GR', name: 'Greece' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IE', name: 'Ireland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
];

const faqs = [
  {
    question: 'What is a Global eSIM and how does it work?',
    answer:
      'A Global eSIM is a digital SIM that works across 100+ countries with a single plan. Just purchase, scan the QR code, and connect instantly wherever you travel.',
  },
  {
    question: 'How do I set up my Global eSIM?',
    answer:
      "After purchase, you'll receive an email with a QR code. Open your phone's settings, scan the code, and follow the quick setup guide to start using data globally.",
  },
  {
    question: 'Can I use my physical SIM and eSIM together?',
    answer:
      'Yes. You can keep your regular SIM for calls and SMS while using your Global eSIM for data during international travel across multiple countries.',
  },
  {
    question: 'Which countries are covered by Global eSIM?',
    answer:
      'Our Global eSIM covers 100+ countries across Europe, Asia, the Americas, Middle East, Africa, and Oceania - giving you seamless connectivity without buying separate plans.',
  },
  {
    question: 'Can I top up or extend my Global plan?',
    answer:
      'Yes. Some Global plans allow you to add more data or extend validity directly from your account dashboard, so you can stay connected throughout your journey.',
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    handle: '@sarahchen_travels',
    review:
      'The Global eSIM was perfect for my multi-country trip! Worked seamlessly across Japan, Thailand, and Singapore. Setup took less than two minutes!',
    rating: 5,
  },
  {
    name: 'Marcus Weber',
    handle: '@marcusweber',
    review:
      'Super easy to install and used it across 8 European countries. No switching SIM cards, no roaming fees. Best travel companion ever!',
    rating: 5,
  },
  {
    name: 'Priya Sharma',
    handle: '@priyasharma',
    review:
      'I travel frequently for business and this Global eSIM saved me so much hassle. One plan for all my destinations - absolutely brilliant!',
    rating: 5,
  },
];

export default function GlobalDetails() {
  const { t } = useTranslation();
  const { currency, currencies } = useCurrency();
  // const currencySymbol = getCurrencySymbol(currency, currencies);
  const getCurrencySymbol = (currencyCode: string) => {
    return currencies.find((c) => c.code === currencyCode)?.symbol || '$';
  };
  const [selectedPackage, setSelectedPackage] = useState<GlobalPackage | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'coverage'>('details');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useUser();
  const { toast } = useToast();

  const siteName = useSettingByKey('platform_name') || 'Simfinity';
  const kycEnabled = useSettingByKey('kyc_enabled');
  const kycRequiredCustomer = useSettingByKey('kyc_required_customer');
  const kycRequiredAgent = useSettingByKey('kyc_required_agent');
  const kycRequiredReseller = useSettingByKey('kyc_required_reseller');

  // Filter states
  const [page, setPage] = useState(1);
  const limit = 10;
  const [sortBy, setSortBy] = useState<string>('');
  const [filterUnlimited, setFilterUnlimited] = useState(false);
  const [filterBestPrice, setFilterBestPrice] = useState(false);
  const [filterPopular, setFilterPopular] = useState(false);
  const [filterDataPack, setFilterDataPack] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDataAndVoice, setFilterDataAndVoice] = useState(false);
  const [filterVoiceAndDataAndSmsPack, setFilterVoiceAndDataAndSmsPack] = useState(false);



  const isKycComplete = () => {
    return isAuthenticated && isKycVerified(user);
  };

  const isKycRequired = () =>
    isKycRequiredForUser(user, {
      kyc_enabled: kycEnabled,
      kyc_required_customer: kycRequiredCustomer,
      kyc_required_agent: kycRequiredAgent,
      kyc_required_reseller: kycRequiredReseller,
    });

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    params.append('currency', currency);

    if (sortBy) params.append('sort', sortBy);
    if (filterUnlimited) params.append('isUnlimited', 'true');
    if (filterBestPrice) params.append('isBestPrice', 'true');
    if (filterPopular) params.append('isPopular', 'true');
    if (filterDataPack) params.append('dataPack', 'true');
    if (filterDataAndVoice) params.append('voiceAndDataPack', 'true');
    if (filterVoiceAndDataAndSmsPack) params.append('voiceAndDataAndSmsPack', 'true');

    return params.toString();
  };

  const { data: packagesResponse, isLoading } =
    useQuery<{ data: { region?: Region; packages: GlobalPackage[]; pagination?: any } }>({
      queryKey: [
        `/api/unified-packages/global`,
        {
          currency,
          page,
          limit,
          sortBy,
          filterUnlimited,
          filterBestPrice,
          filterPopular,
          filterDataPack,
          filterDataAndVoice,
          filterVoiceAndDataAndSmsPack
        },
      ],
      queryFn: () =>
        fetch(`/api/unified-packages/global?${buildQueryParams()}`).then((res) => res.json()),
    });

  const handleGetPlanClick = (e: any, selectedPkg: GlobalPackage) => {
    e.preventDefault();

    if (!selectedPkg) return;

    const hasVoice =
      (selectedPkg.voiceMinutes ?? 0) > 0;

    if (!hasVoice) {
      navigate(`/unified-checkout/${selectedPkg.slug}`);
      return;
    }

    if (!isKycRequired()) {
      navigate(`/unified-checkout/${selectedPkg.slug}`);
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: 'Please login first!',
        description: 'Login is required for Voice & SMS plans.',
      });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    if (!isKycComplete()) {
      toast({
        title: 'KYC verification required!',
        description: 'Complete your KYC to use Voice & SMS services.',
      });
      setTimeout(() => navigate('/account/kyc'), 2000);
      return;
    }

    navigate(`/unified-checkout/${selectedPkg.slug}`);
  };


  const clearAllFilters = () => {
    setSortBy('');
    setFilterUnlimited(false);
    setFilterBestPrice(false);
    setFilterPopular(false);
    setFilterDataPack(false);
    setFilterDataAndVoice(false);
    setFilterVoiceAndDataAndSmsPack(false);
    setPage(1);
  };

  const activeFiltersCount = [
    sortBy,
    filterUnlimited,
    filterBestPrice,
    filterPopular,
    filterDataPack,
    filterDataAndVoice,
    filterVoiceAndDataAndSmsPack
  ].filter(Boolean).length;

  const globalPackages = packagesResponse?.data?.packages || [];
  const globalRegion = packagesResponse?.data?.region;
  const pagination = packagesResponse?.data?.pagination;

  const groupedPackages = globalPackages.reduce(
    (acc, pkg) => {
      const key = pkg.dataAmount;
      const pkgBadges =
        (pkg.isPopular ? 1 : 0) + (pkg.isRecommended ? 1 : 0) + (pkg.isBestValue ? 1 : 0);

      if (!acc[key]) {
        acc[key] = pkg;
      } else {
        const existingBadges =
          (acc[key].isPopular ? 1 : 0) +
          (acc[key].isRecommended ? 1 : 0) +
          (acc[key].isBestValue ? 1 : 0);

        if (
          pkgBadges > existingBadges ||
          (pkgBadges === existingBadges && parseFloat(pkg.price) < parseFloat(acc[key].price))
        ) {
          acc[key] = pkg;
        }
      }
      return acc;
    },
    {} as Record<string, GlobalPackage>,
  );

  const packageOptions = Object.values(groupedPackages).sort((a, b) => {
    if (sortBy === 'priceLowToHigh') {
      return parseFloat(a.price) - parseFloat(b.price);
    }
    if (sortBy === 'priceHighToLow') {
      return parseFloat(b.price) - parseFloat(a.price);
    }
    const aBadges = (a.isPopular ? 1 : 0) + (a.isRecommended ? 1 : 0) + (a.isBestValue ? 1 : 0);
    const bBadges = (b.isPopular ? 1 : 0) + (b.isRecommended ? 1 : 0) + (b.isBestValue ? 1 : 0);
    if (aBadges !== bBadges) {
      return bBadges - aBadges;
    }
    return (a.dataMb || 0) - (b.dataMb || 0);
  });

  const bestChoiceIndex = Math.min(2, packageOptions.length - 1);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center pt-20">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#2c7338] border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading global Packages...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Global eSIM Plans - Worldwide Data Coverage | {siteName}</title>
        <meta
          name="description"
          content="Buy global eSIM data plans for worldwide coverage. Use one plan across 100+ countries with instant activation and no roaming fees."
        />
      </Helmet>

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" data-testid="breadcrumb-home">
                  <Home className="h-4 w-4" />
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/destinations" data-testid="breadcrumb-destinations">
                  Destinations
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage data-testid="breadcrumb-current">Global eSIMs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Hero Section */}
          <div className="grid lg:grid-cols-[2fr_3fr] gap-8 mb-16">
            {/* Left Column */}
            <div className="space-y-0">
              <div className="aspect-[4/3] rounded-t-2xl lg:rounded-2xl overflow-hidden">
                <img
                  src={globalRegion?.bannerImage || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop"}
                  alt="Global eSIM Coverage Worldwide"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="bg-card rounded-b-2xl lg:rounded-2xl lg:mt-4 border border-border">
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'details'
                      ? 'text-green-500 border-b-2 border-green-500 -mb-px bg-green-50 dark:bg-green-500/10'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                    data-testid="tab-esim-details"
                  >
                    eSIM Details
                  </button>
                  <button
                    onClick={() => setActiveTab('coverage')}
                    className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'coverage'
                      ? 'text-green-500 border-b-2 border-green-500 -mb-px bg-green-50 dark:bg-green-500/10'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                    data-testid="tab-coverage"
                  >
                    Coverage
                  </button>
                </div>

                <div className="p-5">
                  {activeTab === 'details' && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-1">
                          Selected Data Plan:
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedPackage
                            ? `Global ${formatDataAmount(selectedPackage)} ${selectedPackage.validity} Days`
                            : `Select a plan from the right`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-1">Compatibility:</p>
                        <p className="text-sm text-muted-foreground">
                          All eSIM-compatible devices are supported.
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-1">
                          Instant Delivery:
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Get your eSIM plan Ready instantly. Scan the QR code or follow the
                          instructions on the confirmation page to install.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'coverage' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-sm">
                        <Signal className="w-5 h-5 text-green-500" />
                        <div>
                          <span className="font-medium text-foreground">Speed:</span>
                          <span className="text-muted-foreground ml-2">
                            4G LTE & 5G where available
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Globe className="w-5 h-5 text-green-500" />
                        <div>
                          <span className="font-medium text-foreground">Coverage:</span>
                          <span className="text-muted-foreground ml-2">
                            100+ countries worldwide
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Wifi className="w-5 h-5 text-green-500" />
                        <div>
                          <span className="font-medium text-foreground">Networks:</span>
                          <span className="text-muted-foreground ml-2">
                            Premium network operators globally
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm font-medium text-foreground mb-3">
                          Covered Countries:
                        </p>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {GLOBAL_COUNTRIES.map((country) => (
                            <div
                              key={country.code}
                              className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                            >
                              <div className="w-6 h-4 rounded overflow-hidden border border-border shadow-sm flex-shrink-0">
                                <ReactCountryFlag
                                  svg
                                  countryCode={country.code}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                  aria-label={country.name}
                                />
                              </div>
                              <span className="text-sm text-foreground truncate">
                                {country.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  {globalRegion?.image ? (
                    <img
                      src={globalRegion.image}
                      alt="Global"
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#dcf0de] dark:bg-[#194520]/30 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-[#1e5427] dark:text-[#3d9a4d]" />
                    </div>
                  )}
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">Global eSIM</h1>
                </div>
                <p className="text-muted-foreground">
                  Buy prepaid global eSIM for worldwide coverage. Stay connected across 100+
                  countries with a single plan.
                </p>
              </div>

              {/* Filters and Package Header Section */}
              <div className="space-y-4">
                {/* Top Bar: Filters Toggle + Choose Plan Heading */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  {/* Choose Plan Section */}
                  <div className="flex-1 w-full sm:w-auto">
                    <h2 className="text-xl font-bold text-foreground">Choose your data plan</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-muted-foreground">
                        {packageOptions.length} plan{packageOptions.length !== 1 ? 's' : ''} available
                      </p>
                      {activeFiltersCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Filter Toggle Button */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:bg-accent/50 hover:border-[#2c7338]/50 transition-all cursor-pointer group w-full sm:w-auto"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#dcf0de] to-[#f0f9f1] dark:from-[#2c7338]/20 dark:to-[#2c7338]/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Filter className="w-5 h-5 text-[#1e5427] dark:text-[#3d9a4d]" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">Filters & Sorting</h3>
                        {activeFiltersCount > 0 && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-[#2c7338] text-white rounded-full">
                            {activeFiltersCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {activeFiltersCount > 0
                          ? `${activeFiltersCount} filter${activeFiltersCount !== 1 ? 's' : ''} active`
                          : 'Click to filter plans'
                        }
                      </p>
                    </div>
                    <div className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}>
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </button>
                </div>

                {/* Collapsible Filter Panel */}
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${showFilters ? 'max-h-96 opacity-100 mb-4' : 'max-h-0 opacity-0'
                    }`}
                >
                  <div className="bg-gradient-to-br from-card to-card/50 border border-border rounded-xl p-4 space-y-4 shadow-sm">
                    {/* Sort By */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-green-100 to-green-50 dark:from-green-500/20 dark:to-green-500/10 flex items-center justify-center">
                          <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        Sort By
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={sortBy === 'priceLowToHigh' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setSortBy(sortBy === 'priceLowToHigh' ? '' : 'priceLowToHigh');
                            setPage(1);
                          }}
                          className="w-full text-xs h-9 font-medium"
                        >
                          💰 Low to High
                        </Button>
                        <Button
                          variant={sortBy === 'priceHighToLow' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setSortBy(sortBy === 'priceHighToLow' ? '' : 'priceHighToLow');
                            setPage(1);
                          }}
                          className="w-full text-xs h-9 font-medium"
                        >
                          💎 High to Low
                        </Button>
                      </div>
                    </div>

                    {/* Filter Options */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#dcf0de] to-[#f0f9f1] dark:from-[#2c7338]/20 dark:to-[#2c7338]/10 flex items-center justify-center">
                          <Filter className="w-3.5 h-3.5 text-[#1e5427] dark:text-[#3d9a4d]" />
                        </div>
                        Filter By
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <Button
                          variant={filterUnlimited ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setFilterUnlimited(!filterUnlimited);
                            setPage(1);
                          }}
                          className="w-full justify-start text-xs h-auto min-h-9 py-2 font-medium"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                          Unlimited
                        </Button>
                        <Button
                          variant={filterBestPrice ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setFilterBestPrice(!filterBestPrice);
                            setPage(1);
                          }}
                          className="w-full justify-start text-xs h-auto min-h-9 py-2 font-medium"
                        >
                          <Award className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                          Best Price
                        </Button>
                        <Button
                          variant={filterPopular ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setFilterPopular(!filterPopular);
                            setPage(1);
                          }}
                          className="w-full justify-start text-xs h-auto min-h-9 py-2 font-medium"
                        >
                          <Star className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                          Popular
                        </Button>
                        <Button
                          variant={filterDataPack ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setFilterDataPack(!filterDataPack);
                            setPage(1);
                          }}
                          className="w-full justify-start text-xs h-auto min-h-9 py-2 font-medium"
                        >
                          <Wifi className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                          Data Only
                        </Button>
                        <Button
                          variant={filterDataAndVoice ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setFilterDataAndVoice(!filterDataAndVoice);
                            setPage(1);
                          }}
                          className="w-full justify-start text-xs h-auto min-h-9 py-2 font-medium"
                        >
                          <Wifi className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                          Data + Voice
                        </Button>
                        <Button
                          variant={filterVoiceAndDataAndSmsPack ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setFilterVoiceAndDataAndSmsPack(!filterVoiceAndDataAndSmsPack);
                            setPage(1);
                          }}
                          className="w-full justify-start text-xs h-auto min-h-9 py-2 font-medium whitespace-normal text-left leading-tight"
                        >
                          <Wifi className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                          Data + Voice + SMS
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Package Selection Grid */}
              <div>
                {packageOptions.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No global Packages available at the moment.
                      </p>
                      <Link href="/destinations">
                        <Button className="bg-[#2c7338] hover:bg-[#1e5427] text-white">
                          Browse Other Destinations
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div
                    className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${packageOptions.length > 9
                      ? 'max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#2c7338]/20 scrollbar-track-transparent hover:scrollbar-thumb-[#2c7338]/40'
                      : ''
                      }`}
                  >
                    {packageOptions.map((pkg, index) => {
                      const isBestChoice = index === bestChoiceIndex;
                      const isSelected = selectedPackage?.id === pkg.id;
                      const hasBadges =
                        pkg.isPopular || pkg.isRecommended || pkg.isBestValue || isBestChoice;

                      return (
                        <button
                          key={pkg.id}
                          onClick={() => setSelectedPackage(pkg)}
                          className={`relative p-4 rounded-xl border-2 transition-all text-left overflow-visible group ${isSelected
                            ? 'border-[#2c7338] bg-gradient-to-br from-[#f0f9f1]/50 to-[#dcf0de]/30 dark:from-[#2c7338]/10 dark:to-[#2c7338]/20 shadow-lg shadow-[#2c7338]/20 scale-[1.02]'
                            : 'border-border bg-card hover:border-[#2c7338]/30 hover:shadow-md hover:scale-[1.01]'
                            }`}
                          data-testid={`button-package-${pkg.dataAmount}`}
                        >
                          {/* Badge row */}
                          {hasBadges && (
                            <div className="absolute -top-2.5 left-2 right-2 flex flex-wrap gap-1 justify-center z-10">
                              {pkg.isPopular && (
                                <span
                                  className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-md"
                                  data-testid={`badge-popular-${pkg.id}`}
                                >
                                  🔥 Popular
                                </span>
                              )}
                              {pkg.isRecommended && (
                                <span
                                  className="bg-gradient-to-r from-[#2c7338] to-[#1e5427] text-white text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-md"
                                  data-testid={`badge-recommended-${pkg.id}`}
                                >
                                  ⭐ Recommended
                                </span>
                              )}
                              {pkg.isBestValue && (
                                <span
                                  className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-md"
                                  data-testid={`badge-best-value-${pkg.id}`}
                                >
                                  💎 Best Value
                                </span>
                              )}
                              {isBestChoice &&
                                !pkg.isPopular &&
                                !pkg.isRecommended &&
                                !pkg.isBestValue && (
                                  <span className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-md">
                                    ✨ Best Choice
                                  </span>
                                )}
                            </div>
                          )}

                          {/* Data Amount with icon */}
                          <div className="flex items-center gap-2 mb-2 mt-1">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected
                                ? 'bg-[#2c7338] text-white'
                                : 'bg-gradient-to-br from-[#dcf0de] to-[#f0f9f1] dark:from-[#2c7338]/20 dark:to-[#2c7338]/10 text-[#1e5427] dark:text-[#3d9a4d]'
                                }`}
                            >
                              <Wifi className="w-4 h-4" />
                            </div>
                            <p className="text-xl font-bold text-foreground">
                              {formatDataAmount(pkg)}
                            </p>
                          </div>

                          {/* Validity with clock icon */}
                          <div className="flex items-center gap-1.5 mb-3">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="text-sm font-medium text-muted-foreground">
                              {pkg.validity} Days
                            </p>
                          </div>

                          {/* Voice & SMS info */}
                          {((pkg.voiceMinutes !== null && pkg.voiceMinutes > 0) ||
                            (pkg.smsCount !== null && pkg.smsCount > 0)) && (
                              <div className="flex flex-wrap gap-2 mb-3 p-2 bg-accent/50 rounded-lg">
                                {pkg.voiceMinutes !== null && pkg.voiceMinutes > 0 && (
                                  <span
                                    className="flex items-center gap-1 text-xs font-medium text-foreground"
                                    data-testid={`voice-${pkg.id}`}
                                  >
                                    <Phone className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                    {pkg.voiceMinutes === -1 ? 'Unlimited' : `${pkg.voiceMinutes}m`}
                                  </span>
                                )}
                                {pkg.smsCount !== null && pkg.smsCount > 0 && (
                                  <span
                                    className="flex items-center gap-1 text-xs font-medium text-foreground"
                                    data-testid={`sms-${pkg.id}`}
                                  >
                                    <MessageCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    {pkg.smsCount === -1 ? 'Unlimited' : `${pkg.smsCount} SMS`}
                                  </span>
                                )}
                              </div>
                            )}

                          {/* Price and Radio */}
                          <div className="flex items-center justify-between pt-3 border-t border-border">
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-foreground">
                                  {getCurrencySymbol(pkg.currency)}
                                  {pkg.price}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">
                                  {pkg.currency}
                                </span>
                              </div>
                              {/* <p className="text-xs text-muted-foreground mt-0.5">
                                {pkg.providerName}
                              </p> */}
                            </div>

                            {/* Radio indicator with checkmark */}
                            <div
                              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                                ? 'border-[#2c7338] bg-[#2c7338] scale-110'
                                : 'border-muted-foreground/30 group-hover:border-[#2c7338]/50'
                                }`}
                            >
                              {isSelected && <Check className="h-4 w-4 text-white font-bold" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <Card className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasPrevPage}
                        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                        className="gap-2"
                      >
                        <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
                        Previous
                      </Button>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Page {pagination.page} of {pagination.totalPages}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasNextPage}
                        onClick={() => setPage((prev) => prev + 1)}
                        className="gap-2"
                      >
                        Next
                        <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Checkout Card */}
              <div className="lg:sticky lg:top-24">
                <Card className="shadow-lg border-0 bg-gradient-to-br from-[#f0f9f1] to-[#f0f9f1] dark:from-[#2c7338]/10 dark:to-[#2c7338]/10">
                  <CardContent className="p-4">
                    {selectedPackage ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Selected Plan</p>
                            <p className="font-semibold text-foreground">
                              {formatDataAmount(selectedPackage)} - {selectedPackage.validity} Days
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-foreground">
                              {getCurrencySymbol(selectedPackage.currency)}
                              {selectedPackage.price}
                            </p>
                            <p className="text-xs text-muted-foreground">{currency}</p>
                          </div>
                        </div>
                        <Button
                          onClick={(e) => handleGetPlanClick(e, selectedPackage)}
                          className="w-full bg-primary-gradient hover:bg-primary-gradient-hover text-white"
                          data-testid="button-checkout"
                        >
                          Buy Now
                        </Button>
                        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Smartphone className="w-3 h-3" />
                            <span>Check compatibility</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                          <Shield className="w-4 h-4 text-green-500" />
                          <span>Secure payment guaranteed</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <Smartphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="font-medium text-foreground">Select a data plan above</p>
                        <p className="text-sm text-muted-foreground">
                          Choose the best option for your trip
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* How to Setup Section */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
              How to setup your Global eSIM
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Get connected in just 3 simple steps
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#dcf0de] to-[#dcf0de] dark:from-[#2c7338]/20 dark:to-[#2c7338]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-[#1e5427] dark:text-[#3d9a4d]" />
                  </div>
                  <Badge variant="outline" className="mb-3">
                    Step 1
                  </Badge>
                  <h3 className="font-semibold text-foreground mb-2">
                    Choose A Data Plan For Your Trip
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Find the best Global eSIM plan for worldwide travel.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-amber-100 dark:from-green-500/20 dark:to-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ScanLine className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <Badge variant="outline" className="mb-3">
                    Step 2
                  </Badge>
                  <h3 className="font-semibold text-foreground mb-2">
                    Scan The QR Code To Activate
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Instantly Install And Set Up Your eSIM In Seconds.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-500/20 dark:to-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Signal className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <Badge variant="outline" className="mb-3">
                    Step 3
                  </Badge>
                  <h3 className="font-semibold text-foreground mb-2">
                    Enjoy Fast 4G/5G Data Abroad
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Stay Connected Anywhere With Reliable High-Speed Internet.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-8">
              <Button
                className="bg-primary-gradient text-white px-8"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Get started now
              </Button>
            </div>
          </section>

          {/* Why Choose Us Section */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
              Why choose {siteName} for your
              <br />
              worldwide travels
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Experience hassle-free connectivity with our premium Global eSIM service
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-lg text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 bg-[#dcf0de] dark:bg-[#2c7338]/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Wifi className="w-7 h-7 text-[#1e5427] dark:text-[#3d9a4d]" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Unlimited data plans</h3>
                  <p className="text-sm text-muted-foreground">
                    Stay connected with fast data worldwide.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 bg-green-100 dark:bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">No roaming charges</h3>
                  <p className="text-sm text-muted-foreground">
                    Travel freely without extra charges.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 bg-green-100 dark:bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Keep physical SIM</h3>
                  <p className="text-sm text-muted-foreground">
                    Keep your local SIM for calls and texts.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 bg-[#dcf0de] dark:bg-[#2c7338]/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-7 h-7 text-[#1e5427] dark:text-[#3d9a4d]" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Quick eSIM setup</h3>
                  <p className="text-sm text-muted-foreground">
                    Activate online and connect in minutes.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
              FAQs about Global eSIM
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Everything you need to know about using Global eSIM worldwide
            </p>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-3">
                {faqs.map((faq, index) => (
                  <Card key={index} className="border shadow-sm overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full p-4 flex items-center justify-between text-left"
                      data-testid={`faq-toggle-${index}`}
                    >
                      <span className="font-medium text-foreground pr-4">{faq.question}</span>
                      {openFaq === index ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                    {openFaq === index && (
                      <div className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground">{faq.answer}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              <div>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-[#f0f9f1] to-[#f0f9f1] dark:from-[#2c7338]/10 dark:to-[#2c7338]/10">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-white dark:bg-card rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                      <Headphones className="w-8 h-8 text-[#1e5427] dark:text-[#3d9a4d]" />
                    </div>
                    <Badge variant="outline" className="mb-3 bg-white dark:bg-card">
                      support
                    </Badge>
                    <h3 className="font-semibold text-foreground mb-2">Need more help?</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Can't find what you're looking for? Our support team is available 24/7 by
                      email or chat.
                    </p>
                    <Link href="/help-center">
                      <Button variant="outline" className="w-full">
                        Visit Help Center
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Testimonials Section */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
              What travelers say about {siteName}
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Join thousands of happy travelers who stay connected with us
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#3d9a4d] to-[#2c7338] rounded-full flex items-center justify-center text-white font-semibold">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.handle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < testimonial.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-muted-foreground/30'
                            }`}
                        />
                      ))}
                    </div>

                    <p className="text-sm text-muted-foreground">{testimonial.review}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link href="/destinations">
                <Button variant="outline" className="px-8">
                  View all destinations
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
