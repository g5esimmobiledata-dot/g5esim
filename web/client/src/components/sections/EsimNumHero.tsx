// import { useState } from "react";
// import { Link, useLocation } from "wouter";
// import { Search, Star, Globe, MapPin, CreditCard, Smartphone } from "lucide-react";
// import { useQuery } from "@tanstack/react-query";
// import ReactCountryFlag from "react-country-flag";
// import { HeroStepsIllustrations } from "./HeroStepsIllustrations";
// import { useTranslation } from "@/contexts/TranslationContext";

// interface Country {
//   country_name: string;
//   country_code: string;
// }

// interface CountriesResponse {
//   data: {
//     countries: Country[];
//   };
// }

// interface Region {
//   id: string;
//   name: string;
//   slug?: string;
// }

// interface RegionsResponse {
//   data: Region[];
// }

// const popularCountryCodes = ["US", "GB", "AE", "JP", "FR", "DE"];

// const fallbackCountries: Country[] = [
//   { country_name: "United States", country_code: "US" },
//   { country_name: "United Kingdom", country_code: "GB" },
//   { country_name: "UAE", country_code: "AE" },
//   { country_name: "Japan", country_code: "JP" },
//   { country_name: "France", country_code: "FR" },
//   { country_name: "Germany", country_code: "DE" },
// ];

// const fallbackRegions: Region[] = [
//   { id: "1", name: "Europe", slug: "europe" },
//   { id: "2", name: "Asia", slug: "asia" },
//   { id: "3", name: "North America", slug: "north-america" },
//   { id: "4", name: "Middle East", slug: "middle-east" },
//   { id: "5", name: "Africa", slug: "africa" },
//   { id: "6", name: "Oceania", slug: "oceania" },
// ];


// export function EsimNumHero() {
//   const [, setLocation] = useLocation();
//   const [activeTab, setActiveTab] = useState<"country" | "region">("country");
//   const [searchQuery, setSearchQuery] = useState("");
//   const { t } = useTranslation();

//   const { data: countriesResponse } = useQuery<CountriesResponse>({
//     queryKey: ["/countries"],
//   });

//   const { data: regionsResponse } = useQuery<RegionsResponse>({
//     queryKey: ["/api/regions"],
//   });

//   const apiCountries = countriesResponse?.data?.countries || [];
//   const countries = apiCountries.length > 0 ? apiCountries : fallbackCountries;
  
//   const apiRegions = regionsResponse?.data || [];
//   const regions = apiRegions.length > 0 ? apiRegions : fallbackRegions;

//   const popularCountries = countries.filter(c => 
//     popularCountryCodes.includes(c.country_code)
//   ).slice(0, 6);

//   const displayPopular = popularCountries.length > 0 ? popularCountries : fallbackCountries;

//   const filteredCountries = searchQuery
//     ? countries.filter(c => 
//         c.country_name?.toLowerCase().includes(searchQuery.toLowerCase())
//       ).slice(0, 6)
//     : displayPopular;

//   const filteredRegions = searchQuery
//     ? regions.filter(r => 
//         r.name?.toLowerCase().includes(searchQuery.toLowerCase())
//       ).slice(0, 6)
//     : regions.slice(0, 6);

//   const handleCountryClick = (countryCode: string) => {
//     setLocation(`/destination/${countryCode.toLowerCase()}`);
//   };

//   const handleRegionClick = (region: Region) => {
//     setLocation(`/region/${region.slug || region.id}`);
//   };

//   return (
//     <section className="relative bg-gradient-to-b from-background to-muted/30 pt-20 sm:pt-28 pb-0 overflow-visible">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 lg:gap-4">
//           {/* Left Content */}
//           <div className="flex-1 text-center lg:text-left pt-2 sm:pt-4 lg:pt-12 lg:max-w-xl">
//             <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 rounded-full mb-6">
//               <div className="flex items-center gap-0.5">
//                 {[...Array(5)].map((_, i) => (
//                   <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
//                 ))}
//               </div>
//               <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
//                 {t("website.home.hero.trusted", "Trusted by 1M+ Travelers Worldwide")}
//               </span>
//             </div>

