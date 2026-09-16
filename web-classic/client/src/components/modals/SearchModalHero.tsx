"use client";

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Globe, ChevronRight, Check, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModalHero({ open, onOpenChange }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"country" | "region">("country");
  const [, setLocation] = useLocation();
  const { currency, currencies } = useCurrency();
  const currencySymbol = getCurrencySymbol(currency, currencies);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
      onOpenChange(false);
    }
  };

  const getFilteredResults = () => {
    if (searchQuery.length === 0) return [];

    if (searchType === "country") {
      return (
        destinationsWithPricing?.filter(
          (d) =>
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.countryCode.toLowerCase().includes(searchQuery.toLowerCase())
        ) || []
      ).slice(0, 10);
    } else {
      return (
        regionsWithPricing?.filter((r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) || []
      ).slice(0, 10);
    }
  };

  // Get all countries for listing
  const getAllCountries = () => {
    return destinationsWithPricing || [];
  };

  const formatMinPrice = (minPrice: string) =>
    `${currencySymbol}${convertPrice(parseFloat(minPrice || "0"), "USD", currency, currencies).toFixed(2)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] max-h-[90vh] overflow-hidden p-0 gap-0">
        <div className="relative">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Search Destinations
            </DialogTitle>
            <DialogDescription className="text-sm">
              200+ countries & regions available
            </DialogDescription>
          </DialogHeader>

          {/* Content */}
          <div className="max-h-[calc(90vh-120px)] overflow-y-auto custom-scrollbar">
            <div className="p-6 space-y-5">
              {/* Toggle Buttons */}
              <div className="flex gap-2 p-1 bg-muted/50 rounded-full w-fit mx-auto">
                <button
                  onClick={() => {
                    setSearchType("country");
                    setSearchQuery("");
                  }}
                  className={`flex items-center gap-2 text-xs font-medium transition-all px-4 py-2 rounded-full ${
                    searchType === "country"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      searchType === "country"
                        ? "border-primary-foreground bg-primary-foreground"
                        : "border-muted-foreground"
                    }`}
                  >
                    {searchType === "country" && (
                      <Check className="h-2 w-2 text-primary" />
                    )}
                  </div>
                  Countries
                </button>
                <button
                  onClick={() => {
                    setSearchType("region");
                    setSearchQuery("");
                  }}
                  className={`flex items-center gap-2 text-xs font-medium transition-all px-4 py-2 rounded-full ${
                    searchType === "region"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      searchType === "region"
                        ? "border-primary-foreground bg-primary-foreground"
                        : "border-muted-foreground"
                    }`}
                  >
                    {searchType === "region" && (
                      <Check className="h-2 w-2 text-primary" />
                    )}
                  </div>
                  Regions
                </button>
              </div>

              {/* Search Input */}
              <form onSubmit={handleSearch}>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder={
                        searchType === "country"
                          ? "Search countries..."
                          : "Search regions..."
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-5 pr-12 py-5 rounded-xl border-2 border-border hover:border-primary/50 focus:border-primary text-sm font-medium bg-background placeholder:text-muted-foreground/60 transition-all"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:shadow-md transition-all"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </form>

              {/* Search Results */}
              {searchQuery.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Results
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {getFilteredResults().length}
                    </span>
                  </div>
                  {destinationsLoading || regionsLoading ? (
                    <div className="py-8 text-center">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-primary border-r-transparent"></div>
                    </div>
                  ) : getFilteredResults().length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No results found
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {getFilteredResults().map((item, idx) => (
                        <Link
                          key={idx}
                          href={
                            searchType === "country"
                              ? `/destination/${
                                  (item as DestinationWithPricing).slug
                                }`
                              : `/region/${(item as RegionWithPricing).slug}`
                          }
                          onClick={() => onOpenChange(false)}
                        >
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-all rounded-xl group"
                          >
                            {searchType === "country" ? (
                              <div className="w-16 h-11 rounded-lg overflow-hidden shadow-sm border border-border flex-shrink-0">
                                <img
                                  src={`https://flagcdn.com/${(
                                    item as DestinationWithPricing
                                  ).countryCode.toLowerCase()}.svg`}
                                  alt={(item as DestinationWithPricing).name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Globe className="h-5 w-5 text-primary" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {(item as any).name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                From{" "}
                                <span className="text-primary font-bold">
                                  {formatMinPrice((item as any).minPrice)}
                                </span>
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                          </motion.div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Popular Section */}
                  <div>
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">
                      Popular{" "}
                      {searchType === "country" ? "Countries" : "Regions"}
                    </h3>

                    {searchType === "country" && (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {displayPopular.slice(0, 6).map((dest) => (
                          <Link
                            key={dest.slug}
                            href={`/destination/${dest.slug}`}
                            onClick={() => onOpenChange(false)}
                          >
                            <motion.div
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex items-center gap-2.5 p-3 cursor-pointer rounded-xl bg-card hover:bg-muted/50 transition-all border border-border/50 hover:border-primary/30"
                            >
                              <div className="w-12 h-8 rounded-md overflow-hidden shadow-sm border border-border/50 flex-shrink-0">
                                <img
                                  src={`https://flagcdn.com/${dest.countryCode.toLowerCase()}.svg`}
                                  alt={dest.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="text-xs text-foreground font-medium truncate">
                                {dest.name}
                              </span>
                            </motion.div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {searchType === "region" && (
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {displayPopularRegions.map((region) => (
                          <Link
                            key={region.id}
                            href={`/region/${region.slug}`}
                            onClick={() => onOpenChange(false)}
                          >
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex flex-col items-center gap-2 cursor-pointer rounded-xl p-3 bg-card hover:bg-muted/50 transition-all border border-border/50 hover:border-primary/30"
                            >
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Globe className="h-5 w-5 text-primary" />
                              </div>
                              <span className="text-[10px] text-center text-foreground font-medium leading-tight line-clamp-2">
                                {region.name}
                              </span>
                            </motion.div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* All Countries List */}
                  {searchType === "country" && !destinationsLoading && (
                    <div>
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">
                        All Countries ({getAllCountries().length})
                      </h3>
                      <div className="space-y-1">
                        {getAllCountries().map((dest) => (
                          <Link
                            key={dest.slug}
                            href={`/destination/${dest.slug}`}
                            onClick={() => onOpenChange(false)}
                          >
                            <motion.div
                              whileHover={{ x: 2 }}
                              className="flex items-center gap-3 p-2.5 hover:bg-muted/50 cursor-pointer transition-all rounded-lg group"
                            >
                              <div className="w-14 h-10 rounded-md overflow-hidden shadow-sm border border-border/50 flex-shrink-0">
                                <img
                                  src={`https://flagcdn.com/${dest.countryCode.toLowerCase()}.svg`}
                                  alt={dest.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {dest.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  From{" "}
                                  <span className="text-primary font-semibold">
                                    {formatMinPrice(dest.minPrice)}
                                  </span>
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                            </motion.div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Regions List */}
                  {searchType === "region" &&
                    !regionsLoading &&
                    regionsWithPricing && (
                      <div>
                        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">
                          All Regions ({regionsWithPricing.length})
                        </h3>
                        <div className="space-y-1">
                          {regionsWithPricing.map((region) => (
                            <Link
                              key={region.id}
                              href={`/region/${region.slug}`}
                              onClick={() => onOpenChange(false)}
                            >
                              <motion.div
                                whileHover={{ x: 2 }}
                                className="flex items-center gap-3 p-2.5 hover:bg-muted/50 cursor-pointer transition-all rounded-lg group"
                              >
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Globe className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {region.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    From{" "}
                                    <span className="text-primary font-semibold">
                                      {formatMinPrice(region.minPrice)}
                                    </span>
                                  </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                              </motion.div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
