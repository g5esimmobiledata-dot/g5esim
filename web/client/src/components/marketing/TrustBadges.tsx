import { Award, Star, Shield, Users } from 'lucide-react';
import { GiCheckMark } from 'react-icons/gi';
import { useTranslation } from '@/contexts/TranslationContext';

export function TrustBadges() {
  const { t } = useTranslation();

  const awards = [
    {
      icon: Award,
      title: t('website.home.trust.award1.title', 'Best Travel Tech Product'),
      subtitle: t('website.home.trust.award1.subtitle', 'Travel Innovation Awards 2024'),
    },
    {
      icon: Star,
      title: t('website.home.trust.award2.title', '4.8/5 Rating'),
      subtitle: t('website.home.trust.award2.subtitle', 'Based on 50,000+ reviews'),
    },
    {
      icon: Users,
      title: t('website.home.trust.award3.title', '500K+ Happy Travelers'),
      subtitle: t('website.home.trust.award3.subtitle', 'Trusted worldwide'),
    },
  ];

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            {t('website.home.trust.title', 'Press, Media & Awards')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto dark:text-white">
          {awards.map((award, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
              data-testid={`award-badge-${index}`}
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <award.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{award.title}</p>
                <p className="text-xs text-muted-foreground">{award.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Network Partners - Only Images
const networkPartners = [
  { name: 'Partner 1', logo: '/images/BLTM+(1).png' },
  { name: 'Partner 2', logo: '/images/IITM1+1.png' },
  { name: 'Partner 3', logo: '/images/MVNO1.png' },
  { name: 'Partner 4', logo: '/images/BLTM+(1).png' },
  { name: 'Partner 5', logo: '/images/IITM1+1.png' },
  { name: 'Partner 6', logo: '/images/MVNO1.png' },
  { name: 'Partner 7', logo: '/images/BLTM+(1).png' },
  { name: 'Partner 8', logo: '/images/IITM1+1.png' },
];

export function NetworkPartners() {
  const { t } = useTranslation();
  return (
    <section className="py-12 overflow-hidden border-y border-border/50 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="text-center">
          <p className="text-center inline-flex items-center gap-2 justify-center text-sm font-medium dark:text-primary uppercase tracking-wider">
            <GiCheckMark className="text-green-600" /> {t('website.home.partners.title', 'Global Network Partners')}
          </p>
        </div>
      </div>
      <div className="relative">
        {/* Gradient Fade on Edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-muted/20 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-muted/20 to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee whitespace-nowrap">
          {[...networkPartners, ...networkPartners, ...networkPartners].map((partner, index) => (
            <div key={index} className="mx-10 flex items-center justify-center min-w-[140px] h-20">
              <img
                src={partner.logo}
                alt={partner.name}
                className="h-16 w-auto object-contain filter grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Payment Methods - Only Images
const paymentMethods = [
  { name: 'Payment 1', logo: '/bou.png' },
  { name: 'Payment 2', logo: '/bou.png' },
  { name: 'Payment 3', logo: '/bou.png' },
  { name: 'Payment 4', logo: '/bou.png' },
  { name: 'Payment 5', logo: '/bou.png' },
  { name: 'Payment 6', logo: '/bou.png' },
];

export function PaymentMethods() {
  const { t } = useTranslation();
  return (
    <section className="py-10 border-t border-border/50 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-black " />
            {t('website.home.payments.title', 'Secure payments')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {paymentMethods.map((method, index) => (
              <div
                key={index}
                className="h-10 w-auto flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300 cursor-pointer"
                title={method.name}
              >
                <img src={method.logo} alt={method.name} className="h-full w-auto object-contain" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