//             <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-3 sm:mb-4">
//               {t("website.home.hero.title", "Your Digital")}{" "}
//               <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-500">
//                 eSIM
//               </span>{" "}
//               <br className="hidden sm:block" />
//               {t("website.home.hero.titlePart2", "for the World")}
//             </h1>
            
//             <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-4 sm:mb-6 max-w-lg mx-auto lg:mx-0">
//               {t("website.home.hero.subtitle", "Data + Voice | Instant Activation | No Roaming Fees")}
//             </p>

//             {/* Decorative line - hidden on mobile */}
//             <div className="hidden sm:flex items-center gap-2 mb-6 justify-center lg:justify-start">
//               <svg className="h-8 w-24 text-muted-foreground/50" viewBox="0 0 100 30">
//                 <path 
//                   d="M0 15 Q25 5, 50 15 T100 15" 
//                   fill="none" 
//                   stroke="currentColor" 
//                   strokeWidth="2"
//                   strokeDasharray="4 2"
//                 />
//               </svg>
//               <span className="text-sm italic text-muted-foreground">{t("website.home.hero.searchConnect", "Search & connect instantly")}</span>
//             </div>

//             {/* Quick Steps - Compact 3-step guide - hidden on mobile */}
//             <div className="hidden sm:flex flex-wrap items-center gap-3 justify-center lg:justify-start mb-4">
//               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-violet-950/40 border border-teal-100 dark:border-teal-800/50">
//                 <div className="flex items-center justify-center h-5 w-5 rounded-full bg-teal-500 text-white text-[10px] font-bold">1</div>
//                 <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
//                 <span className="text-xs font-medium text-teal-700 dark:text-teal-300">{t("website.home.hero.step1", "Choose Destination")}</span>
//               </div>
//               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/50">
//                 <div className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">2</div>
//                 <CreditCard className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
//                 <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{t("website.home.hero.step2", "Complete Payment")}</span>
//               </div>
//               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/50">
//                 <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">3</div>
//                 <Smartphone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
//                 <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{t("website.home.hero.step3", "Scan & Connect")}</span>
//               </div>
//             </div>

//             {/* Animated Illustrations below step pills - hidden on mobile */}
//             <div className="hidden sm:block">
//               <HeroStepsIllustrations />
//             </div>
//           </div>

//           {/* Right Side - Phone Mockup */}
//           <div className="flex justify-center lg:justify-end relative flex-shrink-0 w-full lg:w-auto">
//             {/* Decorative blurs - hidden on mobile */}
//             <div className="hidden sm:block absolute -top-16 -left-16 w-40 h-40 bg-teal-200 dark:bg-teal-900/40 rounded-full blur-3xl opacity-50 z-0" />
//             <div className="hidden sm:block absolute top-40 -right-8 w-48 h-48 bg-teal-200 dark:bg-teal-900/40 rounded-full blur-3xl opacity-50 z-0" />
            
//             {/* Phone Container - positioned to extend below and hide behind feature strip */}
//             <div className="relative z-10 mb-[-120px] sm:mb-[-180px] lg:mb-[-220px]">
//               {/* Phone Frame - responsive sizing */}
//               <div 
//                 className="relative bg-slate-800 dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] lg:rounded-[48px] p-1.5 sm:p-2 lg:p-2.5 shadow-2xl w-[280px] sm:w-[320px] lg:w-[380px] mx-auto"
//               >
//                 {/* Notch */}
//                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 sm:w-28 lg:w-32 h-5 sm:h-6 lg:h-7 bg-slate-800 dark:bg-slate-900 rounded-b-xl sm:rounded-b-2xl z-20" />
                
