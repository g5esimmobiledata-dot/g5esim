import { Link } from 'wouter';
import { Check, Signal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactCountryFlag from 'react-country-flag';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettingByKey } from '@/hooks/useSettings';

function PlanSelectionMockup() {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl bg-slate-100 p-4 mt-4 dark:bg-slate-800/50">
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/60">
          <div className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-500" />
          <div className="flex-1">
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-600 rounded" />
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700/50 rounded-lg border-2 border-primary">
          <div className="h-4 w-4 rounded-full bg-gradient-to-r from-primary to-primary flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-950 dark:text-white">3GB</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {t('website.home.howItWorks.mockup.days', '30days')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/60">
          <div className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-500" />
          <div className="flex-1">
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-600 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EnableEsimMockup() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center mt-6 mb-2">
      <div className="bg-gradient-to-br from-teal-100 to-teal-50 dark:from-teal-900/30 dark:to-teal-800/20 rounded-full p-8">
        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-primary to-primary-dark flex items-center justify-center">
          <Check className="h-10 w-10 text-white stroke-[3]" />
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
        {t('website.home.howItWorks.mockup.enableEsim', 'Enable eSIM')}
      </p>
    </div>
  );
}

function UsageDashboardMockup() {
  const { t } = useTranslation();
  return (
    <div className="bg-slate-950 dark:bg-slate-800 rounded-xl p-4 mt-4 border border-slate-800 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ReactCountryFlag
            countryCode="US"
            svg
            style={{ width: '1.5em', height: '1.5em' }}
            className="rounded-sm"
          />
          <span className="font-semibold text-sm text-white">
            {t('website.home.howItWorks.mockup.country', 'United States')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Signal className="h-3.5 w-3.5 text-primary" />
          <Badge className="bg-green-500 hover:bg-green-500 text-white text-[10px] px-1.5 py-0">
            {t('website.home.howItWorks.mockup.active', 'Active')}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-300">
            {t('website.home.howItWorks.mockup.remainingData', 'Remaining data')}
          </span>
          <span className="text-sm font-semibold text-white">3/3GB</span>
        </div>

        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-primary to-primary-dark rounded-full" />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-300">
            {t('website.home.howItWorks.mockup.expiresIn', 'Expires in')}
          </span>
          <span className="text-sm font-semibold text-white">
            {t('website.home.howItWorks.mockup.expiryTime', '29 Days, 7 Hours')}
          </span>
        </div>
      </div>
    </div>
  );
}

export function HowItWorksSteps() {
  const { t } = useTranslation();
  const siteName = useSettingByKey('platform_name');
  const howItWorksTitle = t('website.home.howItWorks.title', `How Does ${siteName} Work`)
    .replace(/\bdoes\b/g, 'Does')
    .replace(/\bwork\b/g, 'Work');

  const steps = [
    {
      stepKey: 'website.home.howItWorks.step1.label',
      titleKey: 'website.home.howItWorks.step1.title',
      descKey: 'website.home.howItWorks.step1.description',
      stepFallback: 'Step 1',
      titleFallback: 'Choose A Data Plan For Your Trip',
      descFallback: 'Find The Best eSIM Plan Tailored To Your Destination.',
      mockup: PlanSelectionMockup,
    },
    {
      stepKey: 'website.home.howItWorks.step2.label',
      titleKey: 'website.home.howItWorks.step2.title',
      descKey: 'website.home.howItWorks.step2.description',
      stepFallback: 'Step 2',
      titleFallback: 'Scan The QR Code To Activate',
      descFallback: 'Instantly Install And Set Up Your eSIM In Seconds.',
      mockup: EnableEsimMockup,
    },
    {
      stepKey: 'website.home.howItWorks.step3.label',
      titleKey: 'website.home.howItWorks.step3.title',
      descKey: 'website.home.howItWorks.step3.description',
      stepFallback: 'Step 3',
      titleFallback: 'Enjoy Fast 4G/5G Data Abroad',
      descFallback: 'Stay Connected Anywhere With Reliable High-Speed Internet.',
      mockup: UsageDashboardMockup,
    },
  ];

  return (
    <section className="bg-white py-16 text-slate-950 dark:bg-slate-950 dark:text-white md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-950 text-center mb-12 dark:text-white">
          {howItWorksTitle}
        </h2>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {steps.map((item, index) => (
            <Card
              key={index}
              className="relative border-slate-200 bg-white text-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/70 dark:text-white"
              data-testid={`step-card-${index}`}
            >
              <CardContent className="p-6 md:p-8">
                <span className="text-xs font-medium text-primary mb-3 block dark:text-teal-300">
                  {t(item.stepKey, item.stepFallback)}
                </span>

                <h3 className="font-bold text-lg text-slate-950 mb-2 capitalize dark:text-white">
                  {t(item.titleKey, item.titleFallback)}
                </h3>

                <p className="text-sm text-slate-600 capitalize dark:text-slate-300">
                  {t(item.descKey, item.descFallback)}
                </p>

                <item.mockup />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link href="/destinations">
            <Button
              size="lg"
              className="bg-primary-gradient text-white rounded-full px-10"
              data-testid="button-get-started"
            >
              {t('website.home.howItWorks.cta', 'Get started now')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
