'use client';

import { CSSProperties, useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Globe,
  Star,
  ChevronRight,
  Check,
  CreditCard,
  MapPin,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrency } from '@/contexts/CurrencyContext';
import { convertPrice, getCurrencySymbol } from '@/lib/currency';
import { SearchModalHero } from '../modals/SearchModalHero';
import { HeroStepsIllustrations } from './HeroStepsIllustrations';
import { useTranslation } from '@/contexts/TranslationContext';
// import { SearchModalHero } from './modals/SearchModalHero';

// Types
interface DestinationWithPricing {
  id: number;
  name: string;
  slug: string;
  countryCode: string;
  minPrice: string;
  packageCount?: number;
  isPopular?: boolean;
}

interface RegionWithPricing {
  id: number;
  name: string;
  slug: string;
  minPrice: string;
  packageCount?: number;
  countries?: string[];
}

export function HeroSection() {
  const [phoneSearchQuery, setPhoneSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'country' | 'region'>('country');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [, setLocation] = useLocation();
  const { currency, currencies } = useCurrency();
  const currencySymbol = getCurrencySymbol(currency, currencies);
  const { t } = useTranslation();

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const phoneThemeVars = {
    '--background': '#ffffff',
    '--foreground': '#111827',
    '--card': '#ffffff',
    '--card-foreground': '#111827',
    '--border': '#e5e7eb',
    '--input': '#ffffff',
    '--muted': '#f5f5f5',
    '--muted-foreground': '#6b7280',
    '--popover': '#ffffff',
    '--popover-foreground': '#111827',
  } as CSSProperties;

  const rotatingWords = [
    t("website.home.hero.rotating.anywhere", "Anywhere"),
    t("website.home.hero.rotating.traveling", "Traveling"),
    t("website.home.hero.rotating.abroad", "Abroad"),
    t("website.home.hero.rotating.roaming", "Roaming")
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const { data: destinationsWithPricing, isLoading: destinationsLoading } = useQuery<
    DestinationWithPricing[]
  >({
    queryKey: ['/api/destinations/with-pricing'],
  });

  const { data: regionsWithPricing, isLoading: regionsLoading } = useQuery<RegionWithPricing[]>({
    queryKey: ['/api/regions/with-pricing'],
  });

  // console.log('regionsWithPricing', regionsWithPricing);

  const popularDestinations = destinationsWithPricing?.filter((d) => d.isPopular).slice(0, 6) || [];

  const defaultPopularDestinations = [
    { name: 'United States', countryCode: 'us', slug: 'united-states' },
    { name: 'United Kingdom', countryCode: 'gb', slug: 'united-kingdom' },
    { name: 'UAE', countryCode: 'ae', slug: 'united-arab-emirates' },
    { name: 'Japan', countryCode: 'jp', slug: 'japan' },
    { name: 'Thailand', countryCode: 'th', slug: 'thailand' },
    { name: 'France', countryCode: 'fr', slug: 'france' },
  ];

  const displayPopular =
    popularDestinations.length > 0
      ? popularDestinations.map((d) => ({
        name: d.name,
        countryCode: d.countryCode,
        slug: d.slug,
        minPrice: d.minPrice,
      }))
      : defaultPopularDestinations.map((d) => ({
        ...d,
        minPrice: '0',
      }));

  const defaultPopularRegions = [
    { id: 1, name: 'Europe', slug: 'europe', minPrice: '0' },
    { id: 2, name: 'Asia', slug: 'asia', minPrice: '0' },
    { id: 3, name: 'Americas', slug: 'americas', minPrice: '0' },
  ];

  const displayPopularRegions =
    regionsWithPricing && regionsWithPricing.length > 0
      ? regionsWithPricing.slice(0, 3)
      : defaultPopularRegions;

  const handlePhoneSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneSearchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(phoneSearchQuery)}`);
    }
  };

  // Get filtered results
  const getFilteredResults = () => {
    if (phoneSearchQuery.length === 0) return [];

    if (searchType === 'country') {
      return (
        destinationsWithPricing?.filter(
          (d) =>
            d.name.toLowerCase().includes(phoneSearchQuery.toLowerCase()) ||
            d.countryCode.toLowerCase().includes(phoneSearchQuery.toLowerCase()),
        ) || []
      ).slice(0, 5);
    } else {
      return (
        regionsWithPricing?.filter((r) =>
          r.name.toLowerCase().includes(phoneSearchQuery.toLowerCase()),
        ) || []
      ).slice(0, 5);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };



  const bannerImages = [
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070",
    "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=2070",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=2070"
  ];


  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % bannerImages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[85vh] overflow-hidden bg-[#020617] sm:min-h-[75vh] md:min-h-[70vh] lg:h-[70vh] xl:h-[75vh]">
      <div className="pointer-events-none absolute inset-0 block">
        <div className="absolute left-[-8%] top-12 h-72 w-72 rounded-full bg-teal-500/12 blur-3xl" />
        <div className="absolute right-[-6%] top-20 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-8%] left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_40%),linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.75))]" />
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 h-full">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-start max-w-7xl mx-auto h-full">
          {/* Left Column - Content - ALIGNED START */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left flex flex-col items-center lg:items-start order-1 lg:order-1 mt-8 lg:mt-0"
          >
            {/* Trust Badge */}
            <motion.div
              variants={itemVariants}
              className="mb-4 inline-flex gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 backdrop-blur-sm sm:mb-6 sm:gap-2 sm:px-4 sm:py-2"
              data-testid="badge-trust-rating"
            >
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-yellow-500 fill-yellow-500 dark:text-yellow-400 dark:fill-yellow-400"
                  />
                ))}
              </div>
              <span className="whitespace-nowrap text-xs font-medium text-white sm:text-sm">
                {t("website.home.hero.trustBadge", "Rated 4.7/5 with 500K+ Downloads")}
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={itemVariants}
              className="mb-2 text-3xl font-extrabold leading-tight tracking-tight text-slate-100 sm:mb-3 sm:text-4xl md:text-5xl lg:text-6xl"
              data-testid="text-hero-headline"
            >
              {t("website.home.hero.headline.prefix", "Global")}{' '}
              <span className="inline-flex items-baseline gap-1 sm:gap-2">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentWordIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="gradient-text dark:text-primary inline-block min-w-[140px] sm:min-w-[180px] md:min-w-[240px] lg:min-w-[280px] neon-text-glow"
                    data-testid="text-rotating-word"
                  >
                    {rotatingWords[currentWordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.h1>

            <motion.h1
              variants={itemVariants}
              className="mb-3 text-3xl font-extrabold leading-tight tracking-tight text-slate-300 sm:mb-4 sm:text-4xl md:text-5xl lg:text-6xl"
              data-testid="text-hero-headline-2"
            >
              {t("website.home.hero.headline.suffix", "for Lifetime")}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="mb-4 text-base text-slate-400 sm:mb-6 sm:text-lg md:text-xl"
              data-testid="text-hero-subtitle"
            >
              <span className="font-semibold text-slate-200">{t("website.home.hero.dataVoice", "Data + Voice")}</span> | {t("website.home.hero.magicSim", "Magic SIM available")}
            </motion.p>

            {/* Description & Search Button */}
            <motion.div variants={itemVariants} className="w-full max-w-md space-y-5 mb-6 sm:mb-8 ">
              {/* <p className="text-sm sm:text-base text-muted-foreground">
                Find the perfect eSIM plan for your destination. Search from 200+ countries and
                regions worldwide.
              </p> */}

              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-full border-2 border-white/15 bg-slate-950/70 px-5 py-2 text-left shadow-lg transition-all hover:border-primary/50 hover:bg-slate-900 hover:shadow-xl"
              >
                <Search className="h-5 w-5 flex-shrink-0 text-slate-400 transition-colors group-hover:text-primary" />
                <span className="flex-1 text-xs text-slate-400 transition-colors group-hover:text-slate-100 sm:text-sm md:text-base">
                  Search for countries or regions...
                </span>
                <div className="w-8 h-8 rounded-full bg-primary/10 group-hover:bg-primary flex items-center justify-center transition-all flex-shrink-0">
                  <Search className="h-4 w-4 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
              </button>
            </motion.div>

            {/* <motion.div
  variants={itemVariants}
  className="w-full max-w-md mb-6 relative overflow-hidden rounded-xl"
>
  <AnimatePresence mode="wait">
    <motion.img
      key={currentBanner}
      src={bannerImages[currentBanner]}
      alt="eSIM Offer Banner"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.5 }}
      className="w-full h-[120px] object-cover rounded-xl shadow-lg"
    />
  </AnimatePresence>
</motion.div> */}
            <div className="hidden sm:flex flex-wrap items-center gap-3 justify-center lg:justify-start mb-4 ">
              <div className="flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1.5">
                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-teal-500 text-white text-[10px] font-bold">
                  1
                </div>
                <MapPin className="h-3.5 w-3.5 text-teal-400" />
                <span className="text-xs font-medium text-teal-300">
                  {t('website.home.hero.step1', 'Choose Destination')}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5">
                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  2
                </div>
                <CreditCard className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-300">
                  {t('website.home.hero.step2', 'Complete Payment')}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                  3
                </div>
                <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-300">
                  {t('website.home.hero.step3', 'Scan & Connect')}
                </span>
              </div>
            </div>

            <div className="w-full">
              <div className="hidden sm:block">
                <HeroStepsIllustrations />
              </div>
            </div>
          </motion.div>

          {/* Right Column - REALISTIC iPhone 15 Mockup */}
          <div className="relative flex items-center justify-center lg:justify-end order-2 lg:order-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="relative"
              style={{ perspective: '1000px' }}
            >
              {/* iPhone 15 Frame - REALISTIC 3D DESIGN */}
              <div
                className="relative w-[280px] h-[570px] sm:w-[320px] sm:h-[650px] md:w-[340px] md:h-[690px] lg:w-[360px] lg:h-[730px] xl:w-[380px] xl:h-[770px] rounded-[3rem] sm:rounded-[3.5rem] md:rounded-[4rem] p-[10px] sm:p-3"
                style={{
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
                  boxShadow: `
                    0 20px 60px rgba(0, 0, 0, 0.5),
                    0 10px 30px rgba(0, 0, 0, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.5)
                  `,
                  transform: 'rotateY(-5deg) rotateX(2deg)',
                }}
              >
                {/* Power Button - RIGHT SIDE */}
                <div
                  className="absolute right-0 top-[20%] w-[3px] h-[60px] sm:h-[70px] rounded-l-sm"
                  style={{
                    background: 'linear-gradient(90deg, #454545, #979797, #555555)',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
                  }}
                ></div>

                {/* Volume Buttons - LEFT SIDE */}
                <div
                  className="absolute left-0 top-[15%] w-[3px] h-[40px] sm:h-[50px] rounded-r-sm"
                  style={{
                    background: 'linear-gradient(90deg, #555555, #979797, #454545)',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
                  }}
                ></div>
                <div
                  className="absolute left-0 top-[25%] w-[3px] h-[40px] sm:h-[50px] rounded-r-sm"
                  style={{
                    background: 'linear-gradient(90deg, #555555, #979797, #454545)',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
                  }}
                ></div>

                {/* Dynamic Island Notch - REALISTIC */}
                <div
                  className="absolute top-[14px] sm:top-[18px] left-1/2 -translate-x-1/2 w-[100px] sm:w-[120px] h-[30px] sm:h-[35px] z-30"
                  style={{
                    background: '#000000',
                    borderRadius: '20px',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8), 0 1px 2px rgba(255,255,255,0.1)',
                  }}
                >
                  {/* Camera */}
                  <div
                    className="absolute top-1/2 left-[20%] -translate-y-1/2 w-[6px] h-[6px] rounded-full"
                    style={{
                      background: 'radial-gradient(circle, #1a3a5c 30%, #0a1929 100%)',
                      boxShadow: '0 0 2px rgba(100,149,237,0.3)',
                    }}
                  ></div>
                  {/* Proximity Sensor */}
                  <div
                    className="absolute top-1/2 right-[20%] -translate-y-1/2 w-[8px] h-[4px] rounded-full"
                    style={{
                      background: '#1a1a1a',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
                    }}
                  ></div>
                </div>

                {/* Screen - REALISTIC DISPLAY */}
                <div
                  className="relative w-full h-full rounded-[2.5rem] sm:rounded-[3rem] md:rounded-[3.5rem] overflow-hidden bg-background dark:bg-card"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
                    boxShadow: `
                      inset 0 0 20px rgba(0,0,0,0.1),
                      0 2px 10px rgba(0,0,0,0.2)
                    `,
                  }}
                >
                  {/* Screen Reflection - GLASS EFFECT */}
                  <div
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
                      opacity: 0.6,
                    }}
                  ></div>

                  {/* Screen Content - Scrollable */}
                  <div
                    className="relative h-full overflow-y-auto p-4 sm:p-5 md:p-6 pt-12 sm:pt-14 md:pt-16 z-20"
                    style={phoneThemeVars}
                  >
                    {/* Country/Region Toggle */}
                    <div className="flex gap-3 mb-4 justify-center">
                      <button
                        onClick={() => {
                          setSearchType('country');
                          setPhoneSearchQuery('');
                        }}
                        className={`flex items-center gap-2 text-xs sm:text-sm font-medium transition-all px-4 py-2 rounded-full shadow-md ${searchType === 'country'
                          ? 'bg-primary text-white shadow-primary/30'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        data-testid="toggle-search-country"
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${searchType === 'country'
                            ? ' text-white bg-white'
                            : 'border-muted-foreground'
                            }`}
                        >
                          {searchType === 'country' && <Check className="h-3 w-3 text-primary" />}
                        </div>
                        {t("website.home.search.country", "Country")}
                      </button>
                      <button
                        onClick={() => {
                          setSearchType('region');
                          setPhoneSearchQuery('');
                        }}
                        className={`flex items-center gap-2 text-xs sm:text-sm font-medium transition-all px-4 py-2 rounded-full shadow-md ${searchType === 'region'
                          ? 'bg-primary text-white shadow-primary/30'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        data-testid="toggle-search-region"
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${searchType === 'region'
                            ? 'text-foreground bg-white'
                            : 'border-muted-foreground'
                            }`}
                        >
                          {searchType === 'region' && <Check className="h-3 w-3 text-primary" />}
                        </div>
                        {t("website.home.search.region", "Region")}
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="mb-4 relative">
                      <form onSubmit={handlePhoneSearch}>
                        <div className="relative group">
                          <div className="absolute inset-0 bg-primary/20 dark:bg-primary/30 rounded-2xl blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
                          <Input
                            type="text"
                            placeholder={
                              searchType === 'country' ? 'Search country...' : 'Search region...'
                            }
                            value={phoneSearchQuery}
                            onChange={(e) => setPhoneSearchQuery(e.target.value)}
                            className="relative pl-4 pr-10 py-3 rounded-full border-2 border-primary/30 text-sm font-medium focus:border-primary bg-background/90 dark:bg-card/90 backdrop-blur-sm text-foreground placeholder:text-muted-foreground shadow-xl hover:bg-background transition-all focus:ring-2 focus:ring-primary/50"
                            data-testid="input-phone-search"
                          />
                          <button
                            type="submit"
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:shadow-lg hover:shadow-primary/50 transition-all transform hover:scale-110 active:scale-95 shadow-md"
                            data-testid="button-phone-search"
                          >
                            <Search className="h-4 w-4 text-white " />
                          </button>
                        </div>
                      </form>

                      {/* Search Results Dropdown */}
                      <AnimatePresence>
                        {phoneSearchQuery.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-popover backdrop-blur-xl border border-border rounded-2xl shadow-2xl z-30 max-h-64 overflow-y-auto"
                            data-testid="phone-search-results"
                          >
                            {destinationsLoading || regionsLoading ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                {t("website.home.search.searching", "Searching...")}
                              </div>
                            ) : getFilteredResults().length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                {t("website.home.search.noResults", "No results found")}
                              </div>
                            ) : (
                              getFilteredResults().map((item, idx) => (
                                <Link
                                  key={idx}
                                  href={
                                    searchType === 'country'
                                      ? `/destination/${(item as DestinationWithPricing).slug}`
                                      : `/region/${(item as RegionWithPricing).slug}`
                                  }
                                >
                                  <div
                                    className="flex items-center gap-3 p-3 hover:bg-primary/10 dark:hover:bg-primary/20 cursor-pointer transition-colors border-b border-border last:border-b-0"
                                    data-testid={`phone-result-${(item as any).slug}`}
                                  >
                                    {searchType === 'country' ? (
                                      <div className="w-10 h-7 rounded-md overflow-hidden shadow-md border border-border flex-shrink-0">
                                        <img
                                          src={`https://flagcdn.com/${(
                                            item as DestinationWithPricing
                                          ).countryCode.toLowerCase()}.svg`}
                                          alt={(item as DestinationWithPricing).name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-lg">
                                        <Globe className="h-5 w-5 text-primary-foreground" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-foreground truncate">
                                        {(item as any).name}
                                      </p>
                                      <p className="text-xs text-accent font-bold">
                                        From {currencySymbol}
                                        {convertPrice(
                                          parseFloat((item as any).minPrice || '0'),
                                          'USD',
                                          currency,
                                          currencies,
                                        ).toFixed(2)}
                                      </p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-primary flex-shrink-0" />
                                  </div>
                                </Link>
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>



                    {/* Popular Section */}
                    {phoneSearchQuery.length === 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground text-center">
                          Popular Destinations
                        </p>

                        {/* Popular Countries Grid */}
                        {searchType === 'country' && (
                          <div className="grid grid-cols-3 gap-2">
                            {displayPopular.slice(0, 9).map((dest) => (
                              <Link key={dest.slug} href={`/destination/${dest.slug}`}>
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="flex flex-col items-center gap-1.5 cursor-pointer rounded-xl p-2 bg-card/60 backdrop-blur-sm hover:bg-card hover:shadow-lg transition-all"
                                  data-testid={`link-phone-popular-${dest.slug}`}
                                >
                                  <div className="w-full aspect-[3/2] rounded-lg overflow-hidden shadow-sm border border-border">
                                    <img
                                      src={`https://flagcdn.com/${dest.countryCode.toLowerCase()}.svg`}
                                      alt={dest.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <span className="text-[10px] text-center text-foreground font-medium leading-tight line-clamp-2">
                                    {dest.name}
                                  </span>
                                </motion.div>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Popular Regions Grid */}
                        {searchType === 'region' && (
                          <div className="grid grid-cols-3 gap-2">
                            {displayPopularRegions.map((region) => (
                              <Link key={region.id} href={`/region/${region.slug}`}>
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="flex flex-col items-center gap-1.5 cursor-pointer rounded-xl p-2 bg-card/60 backdrop-blur-sm hover:bg-card hover:shadow-lg transition-all"
                                  data-testid={`link-phone-region-${region.slug}`}
                                >
                                  <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shadow-md">
                                    <Globe className="h-6 w-6 text-white" />
                                  </div>
                                  <span className="text-[10px] text-center text-foreground font-medium leading-tight line-clamp-2">
                                    {region.name}
                                  </span>
                                </motion.div>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* View All Button */}
                        <Link href="/destinations">
                          <Button
                            className="w-full text-white font-semibold border-none rounded-xl mt-4 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-primary/50 transition-all text-sm py-3"
                            data-testid="button-phone-view-all"
                          >
                            View All Destinations
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {isSearchModalOpen && (
        <SearchModalHero open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen} />
      )}
    </section>
  );
}

