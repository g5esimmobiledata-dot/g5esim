import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  BadgeDollarSign,
  Bot,
  CheckCircle2,
  Clock,
  Headphones,
  Languages,
  Loader2,
  MessageCircle,
  Mic,
  PhoneCall,
  RefreshCw,
  Save,
  Settings,
  Smartphone,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useTranslation } from '@/contexts/TranslationContext';
import TicketManagement from './TicketManagement';

type ConciergeSettings = Record<string, string>;

type ConciergeMember = {
  id: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  userRole?: string | null;
  status: 'inactive' | 'trial_active' | 'active' | 'pending_payment' | 'past_due' | 'expired';
  pricingMode: 'free' | 'paid';
  billingCycle: 'one_time' | 'monthly';
  paymentMethod?: string | null;
  fee: string;
  currency: string;
  walletBalance?: string | null;
  activeFrom?: string | null;
  activeUntil?: string | null;
  trialEndsAt?: string | null;
  nextChargeAt?: string | null;
  lastChargedAt?: string | null;
  updatedAt?: string | null;
};

type ConciergeOverview = {
  settings: ConciergeSettings;
  summary: {
    totalMembers: number;
    activeMembers: number;
    trialMembers: number;
    pendingMembers: number;
    inactiveMembers: number;
    pastDueMembers: number;
    expiredMembers: number;
    grossRevenue: string;
    estimatedCost: string;
    profit: string;
    successfulPayments: number;
  };
  members: ConciergeMember[];
};

type MemberDraft = {
  status: ConciergeMember['status'];
  billingCycle: ConciergeMember['billingCycle'];
  pricingMode: ConciergeMember['pricingMode'];
  paymentMethod: string;
  fee: string;
};

type SipConnectionTest = {
  status: 'online' | 'offline';
  online: boolean;
  message: string;
  checkedAt: string;
};

const defaultFeatures = [
  'ChatGPT-powered Concierge Chat',
  'WhatsApp Support',
  'Unlimited Requests & Advice',
  'Priority Assistance',
  'Travel & eSIM Guidance',
  'Cancel Anytime',
].join('\n');

const chatGptBotName = 'ChatGPT Concierge';
const chatGptWelcome = 'Hi, I am your ChatGPT Concierge assistant. How can I help with your eSIM, travel, package, or activation today?';
const chatGptPrompt =
  'You are ChatGPT inside VIP Concierge. Answer general questions clearly and help users with eSIM activation, package selection, travel connectivity, troubleshooting, and account navigation. Keep replies practical. Escalate billing disputes, refunds, failed payments, security issues, and account changes to the human Concierge Team.';

function unwrap<T>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