//                 {/* Screen */}
//                 <div className="bg-white dark:bg-gray-50 rounded-[24px] sm:rounded-[32px] lg:rounded-[40px] overflow-hidden">
//                   <div className="px-3 sm:px-4 lg:px-5 pt-8 sm:pt-10 lg:pt-12 pb-4 sm:pb-5 lg:pb-6 space-y-3 sm:space-y-4 lg:space-y-5" style={{ minHeight: '420px' }}>
//                     {/* Tabs */}
//                     <div className="flex items-center justify-center gap-3 sm:gap-4 lg:gap-6">
//                       <button
//                         onClick={() => setActiveTab("country")}
//                         className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
//                           activeTab === "country"
//                             ? "bg-teal-100 text-teal-700"
//                             : "text-gray-500 hover:text-gray-700"
//                         }`}
//                         data-testid="tab-phone-country"
//                       >
//                         <div className={`h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 flex items-center justify-center ${
//                           activeTab === "country" ? "border-teal-500" : "border-gray-400"
//                         }`}>
//                           {activeTab === "country" && (
//                             <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-teal-500" />
//                           )}
//                         </div>
//                         {t("website.home.hero.country", "Country")}
//                       </button>
//                       <button
//                         onClick={() => setActiveTab("region")}
//                         className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
//                           activeTab === "region"
//                             ? "bg-teal-100 text-teal-700"
//                             : "text-gray-500 hover:text-gray-700"
//                         }`}
//                         data-testid="tab-phone-region"
//                       >
//                         <div className={`h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 flex items-center justify-center ${
//                           activeTab === "region" ? "border-teal-500" : "border-gray-400"
//                         }`}>
//                           {activeTab === "region" && (
//                             <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-teal-500" />
//                           )}
//                         </div>
//                         {t("website.home.hero.region", "Region")}
//                       </button>
//                     </div>

//                     {/* Search Bar */}
//                     <div className="relative flex items-center">
//                       <input
//                         type="text"
//                         placeholder={activeTab === "country" ? t("website.home.hero.searchCountry", "Search for a country...") : t("website.home.hero.searchRegion", "Search for a region...")}
//                         value={searchQuery}
//                         onChange={(e) => setSearchQuery(e.target.value)}
//                         className="w-full pl-3 sm:pl-4 lg:pl-5 pr-10 sm:pr-12 lg:pr-14 h-10 sm:h-12 lg:h-14 rounded-full border-2 border-teal-200 focus:border-teal-400 focus:outline-none text-xs sm:text-sm text-gray-700 bg-white placeholder:text-gray-400"
//                         data-testid="input-phone-search"
//                       />
//                       <button
//                         className="absolute right-1 sm:right-1.5 h-8 w-8 sm:h-9 sm:w-9 lg:h-11 lg:w-11 rounded-full bg-teal-500 hover:bg-teal-600 flex items-center justify-center transition-colors"
//                         data-testid="button-phone-search"
//                       >
//                         <Search className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
//                       </button>
//                     </div>

//                     {/* Popular Section */}
//                     <div className="pt-1 sm:pt-2">
//                       <p className="text-[10px] sm:text-xs font-medium text-gray-500 mb-2 sm:mb-3 lg:mb-4 uppercase tracking-wide">
//                         {searchQuery ? t("website.home.hero.results", "Results") : t("website.home.hero.popular", "Popular")}
//                       </p>
                      
//                       {activeTab === "country" ? (
//                         <div className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:gap-3">
//                           {filteredCountries.length > 0 ? (
//                             filteredCountries.map((country) => (
//                               <button
//                                 key={country.country_code}
//                                 onClick={() => handleCountryClick(country.country_code)}
//                                 className="flex flex-col items-center gap-1 sm:gap-1.5 lg:gap-2 p-1.5 sm:p-2 lg:p-2.5 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors group"
//                                 data-testid={`phone-country-${country.country_code}`}
//                               >
//                                 <div className="h-8 w-11 sm:h-10 sm:w-14 lg:h-12 lg:w-16 rounded sm:rounded-md overflow-hidden border border-gray-200 shadow-sm">
//                                   <ReactCountryFlag
//                                     countryCode={country.country_code}
//                                     svg
//                                     style={{ width: "100%", height: "100%", objectFit: "cover" }}
//                                   />
//                                 </div>
//                                 <span className="text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-700 text-center leading-tight line-clamp-2 group-hover:text-teal-600">
//                                   {country.country_name}
//                                 </span>
//                               </button>
//                             ))
//                           ) : (
//                             <p className="col-span-3 text-center text-xs text-gray-500 py-4">
//                               No countries found
//                             </p>
//                           )}
//                         </div>
//                       ) : (
//                         <div className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:gap-3">
//                           {filteredRegions.length > 0 ? (
//                             filteredRegions.map((region) => (
//                               <button
//                                 key={region.id}
//                                 onClick={() => handleRegionClick(region)}
//                                 className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors text-left"
//                                 data-testid={`phone-region-${region.id}`}
//                               >
//                                 <div className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 rounded-md sm:rounded-lg bg-gradient-to-br from-teal-100 to-teal-100 flex items-center justify-center flex-shrink-0">
//                                   <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-teal-600" />
//                                 </div>
//                                 <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 line-clamp-1">
//                                   {region.name}
//                                 </span>
//                               </button>
//                             ))
//                           ) : (
//                             <p className="col-span-2 text-center text-xs text-gray-500 py-4">
//                               No regions found
//                             </p>
//                           )}
//                         </div>
//                       )}
//                     </div>

