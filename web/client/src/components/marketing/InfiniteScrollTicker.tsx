import {
  Infinity,
  Smartphone,
  Phone,
  Headphones,
  Wifi,
  Zap,
  Globe,
  Shield,
  Clock,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface TickerItem {
  icon: React.ReactNode;
  text: string;
}

interface InfiniteScrollTickerProps {
  items?: TickerItem[];
  className?: string;
}

export function InfiniteScrollTicker({
  items,
  className = '',
}: InfiniteScrollTickerProps) {
  const { t } = useTranslation();

  const defaultItems: TickerItem[] = [
    { icon: <Infinity className="h-5 w-5" />, text: t('website.ticker.lifetime', 'One eSIM for lifetime') },
    { icon: <Smartphone className="h-5 w-5" />, text: t('website.ticker.magicSim', 'Magic SIM Available') },
    { icon: <Phone className="h-5 w-5" />, text: t('website.ticker.dataVoice', 'Data + Voice + SMS') },
    { icon: <Headphones className="h-5 w-5" />, text: t('website.ticker.customerService', 'Customer Service') },
    { icon: <Wifi className="h-5 w-5" />, text: t('website.ticker.hotspot', 'Hotspot Sharing') },
    { icon: <Globe className="h-5 w-5" />, text: t('website.ticker.countries', '190+ Countries') },
    { icon: <Zap className="h-5 w-5" />, text: t('website.ticker.activation', 'Instant Activation') },
    { icon: <Shield className="h-5 w-5" />, text: t('website.ticker.secure', 'Secure & Reliable') },
    { icon: <Clock className="h-5 w-5" />, text: t('website.ticker.noExpiry', 'No Expiry Hassle') },
  ];

  const displayItems = items || defaultItems;
  const duplicatedItems = [...displayItems, ...displayItems, ...displayItems];

  return (
    <div
      className={`w-full overflow-hidden border-y border-lime-300 bg-gradient-to-r from-lime-300 via-yellow-200 to-lime-300 py-3 text-green-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-lime-300/70 dark:from-lime-300 dark:via-yellow-200 dark:to-lime-300 dark:text-green-950 md:mb-20 ${className}`}
      data-testid="ticker-features"
    >
      <div className="animate-scroll-ticker flex items-center whitespace-nowrap">
        {duplicatedItems.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 px-8 text-sm font-semibold text-current md:text-base"
            data-testid={`ticker-item-${index}`}
          >
            <span className="flex-shrink-0 text-green-700">{item.icon}</span>
            <span data-testid={`ticker-text-${index}`}>{item.text}</span>
            <span className="mx-2 h-1.5 w-1.5 rounded-full bg-green-700/70" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}
