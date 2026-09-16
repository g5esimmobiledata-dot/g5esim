"use client";

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Globe, Star, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/contexts/CurrencyContext";
import { convertPrice, getCurrencySymbol } from "@/lib/currency";

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
  const [phoneSearchQuery, setPhoneSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"country" | "region">("country");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [, setLocation] = useLocation();
  const { currency, currencies } = useCurrency();
  const currencySymbol = getCurrencySymbol(currency, currencies);

  const rotatingWords = ["Anywhere", "Traveling", "Abroad", "Roaming"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const { data: destinationsWithPricing, isLoading: destinationsLoading } =
    useQuery<DestinationWithPricing[]>({
      queryKey: ["/api/destinations/with-pricing"],
    });

  const { data: regionsWithPricing, isLoading: regionsLoading } = useQuery<
    RegionWithPricing[]
  >({
    queryKey: ["/api/regions/with-pricing"],
  });

  const popularDestinations =
    destinationsWithPricing?.filter((d) => d.isPopular).slice(0, 6) || [];

  const defaultPopularDestinations = [
    { name: "United States", countryCode: "us", slug: "united-states" },
    { name: "United Kingdom", countryCode: "gb", slug: "united-kingdom" },
    { name: "UAE", countryCode: "ae", slug: "united-arab-emirates" },
    { name: "Japan", countryCode: "jp", slug: "japan" },
    { name: "Thailand", countryCode: "th", slug: "thailand" },
    { name: "France", countryCode: "fr", slug: "france" },
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
          minPrice: "0",
        }));

  const defaultPopularRegions = [
    { id: 1, name: "Europe", slug: "europe", minPrice: "0" },
    { id: 2, name: "Asia", slug: "asia", minPrice: "0" },
    { id: 3, name: "Americas", slug: "americas", minPrice: "0" },
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

    if (searchType === "country") {
      return (
        destinationsWithPricing?.filter(
          (d) =>
            d.name.toLowerCase().includes(phoneSearchQuery.toLowerCase()) ||
            d.countryCode.toLowerCase().includes(phoneSearchQuery.toLowerCase())
        ) || []
      ).slice(0, 5);
    } else {
      return (
        regionsWithPricing?.filter((r) =>
          r.name.toLowerCase().includes(phoneSearchQuery.toLowerCase())
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
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const placeholders =
    searchType === "country"
      ? ["Search for United Kingdom", "Search for India", "Search for USA"]
      : ["Search for Europe", "Search for Asia", "Search for Africa"];

  return (
    <section className="relative h-[65vh] overflow-hidden bg-background dark:bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start max-w-7xl mx-auto">
          {/* Left Column - Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left flex flex-col items-center lg:items-start"
          >
            {/* Trust Badge - THEME AWARE */}
            <motion.div
              variants={itemVariants}
              className="inline-flex items-start gap-2 px-4 py-2 rounded-full bg-muted border border-border mb-6"
              data-testid="badge-trust-rating"
            >
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 dark:text-yellow-400 dark:fill-yellow-400"
                  />
                ))}
              </div>
              <span className="text-foreground text-sm font-medium">
                Rated 4.7/5 with 500K+ Downloads
              </span>
            </motion.div>

            {/* Main Headline - THEME AWARE */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-foreground mb-4 leading-tight tracking-tight"
              data-testid="text-hero-headline"
            >
              Global &nbsp;
              <span className="inline-flex items-baseline gap-2 ">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentWordIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="gradient-text dark:text-primary inline-block min-w-[200px] md:min-w-[280px] neon-text-glow"
                    data-testid="text-rotating-word"
                  >
                    {rotatingWords[currentWordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.h1>

            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-foreground mb-4 leading-tight tracking-tight"
              data-testid="text-hero-headline-2"
            >
              for Lifetime
            </motion.h1>

            {/* Subtitle - THEME AWARE */}
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-muted-foreground mb-8"
              data-testid="text-hero-subtitle"
            >
              <span className="font-semibold text-foreground">
                Data + Voice
              </span>{" "}
              | Magic SIM available
            </motion.p>

            {/* Decorative wavy underline */}
            <motion.div
              variants={itemVariants}
              className="hidden lg:block mb-8"
            >
              <img
                src="/images/heroleft.svg"
                className="h-12 dark:opacity-80"
              />
            </motion.div>
          </motion.div>

          {/* Right Column - Phone Mockup with Overlay Search */}
          <div className="relative flex items-center justify-center lg:justify-end h-full overflow-hidden">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="relative w-full h-full flex items-center justify-center"
            >
              <div className="inline-block">
                <img
                  src="/images/phone_mock.png"
                  alt="Phone mockup"
                  className="h-72 md:h-80 lg:h-full object-contain relative z-10"
                />

                {/* Overlay Search UI */}
                <div className="absolute inset-0 flex flex-col items-center justify-start pt-16 md:pt-20 lg:pt-24 px-6 pointer-events-none z-20  -top-4 right-0">
                  {/* Country/Region Toggle - THEME AWARE */}
                  <div className="flex gap-2 mb-4 pointer-events-auto">
                    <button
                      onClick={() => {
                        setSearchType("country");
                        setPhoneSearchQuery("");
                      }}
                      className={`flex items-center gap-2 text-[10px] font-medium transition-colors ${
                        searchType === "country"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                      data-testid="toggle-search-country"
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          searchType === "country"
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {searchType === "country" && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      Country
                    </button>
                    <button
                      onClick={() => {
                        setSearchType("region");
                        setPhoneSearchQuery("");
                      }}
                      className={`flex items-center gap-2 text-[10px] font-medium transition-colors ${
                        searchType === "region"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                      data-testid="toggle-search-region"
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          searchType === "region"
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {searchType === "region" && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      Region
                    </button>
                  </div>

                  {/* Search Input - THEME AWARE */}
                  <div className="absolute w-full max-w-[260px] mb-4 pointer-events-auto top-[30%] px-4 left-1/2 -translate-x-1/2">
                    <form onSubmit={handlePhoneSearch}>
                      <div className="relative group">
                        {/* Glow effect using primary color */}
                        <div className="absolute inset-0 bg-primary/20 dark:bg-primary/30 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity"></div>
                        <Input
                          type="text"
                          placeholder={
                            searchType === "country"
                              ? "Search for United Kingdom"
                              : "Search for Europe"
                          }
                          value={phoneSearchQuery}
                          onChange={(e) => setPhoneSearchQuery(e.target.value)}
                          className="relative pl-5 pr-12 py-4 rounded-full border-2 border-primary/30 text-base font-medium focus:border-primary bg-background/80 dark:bg-card/80 backdrop-blur-xl text-foreground placeholder:text-muted-foreground shadow-2xl hover:bg-background/90 dark:hover:bg-card/90 transition-all focus:ring-2 focus:ring-primary/50"
                          data-testid="input-phone-search"
                        />
                        <button
                          type="submit"
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:shadow-lg hover:shadow-primary/50 transition-all transform hover:scale-110 active:scale-95"
                          data-testid="button-phone-search"
                        >
                          <Search className="h-3 w-3" />
                        </button>
                      </div>
                    </form>

                    {/* Live Search Results Dropdown - THEME AWARE */}
                    <AnimatePresence>
                      {phoneSearchQuery.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-[10%] -translate-x-1/2 w-[80%] mt-3 bg-popover backdrop-blur-xl border border-popover-border rounded-2xl shadow-2xl z-30 max-h-48 overflow-y-auto"
                          data-testid="phone-search-results"
                        >
                          {destinationsLoading || regionsLoading ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              Searching...
                            </div>
                          ) : getFilteredResults().length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No {searchType}s found
                            </div>
                          ) : (
                            getFilteredResults().map((item, idx) => (
                              <Link
                                key={idx}
                                href={
                                  searchType === "country"
                                    ? `/destination/${
                                        (item as DestinationWithPricing).slug
                                      }`
                                    : `/region/${
                                        (item as RegionWithPricing).slug
                                      }`
                                }
                              >
                                <div
                                  className="flex items-center gap-3 p-4 hover:bg-primary/10 dark:hover:bg-primary/20 cursor-pointer transition-colors border-b border-border last:border-b-0 hover:translate-x-1"
                                  data-testid={`phone-result-${
                                    (item as any).slug
                                  }`}
                                >
                                  {searchType === "country" ? (
                                    <div className="w-10 h-8 rounded-lg overflow-hidden shadow-md border border-border flex-shrink-0 ring-2 ring-primary/20">
                                      <img
                                        src={`https://flagcdn.com/${(
                                          item as DestinationWithPricing
                                        ).countryCode.toLowerCase()}.svg`}
                                        alt={
                                          (item as DestinationWithPricing).name
                                        }
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
                                        parseFloat((item as any).minPrice),
                                        "USD",
                                        currency,
                                        currencies
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

                  {/* Popular Section - THEME AWARE */}
                  {phoneSearchQuery.length === 0 && (
                    <div className="w-full max-w-[150px] space-y-3 pointer-events-auto pt-[50px]">
                      <p className="text-xs text-muted-foreground font-medium text-center">
                        Popular
                      </p>

                      {/* Popular Countries Grid */}
                      {searchType === "country" && (
                        <div className="grid grid-cols-3 ">
                          {displayPopular.slice(0, 3).map((dest) => (
                            <Link
                              key={dest.slug}
                              href={`/destination/${dest.slug}`}
                            >
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex flex-col items-center  cursor-pointer rounded-lg ml-2  "
                                data-testid={`link-phone-popular-${dest.slug}`}
                              >
                                <div className="w-8 h-5 rounded overflow-hidden shadow-sm">
                                  <img
                                    src={`https://flagcdn.com/${dest.countryCode.toLowerCase()}.svg`}
                                    alt={dest.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <span className="text-[7px] text-center text-black font-medium leading-tight">
                                  {dest.name}
                                </span>
                              </motion.div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Popular Regions Grid */}
                      {searchType === "region" && (
                        <div className="grid grid-cols-3 gap-2">
                          {displayPopularRegions.map((region) => (
                            <Link
                              key={region.id}
                              href={`/region/${region.slug}`}
                            >
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex flex-col items-center gap-1 cursor-pointer  rounded-lg  bg-card/80 backdrop-blur-sm ml-2 "
                                data-testid={`link-phone-region-${region.slug}`}
                              >
                                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                  <Globe className="h-4 w-4 text-primary-foreground" />
                                </div>
                                <span className="text-[8px] text-center text-black font-medium leading-tight max-w-12 line-clamp-2">
                                  {region.name}
                                </span>
                              </motion.div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* View All Button - THEME AWARE */}
                      <Link href="/destinations">
                        <Button
                          className="w-[90%] ml-2 text-primary-foreground font-semibold rounded-xl mt-4 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-primary/50 transition-all text-[10px] "
                          data-testid="button-phone-view-all "
                        >
                          View All Destinations
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
          {/* <img
            className="absolute h-28 top-[30%] right-[45%] dark:opacity-80"
            src="/images/searchhere+1.png"
          /> */}
        </div>
      </div>
    </section>
  );
}