//                     {/* CTA Button */}
//                     <div className="pt-2 sm:pt-3 lg:pt-4">
//                       <Link href="/destinations">
//                         <button 
//                           className="w-full h-10 sm:h-12 lg:h-14 rounded-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold text-xs sm:text-sm lg:text-base transition-all"
//                           data-testid="button-view-all-destinations"
//                         >
//                           View All Destinations
//                         </button>
//                       </Link>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }





import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Star, Globe, MapPin, CreditCard, Smartphone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ReactCountryFlag from "react-country-flag";
import { HeroStepsIllustrations } from "./HeroStepsIllustrations";
import { useTranslation } from "@/contexts/TranslationContext";

interface Country {
  country_name: string;
  country_code: string;
}

interface CountriesResponse {
  data: {
    countries: Country[];
  };
}

interface Region {
  id: string;
  name: string;
  slug?: string;
}

interface RegionsResponse {
  data: Region[];
}

const popularCountryCodes = ["US", "GB", "AE", "JP", "FR", "DE"];

const fallbackCountries: Country[] = [
  { country_name: "United States", country_code: "US" },
  { country_name: "United Kingdom", country_code: "GB" },
  { country_name: "UAE", country_code: "AE" },
  { country_name: "Japan", country_code: "JP" },
  { country_name: "France", country_code: "FR" },
  { country_name: "Germany", country_code: "DE" },
];

const fallbackRegions: Region[] = [
  { id: "1", name: "Europe", slug: "europe" },
  { id: "2", name: "Asia", slug: "asia" },
  { id: "3", name: "North America", slug: "north-america" },
  { id: "4", name: "Middle East", slug: "middle-east" },
  { id: "5", name: "Africa", slug: "africa" },
  { id: "6", name: "Oceania", slug: "oceania" },
];


