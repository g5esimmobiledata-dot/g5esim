import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

export type ConciergeStatus = {
  enabled: boolean;
  pricingMode: 'free' | 'paid';
  billingCycle: 'one_time' | 'monthly';
  fee: string;
  currency: string;
  trialEnabled: boolean;
  trialDays: number;
  hasAccess: boolean;
  trialAvailable: boolean;
  isTrialActive: boolean;
  status: 'inactive' | 'trial_active' | 'active' | 'pending_payment' | 'past_due' | 'expired';
  paymentMethod?: string | null;
  trialRequestedAt?: string | null;
  trialEndsAt?: string | null;
  activeFrom?: string | null;
  activeUntil?: string | null;
  nextChargeAt?: string | null;
  lastChargedAt?: string | null;
  aiBot?: {
    enabled: boolean;
    name: string;
    welcome: string;
    ready: boolean;
  };
  voice?: {
    enabled: boolean;
    readMode?: 'openai' | 'browser';
    translationEnabled: boolean;
    translationLanguage: string;
    voiceTranslationEnabled: boolean;
  };
};

function unwrapResponse(payload: any): ConciergeStatus {
  return (payload?.data ?? payload) as ConciergeStatus;
}

export function useConcierge(enabled = true) {
  const statusQuery = useQuery<ConciergeStatus>({
    queryKey: ['/api/concierge/status'],
    enabled,
    retry: false,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/concierge/status');
      const data = await response.json();
      return unwrapResponse(data);
    },
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/concierge/status'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
  };

  const startTrialMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/concierge/trial', {});
      const data = await response.json();
      return unwrapResponse(data);
    },
    onSuccess: invalidate,
  });

  const activateMutation = useMutation({
    mutationFn: async (paymentMethod: 'wallet' | 'other') => {
      const response = await apiRequest('POST', '/api/concierge/activate', { paymentMethod });
      const data = await response.json();
      return unwrapResponse(data);
    },
    onSuccess: invalidate,
  });

  return {
    ...statusQuery,
    startTrialMutation,
    activateMutation,
  };
}
