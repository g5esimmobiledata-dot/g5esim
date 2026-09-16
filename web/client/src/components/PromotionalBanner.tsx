import { CheckCircle2 } from 'lucide-react';
import { GiCheckMark } from 'react-icons/gi';
import { HoverBorderGradientDemo } from './HoverBorderGradientDemo';
import { MovingBorderDemo } from './MovingBorderDemo';
import { useSettingByKey } from '@/hooks/useSettings';

const awards = [
  {
    logo: '/images/IITM1+1.png',
    title: 'Best Travel Tech Product',
    description: 'in IITM Chennai, Hyderabad & Bengaluru',
  },
  {
    logo: '/images/BLTM+(1).png',
    title: 'Most Innovative Product of the Year',
    description: 'at BLTM, Delhi',
  },
  {
    logo: '/images/MVNO1.png',
    title: 'Top 5 as Best eSIM Provider',
    description: 'at MVNO World 2025, Vienna, Austria',
  },
];

export function PromotionalSection() {
  const siteName = useSettingByKey('platform_name');
  return (
    <section className="w-full overflow-hidden bg-background">
      {/* ============================================
          AWARDS SECTION - Theme Aware
          ============================================ */}
      <div className="py-12 md:py-16">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Heading - Theme Aware */}
          <div className="mb-8 md:mb-10">
            <h2 className="text-lg md:text-xl font-bold text-center flex items-center justify-center gap-2">
              <GiCheckMark className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-foreground">Press, Media & Awards</span>
            </h2>
          </div>

          {/* Awards Grid - Theme Aware Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 max-w-6xl mx-auto">
            {awards.map((award, index) => (
              <div
                key={index}
                className="flex items-center gap-3 md:gap-4 border-r border-border last:border-r-0 dark:border-border pr-8 md:pr-10 hover:scale-105 transition-transform"
              >
                {/* Logo - With dark mode filter */}
                <div className="flex-shrink-0 w-14 h-14 md:w-16 md:h-16 bg-muted rounded-lg p-2 flex items-center justify-center">
                  <img
                    src={award.logo}
                    alt={award.title}
                    className="w-full h-full object-contain dark:brightness-110 dark:contrast-125"
                  />
                </div>

                {/* Content - Theme Text */}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm md:text-base text-foreground leading-tight">
                    {award.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================
          PROMOTIONAL BANNER - Theme Aware
          ============================================ */}
      <div className="py-6 md:py-8">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Banner Card with Theme */}
          <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-xl border border-border bg-card">
            {/* Background Image with Dark Overlay */}
            <div className="relative">
              <img
                src="/offer+banner.png"
                alt="Download  App and Get 25% OFF"
                className="w-full h-auto object-cover dark:opacity-100"
              />

              {/* Dark overlay for better text contrast in dark mode */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent dark:from-black/60 dark:via-black/40 dark:to-black/20"></div>
            </div>

            {/* Content Overlay - Theme Aware */}
            <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8">
              {/* Top Text */}
              <div className="absolute top-[15%] right-[5%] md:right-[15%] max-w-xl text-right">
                <p className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white drop-shadow-lg">
                  Download <span className="text-primary neon-text-glow">{siteName} app</span> & Get
                </p>
              </div>

              {/* App Store Badges */}
              <div className="absolute bottom-[15%] md:bottom-[20%] right-[10%] md:right-[25%]">
                <div className="flex items-center gap-3 md:gap-4">
                  <a
                    href="#"
                    className="hover:scale-110 transition-transform"
                    aria-label="Download on App Store"
                  >
                    <img
                      className="h-8 md:h-10 drop-shadow-lg"
                      src="/images/stores/AppStore_new.png"
                      alt="App Store"
                    />
                  </a>
                  <a
                    href="#"
                    className="hover:scale-110 transition-transform"
                    aria-label="Get it on Play Store"
                  >
                    <img
                      className="h-8 md:h-10 drop-shadow-lg"
                      src="/images/stores/PlayStore.png"
                      alt="Play Store"
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