export function EsimNumHero() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"country" | "region">("country");
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();

  const { data: countriesResponse } = useQuery<CountriesResponse>({
    queryKey: ["/countries"],
  });

  const { data: regionsResponse } = useQuery<RegionsResponse>({
    queryKey: ["/api/regions"],
  });

  const apiCountries = countriesResponse?.data?.countries || [];
  const countries = apiCountries.length > 0 ? apiCountries : fallbackCountries;
  
  const apiRegions = regionsResponse?.data || [];
  const regions = apiRegions.length > 0 ? apiRegions : fallbackRegions;

  const popularCountries = countries.filter(c => 
    popularCountryCodes.includes(c.country_code)
  ).slice(0, 6);

  const displayPopular = popularCountries.length > 0 ? popularCountries : fallbackCountries;

  const filteredCountries = searchQuery
    ? countries.filter(c => 
        c.country_name?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : displayPopular;

  const filteredRegions = searchQuery
    ? regions.filter(r => 
        r.name?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : regions.slice(0, 6);

  const handleCountryClick = (countryCode: string) => {
    setLocation(`/destination/${countryCode.toLowerCase()}`);
  };

  const handleRegionClick = (region: Region) => {
    setLocation(`/region/${region.slug || region.id}`);
  };

  return (
    <section className="relative bg-gradient-to-b from-background to-muted/30 pt-20 sm:pt-28 pb-0 overflow-visible">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 lg:gap-4">
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left pt-2 sm:pt-4 lg:pt-12 lg:max-w-xl">
            <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 rounded-full mb-6">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                {t("website.home.hero.trusted", "Trusted by 1M+ Travelers Worldwide")}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-3 sm:mb-4">
              {t("website.home.hero.title", "Your Digital")}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-500">
                eSIM
              </span>{" "}
              <br className="hidden sm:block" />
              {t("website.home.hero.titlePart2", "for the World")}
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-4 sm:mb-6 max-w-lg mx-auto lg:mx-0">
              {t("website.home.hero.subtitle", "Data + Voice | Instant Activation | No Roaming Fees")}
            </p>

            {/* Decorative line - hidden on mobile */}
            <div className="hidden sm:flex items-center gap-2 mb-6 justify-center lg:justify-start">
              <svg className="h-8 w-24 text-muted-foreground/50" viewBox="0 0 100 30">
                <path 
                  d="M0 15 Q25 5, 50 15 T100 15" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
              </svg>
              <span className="text-sm italic text-muted-foreground">{t("website.home.hero.searchConnect", "Search & connect instantly")}</span>
            </div>

            {/* Quick Steps - Compact 3-step guide - hidden on mobile */}
            <div className="hidden sm:flex flex-wrap items-center gap-3 justify-center lg:justify-start mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-violet-950/40 border border-teal-100 dark:border-teal-800/50">
                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-teal-500 text-white text-[10px] font-bold">1</div>
                <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-medium text-teal-700 dark:text-teal-300">{t("website.home.hero.step1", "Choose Destination")}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/50">
                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">2</div>
                <CreditCard className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{t("website.home.hero.step2", "Complete Payment")}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/50">
                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">3</div>
                <Smartphone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{t("website.home.hero.step3", "Scan & Connect")}</span>
              </div>
            </div>

            {/* Animated Illustrations below step pills - hidden on mobile */}
            <div className="hidden sm:block">
              <HeroStepsIllustrations />
            </div>
          </div>

          {/* Right Side - Phone Mockup */}
          <div className="flex justify-center lg:justify-end relative flex-shrink-0 w-full lg:w-auto">
            {/* Decorative blurs - hidden on mobile */}
            <div className="hidden sm:block absolute -top-16 -left-16 w-40 h-40 bg-teal-200 dark:bg-teal-900/40 rounded-full blur-3xl opacity-50 z-0" />
            <div className="hidden sm:block absolute top-40 -right-8 w-48 h-48 bg-teal-200 dark:bg-teal-900/40 rounded-full blur-3xl opacity-50 z-0" />
            
            {/* Phone Container - positioned to extend below and hide behind feature strip */}
            <div className="relative z-10 mb-[-120px] sm:mb-[-180px] lg:mb-[-220px]">
              {/* Phone Frame - responsive sizing */}
              <div 
                className="relative bg-slate-800 dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] lg:rounded-[48px] p-1.5 sm:p-2 lg:p-2.5 shadow-2xl w-[280px] sm:w-[320px] lg:w-[380px] mx-auto"
              >
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 sm:w-28 lg:w-32 h-5 sm:h-6 lg:h-7 bg-slate-800 dark:bg-slate-900 rounded-b-xl sm:rounded-b-2xl z-20" />
                
                {/* Screen */}
                <div className="bg-white dark:bg-gray-50 rounded-[24px] sm:rounded-[32px] lg:rounded-[40px] overflow-hidden">
                  <div className="px-3 sm:px-4 lg:px-5 pt-8 sm:pt-10 lg:pt-12 pb-4 sm:pb-5 lg:pb-6 space-y-3 sm:space-y-4 lg:space-y-5" style={{ minHeight: '420px' }}>
                    {/* Tabs */}
                    <div className="flex items-center justify-center gap-3 sm:gap-4 lg:gap-6">
                      <button
                        onClick={() => setActiveTab("country")}
                        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                          activeTab === "country"
                            ? "bg-teal-100 text-teal-700"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                        data-testid="tab-phone-country"
                      >
                        <div className={`h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 flex items-center justify-center ${
                          activeTab === "country" ? "border-teal-500" : "border-gray-400"
                        }`}>
                          {activeTab === "country" && (
                            <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-teal-500" />
                          )}
                        </div>
                        {t("website.home.hero.country", "Country")}
                      </button>
                      <button
                        onClick={() => setActiveTab("region")}
                        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                          activeTab === "region"
                            ? "bg-teal-100 text-teal-700"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                        data-testid="tab-phone-region"
                      >
                        <div className={`h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 flex items-center justify-center ${
                          activeTab === "region" ? "border-teal-500" : "border-gray-400"
                        }`}>
                          {activeTab === "region" && (
                            <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-teal-500" />
                          )}
                        </div>
                        {t("website.home.hero.region", "Region")}
                      </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder={activeTab === "country" ? t("website.home.hero.searchCountry", "Search for a country...") : t("website.home.hero.searchRegion", "Search for a region...")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-3 sm:pl-4 lg:pl-5 pr-10 sm:pr-12 lg:pr-14 h-10 sm:h-12 lg:h-14 rounded-full border-2 border-teal-200 focus:border-teal-400 focus:outline-none text-xs sm:text-sm text-gray-700 bg-white placeholder:text-gray-400"
                        data-testid="input-phone-search"
                      />
                      <button
                        className="absolute right-1 sm:right-1.5 h-8 w-8 sm:h-9 sm:w-9 lg:h-11 lg:w-11 rounded-full bg-teal-500 hover:bg-teal-600 flex items-center justify-center transition-colors"
                        data-testid="button-phone-search"
                      >
                        <Search className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </button>
                    </div>

                    {/* Popular Section */}
                    <div className="pt-1 sm:pt-2">
                      <p className="text-[10px] sm:text-xs font-medium text-gray-500 mb-2 sm:mb-3 lg:mb-4 uppercase tracking-wide">
                        {searchQuery ? t("website.home.hero.results", "Results") : t("website.home.hero.popular", "Popular")}
                      </p>
                      
                      {activeTab === "country" ? (
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:gap-3">
                          {filteredCountries.length > 0 ? (
                            filteredCountries.map((country) => (
                              <button
                                key={country.country_code}
                                onClick={() => handleCountryClick(country.country_code)}
                                className="flex flex-col items-center gap-1 sm:gap-1.5 lg:gap-2 p-1.5 sm:p-2 lg:p-2.5 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors group"
                                data-testid={`phone-country-${country.country_code}`}
                              >
                                <div className="h-8 w-11 sm:h-10 sm:w-14 lg:h-12 lg:w-16 rounded sm:rounded-md overflow-hidden border border-gray-200 shadow-sm">
                                  <ReactCountryFlag
                                    countryCode={country.country_code}
                                    svg
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  />
                                </div>
                                <span className="text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-700 text-center leading-tight line-clamp-2 group-hover:text-teal-600">
                                  {country.country_name}
                                </span>
                              </button>
                            ))
                          ) : (
                            <p className="col-span-3 text-center text-xs text-gray-500 py-4">
                              No countries found
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:gap-3">
                          {filteredRegions.length > 0 ? (
                            filteredRegions.map((region) => (
                              <button
                                key={region.id}
                                onClick={() => handleRegionClick(region)}
                                className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors text-left"
                                data-testid={`phone-region-${region.id}`}
                              >
                                <div className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 rounded-md sm:rounded-lg bg-gradient-to-br from-teal-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                                  <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-teal-600" />
                                </div>
                                <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 line-clamp-1">
                                  {region.name}
                                </span>
                              </button>
                            ))
                          ) : (
                            <p className="col-span-2 text-center text-xs text-gray-500 py-4">
                              No regions found
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* CTA Button */}
                    <div className="pt-2 sm:pt-3 lg:pt-4">
                      <Link href="/destinations">
                        <button 
                          className="w-full h-10 sm:h-12 lg:h-14 rounded-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold text-xs sm:text-sm lg:text-base transition-all"
                          data-testid="button-view-all-destinations"
                        >
                          View All Destinations
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

