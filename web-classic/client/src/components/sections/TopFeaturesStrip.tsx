import { Wifi, CreditCard, Smartphone, Zap } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

export function TopFeaturesStrip() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Wifi,
      titleKey: 'website.home.features.unlimited.title',
      descKey: 'website.home.features.unlimited.description',
      titleFallback: 'Unlimited data plans',
      descFallback: 'Stay connected with fast data worldwide.',
    },
    {
      icon: CreditCard,
      titleKey: 'website.home.features.noRoaming.title',
      descKey: 'website.home.features.noRoaming.description',
      titleFallback: 'No roaming charges',
      descFallback: 'Travel freely without extra charges.',
    },
    {
      icon: Smartphone,
      titleKey: 'website.home.features.keepSim.title',
      descKey: 'website.home.features.keepSim.description',
      titleFallback: 'Keep physical SIM',
      descFallback: 'Keep your local SIM for calls and texts.',
    },
    {
      icon: Zap,
      titleKey: 'website.home.features.quickSetup.title',
      descKey: 'website.home.features.quickSetup.description',
      titleFallback: 'Quick eSIM setup',
      descFallback: 'Activate online and connect in minutes.',
    },
  ];

  return (
    <section className="border-b border-border/50 bg-background py-12 dark:border-white/10 dark:bg-slate-950/95 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center group"
              data-testid={`feature-card-${index}`}
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary transition-transform group-hover:scale-105 dark:from-teal-500/25 dark:to-cyan-400/15 dark:ring-1 dark:ring-white/10">
                <feature.icon className="h-8 w-8 text-white " />
              </div>
              <h3 className="font-semibold text-foreground mb-1 text-sm md:text-base">
                {t(feature.titleKey, feature.titleFallback)}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                {t(feature.descKey, feature.descFallback)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