function money(value: unknown) {
  return Number(value || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

function parseError(error: Error) {
  return error.message.replace(/^\d+:\s*/, '');
}

function statusClass(status: string) {
  if (status === 'active') return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200';
  if (status === 'trial_active') return 'border-cyan-500/30 bg-cyan-500/15 text-cyan-200';
  if (status === 'pending_payment') return 'border-amber-500/30 bg-amber-500/15 text-amber-200';
  if (status === 'past_due' || status === 'expired') return 'border-red-500/30 bg-red-500/15 text-red-200';
  return 'border-slate-500/30 bg-slate-500/15 text-slate-200';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

export default function AdminConcierge() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const tc = (key: string, fallback: string, params?: Record<string, string | number>) =>
    t(`adminPanel.admin.concierge.${key}`, fallback, params);
  const [settingsDraft, setSettingsDraft] = useState({
    enabled: true,
    pricingMode: 'paid' as 'free' | 'paid',
    billingCycle: 'one_time' as 'one_time' | 'monthly',
    fee: '',
    cost: '',
    trialEnabled: false,
    trialDays: '7',
    features: defaultFeatures,
    hotlineEnabled: true,
    hotlineLabel: '24/7 Hotline',
    hotlineNumber: '',
    hotlineUrl: '',
    whatsappEnabled: true,
    whatsappNumber: '',
    sipEnabled: true,
    sipLabel: 'Free SIP Call',
    sipUri: '',
    sipServer: '',
    sipExtension: '',
    sipUsername: '',
    sipTransport: 'udp',
    sipPassword: '',
    sipPasswordSaved: false,
    sipProvisioningProvider: 'freepbx' as 'freepbx' | 'astpp',
    freePbxEnabled: true,
    freePbxProvisioningMode: 'realtime',
    freePbxDomain: '',
    freePbxTransport: 'transport-tls',
    freePbxContext: 'from-internal',
    freePbxAllowCodecs: 'opus,ulaw,alaw',
    freePbxVoicemailExtension: '*98',
    astppEnabled: false,
    astppApiUrl: '',
    astppApiAuthToken: '',
    astppAdminId: '',
    astppAdminToken: '',
    astppSipDomain: '',
    astppSipProfileId: '1',
    astppResellerId: '0',
    astppSipTransport: 'udp',
    astppSipPort: '5060',
    astppOutboundProxy: '',
    voiceBackend: 'linphone',
    linphoneEnabled: true,
    linphoneSipPort: '5061',
    linphoneOutboundProxy: '',
    aiBotEnabled: true,
    aiBotName: chatGptBotName,
    aiBotWelcome: chatGptWelcome,
    aiBotPrompt: chatGptPrompt,
    voiceEnabled: true,
    voiceReadMode: 'openai' as 'openai' | 'browser',
    translationEnabled: false,
    translationLanguage: 'auto',
    voiceTranslationEnabled: false,
  });
  const [memberDrafts, setMemberDrafts] = useState<Record<string, MemberDraft>>({});

  const overviewQuery = useQuery<ConciergeOverview>({
    queryKey: ['/api/admin/concierge/overview'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/concierge/overview');
      return unwrap<ConciergeOverview>(await response.json());
    },
  });

  useEffect(() => {
    const settings = overviewQuery.data?.settings;
    if (!settings) return;
    setSettingsDraft({
      enabled: settings.concierge_enabled !== 'false',
      pricingMode: settings.concierge_pricing_mode === 'free' ? 'free' : 'paid',
      billingCycle: settings.concierge_billing_cycle === 'monthly' ? 'monthly' : 'one_time',
      fee: settings.concierge_fee || '',
      cost: settings.concierge_cost || '',
      trialEnabled: settings.concierge_trial_enabled === 'true',
      trialDays: settings.concierge_trial_days || '7',
      features: settings.concierge_features || defaultFeatures,
      hotlineEnabled: settings.concierge_hotline_enabled !== 'false',
      hotlineLabel: settings.concierge_hotline_label || '24/7 Hotline',
      hotlineNumber: settings.concierge_hotline_number || '',
      hotlineUrl: settings.concierge_hotline_url || '',
      whatsappEnabled: settings.support_whatsapp_enabled !== 'false',
      whatsappNumber: settings.support_whatsapp_number || '',
      sipEnabled: settings.concierge_sip_enabled !== 'false',
      sipLabel: settings.concierge_sip_label || 'Free SIP Call',
      sipUri: settings.concierge_sip_uri || '',
      sipServer: settings.concierge_sip_server || '',
      sipExtension: settings.concierge_sip_extension || '',
      sipUsername: settings.concierge_sip_username || '',
      sipTransport: settings.concierge_sip_transport || 'udp',
      sipPassword: '',
      sipPasswordSaved: settings.concierge_sip_password_saved === 'true',
      sipProvisioningProvider: settings.sip_provisioning_provider === 'astpp' ? 'astpp' : 'freepbx',
      freePbxEnabled: settings.freepbx_enabled !== 'false',
      freePbxProvisioningMode: settings.freepbx_provisioning_mode || 'realtime',
      freePbxDomain: settings.freepbx_sip_domain || settings.linphone_sip_domain || settings.concierge_sip_server || '',
      freePbxTransport: settings.freepbx_sip_transport || 'transport-tls',
      freePbxContext: settings.freepbx_context || 'from-internal',
      freePbxAllowCodecs: settings.freepbx_allow_codecs || 'opus,ulaw,alaw',
      freePbxVoicemailExtension: settings.freepbx_voicemail_extension || settings.linphone_voicemail_extension || '*98',
      astppEnabled: settings.astpp_enabled === 'true' || settings.sip_provisioning_provider === 'astpp',
      astppApiUrl: settings.astpp_api_url || '',
      astppApiAuthToken: settings.astpp_api_auth_token || '',
      astppAdminId: settings.astpp_admin_id || '',
      astppAdminToken: settings.astpp_admin_token || '',
      astppSipDomain: settings.astpp_sip_domain || '',
      astppSipProfileId: settings.astpp_sip_profile_id || '1',
      astppResellerId: settings.astpp_reseller_id || '0',
      astppSipTransport: settings.astpp_sip_transport || 'udp',
      astppSipPort: settings.astpp_sip_port || '5060',
      astppOutboundProxy: settings.astpp_outbound_proxy || '',
      voiceBackend: settings.voice_backend || 'linphone',
      linphoneEnabled: settings.linphone_enabled !== 'false',
      linphoneSipPort: settings.linphone_sip_port || '5061',
      linphoneOutboundProxy: settings.linphone_sip_outbound_proxy || '',
      aiBotEnabled: settings.concierge_ai_bot_enabled !== 'false',
      aiBotName: settings.concierge_ai_bot_name || chatGptBotName,
      aiBotWelcome: settings.concierge_ai_bot_welcome || chatGptWelcome,
      aiBotPrompt: settings.concierge_ai_bot_prompt || chatGptPrompt,
      voiceEnabled: settings.concierge_voice_enabled !== 'false',
      voiceReadMode: settings.concierge_voice_read_mode === 'browser' ? 'browser' : 'openai',
      translationEnabled: settings.concierge_translation_enabled === 'true',
      translationLanguage: settings.concierge_translation_language || 'auto',
      voiceTranslationEnabled: settings.concierge_voice_translation_enabled === 'true',
    });
  }, [overviewQuery.data?.settings]);

  useEffect(() => {
    const members = overviewQuery.data?.members || [];
    const next: Record<string, MemberDraft> = {};
    members.forEach((member) => {
      next[member.id] = {
        status: member.status,
        billingCycle: member.billingCycle,
        pricingMode: member.pricingMode,
        paymentMethod: member.paymentMethod || '',
        fee: member.fee || '0.00',
      };
    });
    setMemberDrafts(next);
  }, [overviewQuery.data?.members]);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const settings = [
        ['concierge_enabled', String(settingsDraft.enabled)],
        ['concierge_pricing_mode', settingsDraft.pricingMode],
        ['concierge_billing_cycle', settingsDraft.billingCycle],
        ['concierge_fee', settingsDraft.fee],
        ['concierge_cost', settingsDraft.cost],
        ['concierge_trial_enabled', String(settingsDraft.trialEnabled)],
        ['concierge_trial_days', settingsDraft.trialDays],
        ['concierge_features', settingsDraft.features],
        ['concierge_hotline_enabled', String(settingsDraft.hotlineEnabled)],
        ['concierge_hotline_label', settingsDraft.hotlineLabel],
        ['concierge_hotline_number', settingsDraft.hotlineNumber],
        ['concierge_hotline_url', settingsDraft.hotlineUrl],
        ['support_whatsapp_enabled', String(settingsDraft.whatsappEnabled)],
        ['support_whatsapp_number', settingsDraft.whatsappNumber],
        ['concierge_sip_enabled', String(settingsDraft.sipEnabled)],
        ['concierge_sip_label', settingsDraft.sipLabel],
        ['concierge_sip_uri', settingsDraft.sipUri],
        ['concierge_sip_server', settingsDraft.sipServer],
        ['concierge_sip_extension', settingsDraft.sipExtension],
        ['concierge_sip_username', settingsDraft.sipUsername],
        ['concierge_sip_transport', settingsDraft.sipTransport],
        ['sip_provisioning_provider', settingsDraft.sipProvisioningProvider],
        ['freepbx_enabled', String(settingsDraft.freePbxEnabled)],
        ['freepbx_provisioning_mode', settingsDraft.freePbxProvisioningMode],
        ['freepbx_sip_domain', settingsDraft.freePbxDomain],
        ['freepbx_sip_transport', settingsDraft.freePbxTransport],
        ['freepbx_context', settingsDraft.freePbxContext],
        ['freepbx_allow_codecs', settingsDraft.freePbxAllowCodecs],
        ['freepbx_voicemail_extension', settingsDraft.freePbxVoicemailExtension],
        ['astpp_enabled', String(settingsDraft.astppEnabled || settingsDraft.sipProvisioningProvider === 'astpp')],
        ['astpp_api_url', settingsDraft.astppApiUrl],
        ['astpp_api_auth_token', settingsDraft.astppApiAuthToken],
        ['astpp_admin_id', settingsDraft.astppAdminId],
        ['astpp_admin_token', settingsDraft.astppAdminToken],
        ['astpp_sip_domain', settingsDraft.astppSipDomain],
        ['astpp_sip_profile_id', settingsDraft.astppSipProfileId],
        ['astpp_reseller_id', settingsDraft.astppResellerId],
        ['astpp_sip_transport', settingsDraft.astppSipTransport],
        ['astpp_sip_port', settingsDraft.astppSipPort],
        ['astpp_outbound_proxy', settingsDraft.astppOutboundProxy],
        ['voice_backend', settingsDraft.voiceBackend],
        ['linphone_enabled', String(settingsDraft.linphoneEnabled)],
        ['linphone_sip_domain', settingsDraft.sipProvisioningProvider === 'astpp' ? settingsDraft.astppSipDomain : settingsDraft.freePbxDomain],
        ['linphone_sip_port', settingsDraft.sipProvisioningProvider === 'astpp' ? settingsDraft.astppSipPort : settingsDraft.linphoneSipPort],
        ['linphone_sip_transport', settingsDraft.sipProvisioningProvider === 'astpp' ? settingsDraft.astppSipTransport : settingsDraft.freePbxTransport.includes('tls') ? 'tls' : settingsDraft.sipTransport],
        ['linphone_sip_outbound_proxy', settingsDraft.sipProvisioningProvider === 'astpp' ? settingsDraft.astppOutboundProxy : settingsDraft.linphoneOutboundProxy],
        ['linphone_voicemail_extension', settingsDraft.freePbxVoicemailExtension],
        ['user_sip_domain', settingsDraft.sipProvisioningProvider === 'astpp' ? settingsDraft.astppSipDomain : settingsDraft.freePbxDomain],
        ['user_sip_transport', settingsDraft.sipProvisioningProvider === 'astpp' ? settingsDraft.astppSipTransport : settingsDraft.freePbxTransport.includes('tls') ? 'tls' : settingsDraft.sipTransport],
        ['concierge_ai_bot_enabled', String(settingsDraft.aiBotEnabled)],
        ['concierge_ai_bot_name', settingsDraft.aiBotName],
        ['concierge_ai_bot_welcome', settingsDraft.aiBotWelcome],
        ['concierge_ai_bot_prompt', settingsDraft.aiBotPrompt],
        ['concierge_voice_enabled', String(settingsDraft.voiceEnabled)],
        ['concierge_voice_read_mode', settingsDraft.voiceReadMode],
        ['concierge_translation_enabled', String(settingsDraft.translationEnabled)],
        ['concierge_translation_language', settingsDraft.translationLanguage],
        ['concierge_voice_translation_enabled', String(settingsDraft.voiceTranslationEnabled)],
      ];
      if (settingsDraft.sipPassword.trim()) {
        settings.push(['concierge_sip_password', settingsDraft.sipPassword.trim()]);
      }

      await Promise.all(
        settings.map(([key, value]) =>
          apiRequest('PUT', `/api/admin/settings/${key}`, { value, category: 'concierge' }),
        ),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/concierge/overview'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({
        title: tc('toast.saved', 'Concierge saved'),
        description: tc('toast.savedDescription', 'Concierge product and hotline settings were updated.'),
      });
    },
    onError: (error: Error) => {
      toast({ title: tc('toast.saveFailed', 'Save failed'), description: parseError(error), variant: 'destructive' });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, draft }: { id: string; draft: MemberDraft }) => {
      const response = await apiRequest('PUT', `/api/admin/concierge/subscriptions/${id}`, draft);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/concierge/overview'] });
      toast({
        title: tc('toast.memberUpdated', 'Member updated'),
        description: tc('toast.memberUpdatedDescription', 'Concierge membership was updated successfully.'),
      });
    },
    onError: (error: Error) => {
      toast({ title: tc('toast.updateFailed', 'Update failed'), description: parseError(error), variant: 'destructive' });
    },
  });

  const testSipConnectionMutation = useMutation({
    mutationFn: async () => {
      const server = settingsDraft.sipServer.trim();
      const extension = settingsDraft.sipExtension.trim();
      const response = await apiRequest('POST', '/api/admin/concierge/sip/test', {
        server,
        username: settingsDraft.sipUsername,
        extension,
        uri: settingsDraft.sipUri.trim() || (extension && server ? `sip:${extension}@${server}` : ''),
        transport: settingsDraft.sipTransport,
      });
      return unwrap<SipConnectionTest>(await response.json());
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/concierge/overview'] });
      toast({
        title: result.online ? tc('toast.sipOnline', 'SIP is online') : tc('toast.sipOffline', 'SIP is offline'),
        description: result.message,
        variant: result.online ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({ title: tc('toast.connectionTestFailed', 'Connection test failed'), description: parseError(error), variant: 'destructive' });
    },
  });

  const testFreePbxMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/freepbx/test', {});
      return unwrap<SipConnectionTest>(await response.json());
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/concierge/overview'] });
      toast({
        title: result.online ? tc('toast.freePbxReady', 'FreePBX is ready') : tc('toast.freePbxNotReady', 'FreePBX is not ready'),
        description: result.message,
        variant: result.online ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({ title: tc('toast.freePbxTestFailed', 'FreePBX test failed'), description: parseError(error), variant: 'destructive' });
    },
  });

  const testAstppMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/astpp/test', {});
      return unwrap<SipConnectionTest>(await response.json());
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/concierge/overview'] });
      toast({
        title: result.online ? tc('toast.astppReady', 'ASTPP is ready') : tc('toast.astppNotReady', 'ASTPP is not ready'),
        description: result.message,
        variant: result.online ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({ title: tc('toast.astppTestFailed', 'ASTPP test failed'), description: parseError(error), variant: 'destructive' });
    },
  });

  const summary = overviewQuery.data?.summary;
  const members = overviewQuery.data?.members || [];
  const conciergeSettings = overviewQuery.data?.settings || {};
  const features = useMemo(
    () => settingsDraft.features.split('\n').map((item) => item.trim()).filter(Boolean),
    [settingsDraft.features],
  );
  const generatedSipUri = useMemo(() => {
    const extension = settingsDraft.sipExtension.trim();
    const server = settingsDraft.sipServer.trim();
    if (!extension || !server) return '';
    return `sip:${extension}@${server}`;
  }, [settingsDraft.sipExtension, settingsDraft.sipServer]);
  const activeSipUri = settingsDraft.sipUri.trim() || generatedSipUri;
  const hotlineHref = settingsDraft.hotlineUrl || (settingsDraft.hotlineNumber ? `tel:${settingsDraft.hotlineNumber.replace(/[^\d+]/g, '')}` : '');
  const sipStatus = testSipConnectionMutation.data?.status || conciergeSettings.concierge_sip_status || 'unknown';
  const sipStatusMessage = testSipConnectionMutation.data?.message || conciergeSettings.concierge_sip_status_message || 'Connection has not been tested yet.';
  const sipLastChecked = testSipConnectionMutation.data?.checkedAt || conciergeSettings.concierge_sip_last_checked_at || '';
  const sipStatusLabel = sipStatus === 'online' ? tc('status.online', 'Online') : sipStatus === 'offline' ? tc('status.offline', 'Offline') : tc('status.notTested', 'Not tested');
  const sipStatusClasses =
    sipStatus === 'online'
      ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-100'
      : sipStatus === 'offline'
        ? 'border-red-400/30 bg-red-400/15 text-red-100'
        : 'border-slate-500/30 bg-slate-500/15 text-slate-200';
  const freePbxStatus = testFreePbxMutation.data?.status || conciergeSettings.freepbx_status || 'unknown';
  const freePbxMessage = testFreePbxMutation.data?.message || conciergeSettings.freepbx_status_message || 'FreePBX realtime provisioning has not been tested yet.';
  const freePbxLastChecked = testFreePbxMutation.data?.checkedAt || conciergeSettings.freepbx_last_checked_at || '';
  const freePbxStatusLabel = freePbxStatus === 'online' ? tc('status.ready', 'Ready') : freePbxStatus === 'offline' ? tc('status.offline', 'Offline') : tc('status.notTested', 'Not tested');
  const freePbxStatusClasses =
    freePbxStatus === 'online'
      ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-100'
      : freePbxStatus === 'offline'
        ? 'border-red-400/30 bg-red-400/15 text-red-100'
        : 'border-slate-500/30 bg-slate-500/15 text-slate-200';
  const astppStatus = testAstppMutation.data?.status || conciergeSettings.astpp_status || 'unknown';
  const astppMessage = testAstppMutation.data?.message || conciergeSettings.astpp_status_message || 'ASTPP API has not been tested yet.';
  const astppLastChecked = testAstppMutation.data?.checkedAt || conciergeSettings.astpp_last_checked_at || '';
  const astppStatusLabel = astppStatus === 'online' ? tc('status.ready', 'Ready') : astppStatus === 'offline' ? tc('status.offline', 'Offline') : tc('status.notTested', 'Not tested');
  const astppStatusClasses =
    astppStatus === 'online'
      ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-100'
      : astppStatus === 'offline'
        ? 'border-red-400/30 bg-red-400/15 text-red-100'
        : 'border-slate-500/30 bg-slate-500/15 text-slate-200';

  const setMemberDraft = (id: string, patch: Partial<MemberDraft>) => {
    setMemberDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  };

  const featureLabel = (feature: string) => {
    switch (feature) {
      case 'ChatGPT-powered Concierge Chat':
        return tc('features.chatgpt', 'ChatGPT-powered Concierge Chat');
      case 'WhatsApp Support':
        return tc('features.whatsapp', 'WhatsApp Support');
      case 'Unlimited Requests & Advice':
        return tc('features.unlimited', 'Unlimited Requests & Advice');
      case 'Priority Assistance':
        return tc('features.priority', 'Priority Assistance');
      case 'Travel & eSIM Guidance':
        return tc('features.travel', 'Travel & eSIM Guidance');
      case 'Cancel Anytime':
        return tc('features.cancelAnytime', 'Cancel Anytime');
      default:
        return feature;
    }
  };

  const memberStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return tc('memberStatus.active', 'Active');
      case 'trial_active':
        return tc('memberStatus.trialActive', 'Trial Active');
      case 'pending_payment':
        return tc('memberStatus.pendingPayment', 'Pending Payment');
      case 'past_due':
        return tc('memberStatus.pastDue', 'Past Due');
      case 'expired':
        return tc('memberStatus.expired', 'Expired');
      case 'inactive':
        return tc('memberStatus.inactive', 'Inactive');
      default:
        return status.replace('_', ' ');
    }
  };

  const billingCycleLabel = (cycle: string) =>
    cycle === 'monthly' ? tc('billing.monthly', 'Monthly') : tc('billing.oneTime', 'One time');

  const priceLabel =
    settingsDraft.pricingMode === 'free'
      ? tc('pricing.free', 'Free')
      : `${money(settingsDraft.fee)} ${settingsDraft.billingCycle === 'monthly' ? tc('pricing.monthlySuffix', 'monthly') : tc('pricing.oneTimeSuffix', 'one time')}`;

  const hotlineLabel =
    settingsDraft.hotlineLabel === '24/7 Hotline'
      ? tc('defaults.hotline', '24/7 Hotline')
      : settingsDraft.hotlineLabel;

  return (
    <div className="min-h-screen bg-[#071226] p-6 text-slate-100">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">{tc('title', 'Concierge Management')}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {tc('description', 'Manage paid Concierge members, hotline support, AI bot behavior, and Concierge profit.')}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => saveSettingsMutation.mutate()}
          disabled={saveSettingsMutation.isPending}
          className="gap-2 bg-teal-400 text-slate-950 hover:bg-teal-300"
        >
          {saveSettingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {tc('actions.saveConcierge', 'Save Concierge')}
        </Button>
      </div>

      {overviewQuery.isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/50 p-6 text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tc('loading', 'Loading Concierge dashboard...')}
        </div>
      ) : (
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="border border-slate-700 bg-slate-950/70">
            <TabsTrigger value="dashboard">{tc('tabs.dashboard', 'Dashboard')}</TabsTrigger>
            <TabsTrigger value="settings">{tc('tabs.pricingFeatures', 'Pricing & Features')}</TabsTrigger>
            <TabsTrigger value="members">{tc('tabs.members', 'Members')}</TabsTrigger>
            <TabsTrigger value="inbox">{tc('tabs.inbox', 'Chat & Voice Inbox')}</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-slate-700 bg-slate-950/70 text-slate-100">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-teal-300">{tc('stats.activeMembers', 'Active Members')}</p>
                      <p className="mt-2 text-3xl font-semibold">{summary?.activeMembers || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-teal-300" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-700 bg-slate-950/70 text-slate-100">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-emerald-300">{tc('stats.revenue', 'Revenue')}</p>
                      <p className="mt-2 text-3xl font-semibold">{money(summary?.grossRevenue)}</p>
                    </div>
                    <BadgeDollarSign className="h-8 w-8 text-emerald-300" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-700 bg-slate-950/70 text-slate-100">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-amber-300">{tc('stats.estimatedCost', 'Estimated Cost')}</p>
                      <p className="mt-2 text-3xl font-semibold">{money(summary?.estimatedCost)}</p>
                    </div>
                    <Settings className="h-8 w-8 text-amber-300" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-700 bg-slate-950/70 text-slate-100">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-lime-300">{tc('stats.profit', 'Profit')}</p>
                      <p className="mt-2 text-3xl font-semibold">{money(summary?.profit)}</p>
                    </div>
                    <Sparkles className="h-8 w-8 text-lime-300" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border-slate-700 bg-slate-950/70 text-slate-100 lg:col-span-2">
                <CardHeader>
                  <CardTitle>{tc('product.title', 'Concierge Product')}</CardTitle>
                  <CardDescription className="text-slate-400">{tc('product.description', 'What users see before they subscribe.')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-3xl border border-amber-200/20 bg-[#fff7e7] p-6 text-slate-950">
                    <p className="text-2xl font-semibold">{tc('product.vip', 'VIP Concierge')}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {priceLabel}
                    </p>
                    <div className="mt-5 space-y-3">
                      {features.map((feature) => (
                        <div key={feature} className="flex items-center gap-3 text-slate-700">
                          <CheckCircle2 className="h-5 w-5 text-teal-500" />
                          <span>{featureLabel(feature)}</span>
                        </div>
                      ))}
                    </div>
                    {settingsDraft.hotlineEnabled && (
                      <Button
                        type="button"
                        className="mt-6 gap-2 rounded-full bg-slate-950 text-white hover:bg-slate-800"
                        onClick={() => hotlineHref && window.open(hotlineHref, '_blank')}
                      >
                        <PhoneCall className="h-4 w-4" />
                        {hotlineLabel || tc('defaults.hotline', '24/7 Hotline')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-700 bg-slate-950/70 text-slate-100">
                <CardHeader>
                  <CardTitle>{tc('memberStatus.title', 'Member Status')}</CardTitle>
                  <CardDescription className="text-slate-400">{tc('memberStatus.description', 'Live membership states.')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg bg-slate-900/70 p-3">
                    <span className="text-slate-300">{tc('memberStatus.trial', 'Trial')}</span>
                    <Badge className="border-cyan-500/30 bg-cyan-500/15 text-cyan-200">{summary?.trialMembers || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-900/70 p-3">
                    <span className="text-slate-300">{tc('memberStatus.pendingPayment', 'Pending Payment')}</span>
                    <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-200">{summary?.pendingMembers || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-900/70 p-3">
                    <span className="text-slate-300">{tc('memberStatus.pastDue', 'Past Due')}</span>
                    <Badge className="border-red-500/30 bg-red-500/15 text-red-200">{summary?.pastDueMembers || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-900/70 p-3">
                    <span className="text-slate-300">{tc('memberStatus.successfulPayments', 'Successful Payments')}</span>
                    <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-200">{summary?.successfulPayments || 0}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="border-slate-700 bg-slate-950/70 text-slate-100">
                <CardHeader>
                  <CardTitle>{tc('settings.title', 'Pricing & Features')}</CardTitle>
                  <CardDescription className="text-slate-400">{tc('settings.description', 'Edit the Concierge feature and subscription offer.')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
                    <div>
                      <Label className="text-slate-100">{tc('settings.enableConcierge', 'Enable Concierge')}</Label>
                      <p className="text-sm text-slate-400">{tc('settings.enableConciergeDescription', 'Show Concierge to eligible users.')}</p>
                    </div>
                    <Switch checked={settingsDraft.enabled} onCheckedChange={(enabled) => setSettingsDraft((s) => ({ ...s, enabled }))} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>{tc('settings.pricingMode', 'Pricing Mode')}</Label>
                      <Select value={settingsDraft.pricingMode} onValueChange={(pricingMode: 'free' | 'paid') => setSettingsDraft((s) => ({ ...s, pricingMode }))}>
                        <SelectTrigger className="mt-2 border-slate-700 bg-slate-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">{tc('pricing.free', 'Free')}</SelectItem>
                          <SelectItem value="paid">{tc('pricing.paid', 'Paid')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{tc('settings.billingCycle', 'Billing Cycle')}</Label>
                      <Select value={settingsDraft.billingCycle} onValueChange={(billingCycle: 'one_time' | 'monthly') => setSettingsDraft((s) => ({ ...s, billingCycle }))}>
                        <SelectTrigger className="mt-2 border-slate-700 bg-slate-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one_time">{tc('billing.oneTime', 'One time')}</SelectItem>
                          <SelectItem value="monthly">{tc('billing.monthly', 'Monthly')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>{tc('settings.customerFee', 'Customer Fee')}</Label>
                      <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.fee} onChange={(e) => setSettingsDraft((s) => ({ ...s, fee: e.target.value }))} placeholder="29.00" />
                    </div>
                    <div>
                      <Label>{tc('settings.yourCost', 'Your Cost')}</Label>
                      <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.cost} onChange={(e) => setSettingsDraft((s) => ({ ...s, cost: e.target.value }))} placeholder="5.00" />
                    </div>
                    <div>
                      <Label>{tc('settings.trialDays', 'Trial Days')}</Label>
                      <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.trialDays} onChange={(e) => setSettingsDraft((s) => ({ ...s, trialDays: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
                    <div>
                      <Label className="text-slate-100">{tc('settings.freeTrial', 'Free Trial')}</Label>
                      <p className="text-sm text-slate-400">{tc('settings.freeTrialDescription', 'Let users try Concierge before paying.')}</p>
                    </div>
                    <Switch checked={settingsDraft.trialEnabled} onCheckedChange={(trialEnabled) => setSettingsDraft((s) => ({ ...s, trialEnabled }))} />
                  </div>
                  <div>
                    <Label>{tc('settings.featureList', 'Feature List')}</Label>
                    <Textarea className="mt-2 min-h-36 border-slate-700 bg-slate-900" value={settingsDraft.features} onChange={(e) => setSettingsDraft((s) => ({ ...s, features: e.target.value }))} />
                  </div>
                  <div className="space-y-4 rounded-lg border border-slate-700 p-4">
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
                        <MessageCircle className="h-5 w-5 text-emerald-300" />
                        {tc('settings.whatsappSupport', 'WhatsApp Support')}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">{tc('settings.whatsappSupportDescription', 'Show a WhatsApp chat option for Concierge members.')}</p>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
                      <div>
                        <Label>{tc('settings.enableWhatsappSupport', 'Enable WhatsApp Support')}</Label>
                        <p className="mt-1 text-xs text-slate-400">{tc('settings.enableWhatsappDescription', 'Users will open WhatsApp directly with this number.')}</p>
                      </div>
                      <Switch checked={settingsDraft.whatsappEnabled} onCheckedChange={(whatsappEnabled) => setSettingsDraft((s) => ({ ...s, whatsappEnabled }))} />
                    </div>
                    <div>
                      <Label>{tc('settings.whatsappNumber', 'WhatsApp Number')}</Label>
                      <Input
                        className="mt-2 border-slate-700 bg-slate-900"
                        value={settingsDraft.whatsappNumber}
                        onChange={(e) => setSettingsDraft((s) => ({ ...s, whatsappNumber: e.target.value }))}
                        placeholder="+971501234567"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Card className="h-full border-slate-700 bg-slate-950/70 text-slate-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PhoneCall className="h-5 w-5 text-teal-300" /> {tc('hotline.title', '24 Hour Hotline')}</CardTitle>
                    <CardDescription className="text-slate-400">{tc('hotline.description', 'Add a clickable hotline for Concierge members.')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
                      <Label>{tc('hotline.enable', 'Enable Hotline')}</Label>
                      <Switch checked={settingsDraft.hotlineEnabled} onCheckedChange={(hotlineEnabled) => setSettingsDraft((s) => ({ ...s, hotlineEnabled }))} />
                    </div>
                    <div className="grid gap-4">
                      <div>
                        <Label>{tc('hotline.buttonLabel', 'Button Label')}</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.hotlineLabel} onChange={(e) => setSettingsDraft((s) => ({ ...s, hotlineLabel: e.target.value }))} />
                      </div>
                      <div>
                        <Label>{tc('hotline.phoneNumber', 'Phone Number')}</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.hotlineNumber} onChange={(e) => setSettingsDraft((s) => ({ ...s, hotlineNumber: e.target.value }))} placeholder="+961..." />
                      </div>
                    </div>
                    <div>
                      <Label>{tc('hotline.directLink', 'Direct Link')}</Label>
                      <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.hotlineUrl} onChange={(e) => setSettingsDraft((s) => ({ ...s, hotlineUrl: e.target.value }))} placeholder="tel:+961... or https://wa.me/..." />
                    </div>
                  </CardContent>
                </Card>

                {false && (
                <>
                <Card className="border-slate-700 bg-slate-950/70 text-slate-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-cyan-300" /> SIP Provisioning Provider</CardTitle>
                    <CardDescription className="text-slate-400">Choose which PBX platform creates customer SIP accounts automatically.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Provider</Label>
                      <Select
                        value={settingsDraft.sipProvisioningProvider}
                        onValueChange={(sipProvisioningProvider: 'freepbx' | 'astpp') =>
                          setSettingsDraft((s) => ({
                            ...s,
                            sipProvisioningProvider,
                            astppEnabled: sipProvisioningProvider === 'astpp' ? true : s.astppEnabled,
                          }))
                        }
                      >
                        <SelectTrigger className="mt-2 border-slate-700 bg-slate-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="freepbx">FreePBX / Asterisk Realtime</SelectItem>
                          <SelectItem value="astpp">ASTPP Community</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Active SIP Domain</Label>
                      <Input
                        readOnly
                        className="mt-2 border-slate-700 bg-slate-900 text-slate-300"
                        value={settingsDraft.sipProvisioningProvider === 'astpp' ? settingsDraft.astppSipDomain : settingsDraft.freePbxDomain}
                        placeholder="sip.yourdomain.com"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-950/70 text-slate-100">
                  <CardHeader>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-cyan-300" /> ASTPP Community</CardTitle>
                        <CardDescription className="text-slate-400">Provision ASTPP customers and FreeSWITCH SIP devices through the Community API add-on.</CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Badge className={`w-fit gap-1.5 border px-3 py-1 ${astppStatusClasses}`}>
                          {astppStatus === 'online' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                          {astppStatusLabel}
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          className="gap-2 bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                          onClick={() => testAstppMutation.mutate()}
                          disabled={testAstppMutation.isPending || !settingsDraft.astppEnabled}
                        >
                          {testAstppMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          Test ASTPP
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
                      <div>
                        <Label>Enable ASTPP Provisioning</Label>
                        <p className="mt-1 text-xs text-slate-400">New customer SIP accounts will be created as ASTPP SIP devices.</p>
                      </div>
                      <Switch checked={settingsDraft.astppEnabled} onCheckedChange={(astppEnabled) => setSettingsDraft((s) => ({ ...s, astppEnabled }))} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>ASTPP API URL</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.astppApiUrl} onChange={(e) => setSettingsDraft((s) => ({ ...s, astppApiUrl: e.target.value }))} placeholder="https://sip.yourdomain.com" />
                      </div>
                      <div>
                        <Label>SIP Domain</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.astppSipDomain} onChange={(e) => setSettingsDraft((s) => ({ ...s, astppSipDomain: e.target.value }))} placeholder="sip.yourdomain.com" />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label>X-Auth-Token</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.astppApiAuthToken} onChange={(e) => setSettingsDraft((s) => ({ ...s, astppApiAuthToken: e.target.value }))} placeholder="ASTPP API token" />
                      </div>
                      <div>
                        <Label>Admin Account ID</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.astppAdminId} onChange={(e) => setSettingsDraft((s) => ({ ...s, astppAdminId: e.target.value }))} placeholder="1" />
                      </div>
                      <div>
                        <Label>Admin Account Token</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.astppAdminToken} onChange={(e) => setSettingsDraft((s) => ({ ...s, astppAdminToken: e.target.value }))} placeholder="Encrypted account token" />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div>
                        <Label>SIP Profile ID</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.astppSipProfileId} onChange={(e) => setSettingsDraft((s) => ({ ...s, astppSipProfileId: e.target.value }))} placeholder="1" />
                      </div>
                      <div>
                        <Label>Reseller ID</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.astppResellerId} onChange={(e) => setSettingsDraft((s) => ({ ...s, astppResellerId: e.target.value }))} placeholder="0" />
                      </div>
                      <div>
                        <Label>SIP Transport</Label>
                        <Select value={settingsDraft.astppSipTransport} onValueChange={(astppSipTransport) => setSettingsDraft((s) => ({ ...s, astppSipTransport }))}>
                          <SelectTrigger className="mt-2 border-slate-700 bg-slate-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="udp">UDP</SelectItem>
                            <SelectItem value="tcp">TCP</SelectItem>
                            <SelectItem value="tls">TLS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>SIP Port</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.astppSipPort} onChange={(e) => setSettingsDraft((s) => ({ ...s, astppSipPort: e.target.value }))} placeholder="5060" />
                      </div>
                    </div>
                    <div>
                      <Label>Outbound Proxy</Label>
                      <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.astppOutboundProxy} onChange={(e) => setSettingsDraft((s) => ({ ...s, astppOutboundProxy: e.target.value }))} placeholder="sip:sip.yourdomain.com;transport=udp" />
                    </div>
                    <div className={`rounded-lg border p-3 text-sm ${astppStatusClasses}`}>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium">Status: {astppStatusLabel}</p>
                        {astppLastChecked && <p className="text-xs opacity-75">Last checked: {new Date(astppLastChecked).toLocaleString()}</p>}
                      </div>
                      <p className="mt-1 text-xs opacity-80">{astppMessage}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-950/70 text-slate-100">
                  <CardHeader>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-emerald-300" /> FreePBX / Asterisk</CardTitle>
                        <CardDescription className="text-slate-400">Provision real Linphone SIP accounts using Asterisk PJSIP realtime tables.</CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Badge className={`w-fit gap-1.5 border px-3 py-1 ${freePbxStatusClasses}`}>
                          {freePbxStatus === 'online' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                          {freePbxStatusLabel}
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          className="gap-2 bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                          onClick={() => testFreePbxMutation.mutate()}
                          disabled={testFreePbxMutation.isPending || !settingsDraft.freePbxEnabled}
                        >
                          {testFreePbxMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          Test FreePBX
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
                      <div>
                        <Label>Enable Real SIP Provisioning</Label>
                        <p className="mt-1 text-xs text-slate-400">New customer SIP accounts will be created as real Asterisk endpoints.</p>
                      </div>
                      <Switch checked={settingsDraft.freePbxEnabled} onCheckedChange={(freePbxEnabled) => setSettingsDraft((s) => ({ ...s, freePbxEnabled }))} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>SIP Domain</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.freePbxDomain} onChange={(e) => setSettingsDraft((s) => ({ ...s, freePbxDomain: e.target.value, sipServer: e.target.value }))} placeholder="sip.yourdomain.com" />
                      </div>
                      <div>
                        <Label>Provisioning Mode</Label>
                        <Select value={settingsDraft.freePbxProvisioningMode} onValueChange={(freePbxProvisioningMode) => setSettingsDraft((s) => ({ ...s, freePbxProvisioningMode }))}>
                          <SelectTrigger className="mt-2 border-slate-700 bg-slate-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realtime">Asterisk Realtime</SelectItem>
                            <SelectItem value="manual">Manual PBX</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label>PJSIP Transport Name</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.freePbxTransport} onChange={(e) => setSettingsDraft((s) => ({ ...s, freePbxTransport: e.target.value }))} placeholder="transport-tls" />
                      </div>
                      <div>
                        <Label>Dial Context</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.freePbxContext} onChange={(e) => setSettingsDraft((s) => ({ ...s, freePbxContext: e.target.value }))} placeholder="from-internal" />
                      </div>
                      <div>
                        <Label>Linphone SIP Port</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.linphoneSipPort} onChange={(e) => setSettingsDraft((s) => ({ ...s, linphoneSipPort: e.target.value }))} placeholder="5061" />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>Allowed Codecs</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.freePbxAllowCodecs} onChange={(e) => setSettingsDraft((s) => ({ ...s, freePbxAllowCodecs: e.target.value }))} placeholder="opus,ulaw,alaw" />
                      </div>
                      <div>
                        <Label>Voicemail Extension</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.freePbxVoicemailExtension} onChange={(e) => setSettingsDraft((s) => ({ ...s, freePbxVoicemailExtension: e.target.value }))} placeholder="*98" />
                      </div>
                    </div>
                    <div>
                      <Label>Outbound Proxy</Label>
                      <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.linphoneOutboundProxy} onChange={(e) => setSettingsDraft((s) => ({ ...s, linphoneOutboundProxy: e.target.value }))} placeholder="sip:sip.yourdomain.com;transport=tls" />
                    </div>
                    <div className={`rounded-lg border p-3 text-sm ${freePbxStatusClasses}`}>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium">Status: {freePbxStatusLabel}</p>
                        {freePbxLastChecked && <p className="text-xs opacity-75">Last checked: {new Date(freePbxLastChecked).toLocaleString()}</p>}
                      </div>
                      <p className="mt-1 text-xs opacity-80">{freePbxMessage}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-950/70 text-slate-100">
                  <CardHeader>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-sky-300" /> Shared Call Center SIP Account</CardTitle>
                        <CardDescription className="text-slate-400">Store one support SIP registration and automatically use it for every active VIP Concierge call.</CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Badge className={`w-fit gap-1.5 border px-3 py-1 ${sipStatusClasses}`}>
                          {sipStatus === 'online' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                          {sipStatusLabel}
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2 border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800 hover:text-white"
                          onClick={() => saveSettingsMutation.mutate()}
                          disabled={saveSettingsMutation.isPending}
                        >
                          {saveSettingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save SIP
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="gap-2 bg-sky-400 text-slate-950 hover:bg-sky-300"
                          onClick={() => testSipConnectionMutation.mutate()}
                          disabled={testSipConnectionMutation.isPending || !settingsDraft.sipServer.trim()}
                        >
                          {testSipConnectionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          Test Connection
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
                        <Label>Enable Call Center SIP Call</Label>
                      <Switch checked={settingsDraft.sipEnabled} onCheckedChange={(sipEnabled) => setSettingsDraft((s) => ({ ...s, sipEnabled }))} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>Button Label</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.sipLabel} onChange={(e) => setSettingsDraft((s) => ({ ...s, sipLabel: e.target.value }))} placeholder="Free SIP Call" />
                      </div>
                      <div>
                        <Label>Customer Call Address</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.sipUri} onChange={(e) => setSettingsDraft((s) => ({ ...s, sipUri: e.target.value }))} placeholder="support@pbx.example.com or 1001@pbx.example.com" />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>SIP Server / Domain</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.sipServer} onChange={(e) => setSettingsDraft((s) => ({ ...s, sipServer: e.target.value }))} placeholder="pbx.example.com" />
                      </div>
                      <div>
                        <Label>Support Extension</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.sipExtension} onChange={(e) => setSettingsDraft((s) => ({ ...s, sipExtension: e.target.value }))} placeholder="1001" />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label>Registration Username</Label>
                        <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.sipUsername} onChange={(e) => setSettingsDraft((s) => ({ ...s, sipUsername: e.target.value }))} placeholder="1001" />
                      </div>
                      <div>
                        <Label>Registration Password</Label>
                        <Input
                          type="password"
                          className="mt-2 border-slate-700 bg-slate-900"
                          value={settingsDraft.sipPassword}
                          onChange={(e) => setSettingsDraft((s) => ({ ...s, sipPassword: e.target.value }))}
                          placeholder={settingsDraft.sipPasswordSaved ? 'Saved - enter new password to replace' : 'SIP account password'}
                        />
                      </div>
                      <div>
                        <Label>Transport</Label>
                        <Select value={settingsDraft.sipTransport} onValueChange={(sipTransport) => setSettingsDraft((s) => ({ ...s, sipTransport }))}>
                          <SelectTrigger className="mt-2 border-slate-700 bg-slate-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="udp">UDP</SelectItem>
                            <SelectItem value="tcp">TCP</SelectItem>
                            <SelectItem value="tls">TLS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="rounded-lg border border-sky-300/20 bg-sky-300/10 p-3 text-sm text-sky-100">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                        <p className="font-medium">Call center target: {activeSipUri || 'Not configured'}</p>
                          <p className="mt-1 text-xs text-sky-100/70">All Concierge users call this same shared SIP account. Use these credentials in Linphone or Zoiper on the call-center device.</p>
                        </div>
                        {generatedSipUri && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-sky-200/30 bg-sky-200/10 text-sky-50 hover:bg-sky-200/20"
                            onClick={() => setSettingsDraft((s) => ({ ...s, sipUri: generatedSipUri }))}
                          >
                            Use Generated URI
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className={`rounded-lg border p-3 text-sm ${sipStatusClasses}`}>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium">Status: {sipStatusLabel}</p>
                        {sipLastChecked && (
                          <p className="text-xs opacity-75">Last checked: {new Date(sipLastChecked).toLocaleString()}</p>
                        )}
                      </div>
                      <p className="mt-1 text-xs opacity-80">{sipStatusMessage}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      Customers never receive the registration username or password. Web and mobile only open the call-center <code>sip:</code> link after VIP Concierge is active.
                    </p>
                  </CardContent>
                </Card>

                </>
                )}

                <Card className="border-slate-700 bg-slate-950/70 text-slate-100 md:col-span-2 xl:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mic className="h-5 w-5 text-cyan-300" />
                      {tc('voice.title', 'Voice & Translation')}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {tc('voice.description', 'Control mobile Concierge talk-to-chat and spoken translated replies.')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
                      <div>
                        <Label>{tc('voice.enableMessages', 'Enable Voice Messages')}</Label>
                        <p className="mt-1 text-xs text-slate-400">{tc('voice.enableMessagesDescription', 'Shows the Talk button and allows microphone transcription.')}</p>
                      </div>
                      <Switch
                        checked={settingsDraft.voiceEnabled}
                        onCheckedChange={(voiceEnabled) => setSettingsDraft((s) => ({ ...s, voiceEnabled }))}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
                      <div>
                        <Label className="flex items-center gap-2">
                          <Languages className="h-4 w-4 text-cyan-300" />
                          {tc('voice.enableTranslation', 'Enable Translation')}
                        </Label>
                        <p className="mt-1 text-xs text-slate-400">{tc('voice.enableTranslationDescription', 'Allows Concierge AI replies to be translated for users.')}</p>
                      </div>
                      <Switch
                        checked={settingsDraft.translationEnabled}
                        onCheckedChange={(translationEnabled) => setSettingsDraft((s) => ({ ...s, translationEnabled }))}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>{tc('voice.readItVoice', 'Read It Voice')}</Label>
                        <Select
                          value={settingsDraft.voiceReadMode}
                          onValueChange={(voiceReadMode) =>
                            setSettingsDraft((s) => ({
                              ...s,
                              voiceReadMode: voiceReadMode === 'browser' ? 'browser' : 'openai',
                            }))
                          }
                        >
                          <SelectTrigger className="mt-2 border-slate-700 bg-slate-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openai">{tc('voice.openaiVoice', 'Professional OpenAI Voice')}</SelectItem>
                            <SelectItem value="browser">{tc('voice.browserVoice', 'Browser Voice')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="mt-2 text-xs text-slate-400">
                          {tc('voice.readItDescription', 'OpenAI sounds more natural. Browser voice is faster and free on the device.')}
                        </p>
                      </div>

                      <div>
                        <Label>{tc('voice.translationLanguage', 'Translation Language')}</Label>
                        <Select
                          value={settingsDraft.translationLanguage}
                          onValueChange={(translationLanguage) => setSettingsDraft((s) => ({ ...s, translationLanguage }))}
                        >
                          <SelectTrigger className="mt-2 border-slate-700 bg-slate-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">{tc('languages.userAppLanguage', 'User App Language')}</SelectItem>
                            <SelectItem value="en">{tc('languages.english', 'English')}</SelectItem>
                            <SelectItem value="ar">{tc('languages.arabic', 'Arabic')}</SelectItem>
                            <SelectItem value="fr">{tc('languages.french', 'French')}</SelectItem>
                            <SelectItem value="es">{tc('languages.spanish', 'Spanish')}</SelectItem>
                            <SelectItem value="de">{tc('languages.german', 'German')}</SelectItem>
                            <SelectItem value="it">{tc('languages.italian', 'Italian')}</SelectItem>
                            <SelectItem value="pt">{tc('languages.portuguese', 'Portuguese')}</SelectItem>
                            <SelectItem value="zh">{tc('languages.chinese', 'Chinese')}</SelectItem>
                            <SelectItem value="ja">{tc('languages.japanese', 'Japanese')}</SelectItem>
                            <SelectItem value="hi">{tc('languages.hindi', 'Hindi')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
                        <div>
                          <Label>{tc('voice.translateVoiceReply', 'Translate Voice Reply')}</Label>
                          <p className="mt-1 text-xs text-slate-400">{tc('voice.translateVoiceDescription', 'Translate before creating the spoken audio response.')}</p>
                        </div>
                        <Switch
                          checked={settingsDraft.voiceTranslationEnabled}
                          onCheckedChange={(voiceTranslationEnabled) => setSettingsDraft((s) => ({ ...s, voiceTranslationEnabled }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-950/70 text-slate-100 md:col-span-2 xl:col-span-1 2xl:col-span-2">
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-lime-300" /> {tc('bot.title', 'ChatGPT Bot')}</CardTitle>
                        <CardDescription className="text-slate-400">{tc('bot.description', 'Control the ChatGPT copy and behavior for Concierge.')}</CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 border-lime-300/30 bg-lime-300/10 text-lime-100 hover:bg-lime-300/20 hover:text-lime-50"
                        onClick={() =>
                          setSettingsDraft((s) => ({
                            ...s,
                            aiBotEnabled: true,
                            aiBotName: chatGptBotName,
                            aiBotWelcome: chatGptWelcome,
                            aiBotPrompt: chatGptPrompt,
                          }))
                        }
                      >
                        {tc('bot.usePreset', 'Use ChatGPT Preset')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
                      <Label>{tc('bot.enable', 'Enable AI Bot')}</Label>
                      <Switch checked={settingsDraft.aiBotEnabled} onCheckedChange={(aiBotEnabled) => setSettingsDraft((s) => ({ ...s, aiBotEnabled }))} />
                    </div>
                    <div>
                      <Label>{tc('bot.name', 'Bot Name')}</Label>
                      <Input className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.aiBotName} onChange={(e) => setSettingsDraft((s) => ({ ...s, aiBotName: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{tc('bot.welcomeMessage', 'Welcome Message')}</Label>
                      <Textarea className="mt-2 border-slate-700 bg-slate-900" value={settingsDraft.aiBotWelcome} onChange={(e) => setSettingsDraft((s) => ({ ...s, aiBotWelcome: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{tc('bot.instructions', 'Bot Instructions')}</Label>
                      <Textarea className="mt-2 min-h-28 border-slate-700 bg-slate-900" value={settingsDraft.aiBotPrompt} onChange={(e) => setSettingsDraft((s) => ({ ...s, aiBotPrompt: e.target.value }))} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="members">
            <Card className="border-slate-700 bg-slate-950/70 text-slate-100">
              <CardHeader>
                <CardTitle>{tc('members.title', 'Concierge Members')}</CardTitle>
                <CardDescription className="text-slate-400">{tc('members.description', 'View successful members and control their Concierge status.')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead>{tc('members.table.member', 'Member')}</TableHead>
                      <TableHead>{tc('members.table.status', 'Status')}</TableHead>
                      <TableHead>{tc('members.table.billing', 'Billing')}</TableHead>
                      <TableHead>{tc('members.table.fee', 'Fee')}</TableHead>
                      <TableHead>{tc('members.table.payment', 'Payment')}</TableHead>
                      <TableHead>{tc('members.table.dates', 'Dates')}</TableHead>
                      <TableHead className="text-right">{tc('members.table.action', 'Action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-slate-400">{tc('members.empty', 'No Concierge members yet.')}</TableCell>
                      </TableRow>
                    ) : (
                      members.map((member) => {
                        const draft = memberDrafts[member.id];
                        return (
                          <TableRow key={member.id} className="border-slate-800">
                            <TableCell>
                              <div className="font-medium text-white">{member.userName || tc('members.unnamedUser', 'Unnamed user')}</div>
                              <div className="text-xs text-slate-400">{member.userEmail || member.userId}</div>
                              <div className="mt-1 text-xs capitalize text-slate-500">{member.userRole || tc('members.customer', 'customer')}</div>
                            </TableCell>
                            <TableCell>
                              <Select value={draft?.status || member.status} onValueChange={(status: MemberDraft['status']) => setMemberDraft(member.id, { status })}>
                                <SelectTrigger className="w-40 border-slate-700 bg-slate-900">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">{memberStatusLabel('active')}</SelectItem>
                                  <SelectItem value="trial_active">{memberStatusLabel('trial_active')}</SelectItem>
                                  <SelectItem value="pending_payment">{memberStatusLabel('pending_payment')}</SelectItem>
                                  <SelectItem value="past_due">{memberStatusLabel('past_due')}</SelectItem>
                                  <SelectItem value="expired">{memberStatusLabel('expired')}</SelectItem>
                                  <SelectItem value="inactive">{memberStatusLabel('inactive')}</SelectItem>
                                </SelectContent>
                              </Select>
                              <Badge className={`mt-2 ${statusClass(member.status)}`}>{memberStatusLabel(member.status)}</Badge>
                            </TableCell>
                            <TableCell>
                              <Select value={draft?.billingCycle || member.billingCycle} onValueChange={(billingCycle: MemberDraft['billingCycle']) => setMemberDraft(member.id, { billingCycle })}>
                                <SelectTrigger className="w-36 border-slate-700 bg-slate-900">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="one_time">{billingCycleLabel('one_time')}</SelectItem>
                                  <SelectItem value="monthly">{billingCycleLabel('monthly')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input className="w-28 border-slate-700 bg-slate-900" value={draft?.fee || member.fee} onChange={(e) => setMemberDraft(member.id, { fee: e.target.value })} />
                            </TableCell>
                            <TableCell>
                              <Input className="w-32 border-slate-700 bg-slate-900" value={draft?.paymentMethod || ''} onChange={(e) => setMemberDraft(member.id, { paymentMethod: e.target.value })} placeholder="wallet" />
                            </TableCell>
                            <TableCell className="text-xs text-slate-400">
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {tc('members.activeDate', 'Active: {date}', { date: formatDate(member.activeFrom) })}
                              </div>
                              <div className="mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {tc('members.nextDate', 'Next: {date}', { date: formatDate(member.nextChargeAt) })}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                size="sm"
                                disabled={!draft || updateMemberMutation.isPending}
                                onClick={() => draft && updateMemberMutation.mutate({ id: member.id, draft })}
                                className="gap-2 bg-teal-400 text-slate-950 hover:bg-teal-300"
                              >
                                <Save className="h-4 w-4" />
                                {tc('actions.save', 'Save')}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inbox" className="w-full">
            <div className="w-full">
              <div className="mb-4 flex items-center gap-2 text-slate-200">
                <Headphones className="h-5 w-5 text-teal-300" />
                <span className="font-medium">{tc('inbox.title', 'Concierge Chat & Voice Inbox')}</span>
              </div>
              <TicketManagement channel="concierge" />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
