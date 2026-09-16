'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, ArrowUp, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/use-user';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { isWhatsAppSupportAvailable } from '@/lib/supportAvailability';
import { useRoleModuleAccess } from '@/hooks/useRoleModuleAccess';

type PublicSettings = {
  support_whatsapp_number?: string;
  support_whatsapp_enabled?: string;
  support_whatsapp_mode?: string;
  support_whatsapp_schedule_enabled?: string;
  support_whatsapp_start_time?: string;
  support_whatsapp_end_time?: string;
  support_whatsapp_working_days?: string;
  timezone?: string;
  concierge_enabled?: string;
};

type StorefrontInfo = {
  whatsappNumber?: string | null;
  storefrontConfig?: {
    whatsappEnabled?: boolean;
    whatsappScheduleEnabled?: boolean;
    whatsappStartTime?: string;
    whatsappEndTime?: string;
    whatsappWorkingDays?: string[];
    conciergeEnabled?: boolean;
  } | null;
};

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function isWithinStorefrontSchedule(config?: StorefrontInfo['storefrontConfig']) {
  if (!config?.whatsappScheduleEnabled) return true;

  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  const workingDays = config.whatsappWorkingDays?.length
    ? config.whatsappWorkingDays
    : ['mon', 'tue', 'wed', 'thu', 'fri'];

  if (!workingDays.includes(dayKey)) return false;

  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const start = config.whatsappStartTime || '09:00';
  const end = config.whatsappEndTime || '18:00';

  if (start <= end) {
    return current >= start && current <= end;
  }

  return current >= start || current <= end;
}

export function FloatingButtons() {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { user } = useUser();
  const { enabled: conciergeModuleEnabled } = useRoleModuleAccess('concierge');
  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ['/api/public/settings'],
  });
  const { data: storefront } = useQuery<StorefrontInfo | null>({
    queryKey: ['/api/reseller/storefront/current'],
  });

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasStorefront = Boolean(storefront);
  const storefrontWhatsappAvailable =
    hasStorefront &&
    storefront?.storefrontConfig?.whatsappEnabled !== false &&
    isWithinStorefrontSchedule(storefront?.storefrontConfig);
  const supportNumber = hasStorefront
    ? storefrontWhatsappAvailable ? storefront?.whatsappNumber || '' : ''
    : ((user?.role === 'agent' || user?.role === 'reseller') ? user?.whatsappNumber : '') ||
      settings?.support_whatsapp_number ||
      '';
  const isAvailable = hasStorefront ? storefrontWhatsappAvailable : isWhatsAppSupportAvailable(settings || {});

  const whatsappUrl = buildWhatsAppUrl(
    isAvailable ? supportNumber : '',
    'Hello, I need help with eSIM support.',
  );
  const isCloudMode = settings?.support_whatsapp_mode === 'cloud_api';
  const conciergeEnabled = hasStorefront
    ? storefront?.storefrontConfig?.conciergeEnabled !== false
    : settings?.concierge_enabled !== 'false';
  const showConcierge = conciergeEnabled && (!user || conciergeModuleEnabled);

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-3 md:bottom-6">
      {showConcierge && (
        <Button
          size="icon"
          variant="default"
          className="rounded-full shadow-lg w-12 h-12 bg-lime-300 text-slate-950 hover:bg-lime-200"
          onClick={() => {
            if (user) {
              window.location.assign('/account/support?channel=concierge');
              return;
            }

            window.location.assign('/login?redirect=%2Faccount%2Fsupport%3Fchannel%3Dconcierge');
          }}
          data-testid="button-concierge-chat"
          aria-label="Open Concierge"
        >
          <Sparkles className="w-5 h-5" />
        </Button>
      )}

      <Button
        size="icon"
        variant="default"
        className="rounded-full shadow-lg w-12 h-12"
        onClick={() => {
          if (isCloudMode && user) {
            window.location.assign('/account/support?channel=whatsapp');
            return;
          }

          if (whatsappUrl) {
            window.location.assign(whatsappUrl);
            return;
          }

          window.location.assign(user ? '/account/support' : '/login?redirect=%2Faccount%2Fsupport');
        }}
        data-testid="button-live-chat"
        aria-label="Open WhatsApp"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
      </Button>

      {showBackToTop && (
        <Button
          size="icon"
          variant="outline"
          className="rounded-full shadow-lg w-12 h-12 bg-card"
          onClick={scrollToTop}
          data-testid="button-back-to-top"
          aria-label="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}
