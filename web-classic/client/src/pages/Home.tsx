import { SEOHead } from '@/components/SEOHead';
import { useTranslation } from '@/contexts/TranslationContext';
import { EsimNumHero } from '@/components/sections/EsimNumHero';
import { TopFeaturesStrip } from '@/components/sections/TopFeaturesStrip';
import { DestinationsTabs } from '@/components/sections/DestinationsTabs';
import { PopularEsims } from '@/components/sections/PopularEsims';
import { CompleteEsims } from '@/components/sections/CompleteEsims';
import { BenefitsSection } from '@/components/sections/BenefitsSection';
import { HowItWorksSteps } from '@/components/sections/HowItWorksSteps';
import { FAQWithSupport } from '@/components/sections/FAQWithSupport';
import { TravelerTestimonials } from '@/components/sections/TravelerTestimonials';
import { Wifi, Smartphone, Phone, Headphones, Signal, Globe } from 'lucide-react';
import { HeroSection } from '../components/sections/HeroSection';
import {
  ComparisonTable,
  InfiniteScrollTicker,
  NetworkPartners,
  TrustBadges,
} from '@/components/marketing';
import FeatureSectionCompo from '@/components/sections/FeatureSectionCompo';
import { SubscriptionBanner } from '@/components/sections/SubscriptionBanner';
import { TravelReadyBanner } from '@/components/sections/TravelReadyBanner';
import { AgencyProblemsSection } from '@/components/sections/AgencyProblemsSection';
import { useSettingByKey, useSettings } from '@/hooks/useSettings';
import BannerSection from '@/components/sections/BannerSection';
import { useUser } from '@/hooks/use-user';
import { HomepagePopup } from '@/components/sections/HomepagePopup';


import BannerSlider from "@/components/BannerSlider";

// const bannerImages = [
//   "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070",
//   "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=2070",
//   "https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=2070"
// ];



export default function Home() {
  const { t } = useTranslation();
  const siteName = useSettingByKey('platform_name');

  const { isAuthenticated, user } = useUser();

  // console.log('isAuthenticated', isAuthenticated);
  // console.log('siteName_new', siteName);

  const featureItems = [
    { icon: Wifi, label: t('website.home.features.unlimitedData', 'Unlimited Data') },
    { icon: Smartphone, label: t('website.home.features.esimReady', 'eSIM Ready') },
    { icon: Phone, label: t('website.home.features.dataVoice', 'Data + Voice') },
    { icon: Headphones, label: t('website.home.features.support', '24x7 Support') },
    { icon: Signal, label: t('website.home.features.hotspot', 'Hotspot Sharing') },
    { icon: Globe, label: t('website.home.features.countries', '200+ Countries') },
  ];
  const seoTitle = t(
    'website.home.seo.title',
    `${siteName} - Affordable eSIM Plans for International Travel`,
  );
  const seoDescription = t(
    'website.home.seo.description',
    'Instant data in 200+ destinations with one eSIM, no roaming needed. Get affordable eSIM plans for international travel and stay connected worldwide.',
  );

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={['eSIM', 'travel eSIM', 'international data', 'roaming', 'mobile data', 'travel connectivity', 'prepaid data', 'global eSIM']}
        ogType="website"
        canonicalUrl={window.location.origin}
      />

      <div className="min-h-screen bg-white text-foreground dark:bg-slate-950 dark:text-white">
        {/* <SiteHeader /> */}

        <main className="bg-white dark:bg-slate-950">
          {/* Hero section wrapper - fills viewport with strip at bottom above floating nav */}
          <div className="relative min-h-screen flex flex-col md:pt-[140px] pt-[50px]">
            <HeroSection />

            <InfiniteScrollTicker />

            {/* <EsimNumHero /> */}

            {/* Spacer to push strip to bottom */}
            {/* <BannerSection /> */}
          </div>

          <TopFeaturesStrip />
          <section className="bg-white py-10 dark:bg-slate-950">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <BannerSlider />
            </div>
          </section>
          <DestinationsTabs />

          <PopularEsims />
          <FeatureSectionCompo />
          <CompleteEsims />
          <TrustBadges />
          <NetworkPartners />
          <SubscriptionBanner />
          <TravelReadyBanner />
          <BenefitsSection />
          <AgencyProblemsSection />

          <HowItWorksSteps />

          <ComparisonTable />
          <FAQWithSupport />
          <TravelerTestimonials />
        </main>

        {/* <SiteFooter /> */}
        <HomepagePopup />
      </div>
    </>
  );
}
