import { Link } from 'wouter';
import { Check, Smartphone, Shield, Globe, CreditCard, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/TranslationContext';

export function BenefitsSection() {
  const { t } = useTranslation();

  const benefits = [
    {
      icon: Smartphone,
      titleKey: 'website.home.benefits.convenience.title',
      descKey: 'website.home.benefits.convenience.description',
      titleFallback: 'Convenience',
      descFallback:
        'Activate a new plan anytime without visiting a store or waiting for a physical SIM card.',
    },
    {
      icon: Shield,
      titleKey: 'website.home.benefits.security.title',
      descKey: 'website.home.benefits.security.description',
      titleFallback: 'Security',
      descFallback:
        'eSIMs stay locked to your device, so if your phone is lost or stolen, your data remains protected.',
    },
    {
      icon: Globe,
      titleKey: 'website.home.benefits.flexibility.title',
      descKey: 'website.home.benefits.flexibility.description',
      titleFallback: 'Flexibility',
      descFallback:
        'Keep multiple data plans on one device and switch networks easily while traveling abroad.',
    },
    {
      icon: CreditCard,
      titleKey: 'website.home.benefits.noRoaming.title',
      descKey: 'website.home.benefits.noRoaming.description',
      titleFallback: 'No roaming fees',
      descFallback:
        'Use local data at affordable rates wherever you go, with no unexpected charges.',
    },
    {
      icon: Leaf,
      titleKey: 'website.home.benefits.sustainability.title',
      descKey: 'website.home.benefits.sustainability.description',
      titleFallback: 'Sustainability',
      descFallback: 'Reduce plastic waste and avoid damage from traditional SIM cards or slots.',
    },
  ];

  return (
    <section className="bg-muted/30 py-16 dark:bg-slate-950/95 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-8">
              {t('website.home.benefits.title', 'What are the benefits of eSIM')}
            </h2>

            <ul className="space-y-5">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex gap-4" data-testid={`benefit-item-${index}`}>
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mt-0.5">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {t(benefit.titleKey, benefit.titleFallback)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(benefit.descKey, benefit.descFallback)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 text-center md:text-center">
              <Link href="/destinations">
                <Button
                  className="bg-primary-gradient text-white rounded-full px-8"
                  data-testid="button-view-destinations"
                >
                  {t('website.home.benefits.cta', 'View All Destinations')}
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative">
              <div className="absolute -top-8 -right-8 w-64 h-64 bg-primary opacity-60 rounded-full blur-3xl" />
              <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-emerald-200/30 rounded-full blur-3xl" />

              <div className="relative rounded-3xl border border-orange-200/50 bg-gradient-to-br from-primary-dark to-primary-light/60 p-8 dark:border-white/10 dark:from-slate-900 dark:via-slate-900 dark:to-teal-500/10">
                <div className="space-y-4">
                  {benefits.slice(0, 4).map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900/90 dark:ring-1 dark:ring-white/10"
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary-light dark:bg-primary-light flex items-center justify-center">
                        <benefit.icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-medium text-sm text-foreground">
                        {t(benefit.titleKey, benefit.titleFallback)}
                      </span>
                      <Check className="h-5 w-5 text-emerald-500 ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
