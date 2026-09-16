import { Button } from '@/components/ui/button';
import { useSettingByKey } from '@/hooks/useSettings';
import { Zap, Shield } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useLocation } from 'wouter';
// export function TravelReadyBanner() {
//   const siteName = useSettingByKey('platform_name');

//   const [, navigate] = useLocation();
//   return (
//     <section className="w-full py-8 md:py-12 relative">
//       <div className="containers">
//         {/* 🎨 GRADIENT BACKGROUND - Theme Aware (Direction changed) */}
//         <div className="overflow-hidden lg:overflow-visible rounded-3xl to-accent/10 dark:from-primary/20 dark:via-primary/10 dark:to-accent/20 border border-border">
//           <div className="grid lg:grid-cols-[1fr_400px] gap-6 lg:gap-8 items-center p-6 md:p-8 lg:p-10 relative group  bg-card rounded-3xl">
//             {/* ============================================
//                 LEFT - CONTENT (Theme-aware)
//                 ============================================ */}
//             <div className="space-y-4 lg:space-y-5 relative z-10 order-2 lg:order-1">
//               {/* Logo/Badge */}
//               <div className="inline-block">
//                 <span className="text-xl md:text-2xl font-bold text-foreground">
//                   +{siteName} <span className="text-primary">Plans</span>
//                 </span>
//               </div>

//               {/* Heading */}
//               <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
//                 Ready to Travel Worldwide?
//               </h2>

//               {/* Subheading */}
//               <p className="text-lg md:text-xl text-foreground font-medium">
//                 Get connected before you fly!
//               </p>

//               {/* Description - Muted text for body */}
//               <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
//                 Purchase your <span className="font-semibold text-foreground">eSIM today</span> and
//                 activate it when you land. No more searching for local SIM cards or dealing with
//                 expensive roaming charges. Get started for just{' '}
//                 <span className="font-bold text-primary">$4.99/GB</span>
//                 —travel smart,{' '}
//                 <span className="font-semibold text-foreground">stay connected,</span> and explore
//                 with confidence.
//               </p>

//               {/* CTA Button */}
//               <div className="pt-2 w-full text-center md:text-start">
//                 <Button
//                   onClick={() => navigate('/destinations')}
//                   size="lg"
//                   className="bg-primary-gradient text-white hover:bg-primary/90  font-semibold px-6 py-3 rounded-xl  shadow-lg hover:shadow-primary/50 transition-all hover:scale-105 active:scale-95"
//                 >
//                   Browse Destinations
//                 </Button>
//               </div>

//               {/* Features - Subtle colors */}
//               <div className="flex flex-wrap items-center gap-4 pt-2 text-xs md:text-sm text-muted-foreground">
//                 <div className="flex items-center gap-1.5  transition-colors">
//                   <Zap className="w-4 h-4 text-primary" />
//                   <span className="font-medium">Instant activation</span>
//                 </div>
//                 <span className="text-border">|</span>
//                 <div className="flex items-center gap-1.5  transition-colors">
//                   <Shield className="w-4 h-4 text-primary" />
//                   <span className="font-medium">No physical SIM needed</span>
//                 </div>
//               </div>
//             </div>

//             {/* Spacer for mobile */}
//             <div className="hidden lg:block lg:max-w-[400px] order-2"></div>

//             {/* ============================================
//                 RIGHT - IMAGE with Overflow Effect
//                 ============================================ */}
//             <div className="relative w-full lg:absolute lg:h-[600px] lg:bottom-0 lg:right-0 lg:w-auto order-1 lg:order-2">
//               <img
//                 src="/images/boy_usePhone.png"
//                 alt=" Plans"
//                 className="w-full h-auto lg:h-full lg:w-auto object-contain max-w-full lg:max-w-none "
//               />
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }






export function TravelReadyBanner() {
  const siteName = useSettingByKey('platform_name');
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  return (
    <section className="w-full py-8 md:py-12 relative">
      <div className="containers">
        <div className="overflow-hidden lg:overflow-visible rounded-3xl border border-border">
          <div className="grid lg:grid-cols-[1fr_400px] gap-6 lg:gap-8 items-center p-6 md:p-8 lg:p-10 relative bg-card rounded-3xl">

            <div className="space-y-4 lg:space-y-5 relative z-10 order-2 lg:order-1">

              {/* Logo/Badge */}
              <div className="inline-block">
                <span className="text-xl md:text-2xl font-bold text-foreground">
                  +{siteName} <span className="text-primary">{t("website.banner.plans", "Plans")}</span>
                </span>
              </div>

              {/* Heading */}
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                {t("website.banner.title", "Ready to Travel Worldwide?")}
              </h2>

              {/* Subheading */}
              <p className="text-lg md:text-xl text-foreground font-medium">
                {t("website.banner.subtitle", "Get connected before you fly!")}
              </p>

              {/* Description */}
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                {t("website.banner.description1", "Purchase your")}{" "}
                <span className="font-semibold text-foreground">
                  {t("website.banner.esimToday", "eSIM today")}
                </span>{" "}
                {t("website.banner.description2", "and activate it when you land. No more searching for local SIM cards or dealing with expensive roaming charges. Get started for just")}{" "}
                <span className="font-bold text-primary">$4.99/GB</span>{" "}
                {t("website.banner.description3", "—travel smart,")}{" "}
                <span className="font-semibold text-foreground">
                  {t("website.banner.stayConnected", "stay connected")}
                </span>
                .
              </p>

              {/* CTA */}
              <div className="pt-2 w-full text-center md:text-start">
                <Button
                  onClick={() => navigate('/destinations')}
                  size="lg"
                  className="bg-primary-gradient text-white hover:bg-primary/90 font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-primary/50 transition-all hover:scale-105 active:scale-95"
                >
                  {t("website.banner.button", "Browse Destinations")}
                </Button>
              </div>

              {/* Features */}
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs md:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-medium">
                    {t("website.banner.feature1", "Instant activation")}
                  </span>
                </div>
                <span className="text-border">|</span>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="font-medium">
                    {t("website.banner.feature2", "No physical SIM needed")}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative w-full lg:absolute lg:h-[600px] lg:bottom-0 lg:right-0 lg:w-auto order-1 lg:order-2">
              <img
                src="/images/boy_usePhone.png"
                alt="Plans"
                className="w-full h-auto lg:h-full lg:w-auto object-contain"
              />
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}