import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, MessageSquareText, Phone, PhoneCall, RefreshCw, Send, Sparkles, Settings2, CalendarClock, Repeat, Route, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

function getPackageLabel(packageTerm: '1_month' | '3_months' | '6_months' | '9_months' | '1_year') {
  switch (packageTerm) {
    case '3_months':
      return '3 Months';
    case '6_months':
      return '6 Months';
    case '9_months':
      return '9 Months';
    case '1_year':
      return '1 Year';
    default:
      return '1 Month';
  }
}

type ForwardingType = 'none' | 'international' | 'sip' | 'voicemail';

function getForwardingLabel(type?: ForwardingType | string | null) {
  switch (type) {
    case 'sip':
      return 'eRoaming Number';
    case 'international':
      return 'International Number';
    case 'voicemail':
      return 'Voice Mail';
    default:
      return 'No Forwarding';
  }
}

function formatForwarding(type?: ForwardingType | string | null, destination?: string | null) {
  const label = getForwardingLabel(type);
  if (!type || type === 'none' || type === 'voicemail') return label;
  return destination ? `${label} - ${destination}` : label;
}

type VirtualNumberDashboard = {
  enabled: boolean;
  hasCredentials: boolean;
  provider: string;
  brandName: string;
  defaultCountry: string;
  autoAssign: boolean;
  walletBalance?: string;
  billingRole?: 'admin' | 'reseller' | 'agent';
  sipAccount?: {
    id: string;
    username: string;
    password: string;
    domain: string;
    uri: string;
    status: string;
    connectionStatus?: 'online' | 'offline' | 'unknown';
    connectionMessage?: string;
    connectionCheckedAt?: string | null;
    transport?: string | null;
    port?: number | null;
    createdAt: string;
  } | null;
  number: {
    id: string;
    msisdn: string;
    countryCode: string;
    status: string;
    assignedAt: string;
    billing?: UsageBilling | null;
  } | null;
  numbers?: Array<{
    id: string;
    msisdn: string;
    countryCode: string;
    status: string;
    assignedAt: string;
    billing?: UsageBilling | null;
    routing?: {
      type?: ForwardingType;
      destination?: string | null;
    } | null;
    pricing?: {
      monthlyFee?: string;
      inboundFee?: string;
      outboundFee?: string;
      voiceFee?: string;
      smsFee?: string;
    } | null;
    subscription?: {
      packageTerm: '1_month' | '3_months' | '6_months' | '9_months' | '1_year';
      paymentMethod: 'wallet' | 'other';
      renewalPrice: string;
      autoRenew: boolean;
      reminderDays: number;
      activeUntil?: string | null;
      nextChargeAt?: string | null;
      renewalStatus?: string;
      cancelAtPeriodEnd?: boolean;
    } | null;
  }>;
  application: {
    id: string;
    status: string;
    countryCode: string;
    desiredNumber?: string | null;
    notes?: string | null;
    createdAt: string;
    metadata?: {
      requestQuantity?: number;
      packageTerm?: '1_month' | '3_months' | '6_months' | '9_months' | '1_year';
      paymentMethod?: 'wallet' | 'other';
      autoRenew?: boolean;
      reminderDays?: number;
      forwardingType?: ForwardingType;
      forwardingDestination?: string | null;
      selectedMsisdn?: string | null;
    } | null;
  } | null;
  messages: Array<{
    id: string;
    direction: 'inbound' | 'outbound';
    fromNumber: string;
    toNumber: string;
    text: string;
    status: string;
    createdAt: string;
  }>;
};

type UsageBilling = {
  walletBalance: string;
  billingRole: 'admin' | 'reseller' | 'agent';
  rates: {
    smsOutbound: string;
    smsInbound: string;
    voiceOutbound: string;
    voiceInbound: string;
    retail?: {
      smsOutbound?: string;
      smsInbound?: string;
      voiceOutbound?: string;
      voiceInbound?: string;
    };
  };
  canSendSms: boolean;
  canReceiveSms: boolean;
  canStartOutboundCall: boolean;
  canReceiveInboundCall: boolean;
};

type VirtualNumberSelection = {
  enabled: boolean;
  countries: Array<{ code: string; count: number }>;
  numbers: Array<{
    id: string;
    msisdn: string;
    countryCode: string;
    isPremium: boolean;
    setupFee: string;
    monthlyFee: string;
    inboundFee: string;
    outboundFee: string;
    notes?: string | null;
  }>;
};

const countryOptions = [
  ['US', 'United States'],
  ['CA', 'Canada'],
  ['GB', 'United Kingdom'],
  ['AU', 'Australia'],
  ['DE', 'Germany'],
  ['FR', 'France'],
  ['ES', 'Spain'],
  ['IT', 'Italy'],
  ['NL', 'Netherlands'],
  ['BE', 'Belgium'],
  ['CH', 'Switzerland'],
  ['SE', 'Sweden'],
  ['NO', 'Norway'],
  ['DK', 'Denmark'],
  ['FI', 'Finland'],
  ['IE', 'Ireland'],
  ['PT', 'Portugal'],
  ['AT', 'Austria'],
  ['PL', 'Poland'],
  ['CZ', 'Czech Republic'],
  ['RO', 'Romania'],
  ['GR', 'Greece'],
  ['TR', 'Turkey'],
  ['AE', 'United Arab Emirates'],
  ['SA', 'Saudi Arabia'],
  ['LB', 'Lebanon'],
  ['IL', 'Israel'],
  ['EG', 'Egypt'],
  ['ZA', 'South Africa'],
  ['IN', 'India'],
  ['SG', 'Singapore'],
  ['HK', 'Hong Kong'],
  ['JP', 'Japan'],
  ['KR', 'South Korea'],
  ['MY', 'Malaysia'],
  ['TH', 'Thailand'],
  ['ID', 'Indonesia'],
  ['PH', 'Philippines'],
  ['BR', 'Brazil'],
  ['MX', 'Mexico'],
  ['AR', 'Argentina'],
] as const;

export default function VirtualNumbers() {
  const { toast } = useToast();
  const [countryCode, setCountryCode] = useState('US');
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [desiredNumber, setDesiredNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [requestQuantity, setRequestQuantity] = useState('1');
  const [packageTerm, setPackageTerm] = useState<'1_month' | '3_months' | '6_months' | '9_months' | '1_year'>('1_month');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'other'>('wallet');
  const [requestAutoRenew, setRequestAutoRenew] = useState(true);
  const [requestReminderDays, setRequestReminderDays] = useState('3');
  const [requestForwardingType, setRequestForwardingType] = useState<ForwardingType>('sip');
  const [requestForwardingDestination, setRequestForwardingDestination] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [messageText, setMessageText] = useState('');
  const [dialNumber, setDialNumber] = useState('');
  const [callStatus, setCallStatus] = useState('Ready');
  const [editingNumberId, setEditingNumberId] = useState<string | null>(null);
  const [numberSettings, setNumberSettings] = useState<Record<string, {
    autoRenew: boolean;
    reminderDays: string;
    forwardingType: ForwardingType;
    forwardingDestination: string;
    cancelAtPeriodEnd: boolean;
  }>>({});

  const { data, isLoading } = useQuery<VirtualNumberDashboard>({
    queryKey: ['/api/vonage/dashboard'],
  });

  const { data: selection, isLoading: isSelectionLoading } = useQuery<VirtualNumberSelection>({
    queryKey: ['/api/vonage/selection', countryCode, desiredNumber],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (countryCode) params.set('countryCode', countryCode);
      if (desiredNumber) params.set('search', desiredNumber);
      const res = await fetch(`/api/vonage/selection?${params.toString()}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Could not load available eRoaming numbers');
      return json.data as VirtualNumberSelection;
    },
    enabled: Boolean(data?.enabled),
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/vonage/apply', {
        countryCode,
        desiredNumber,
        notes,
        inventoryId: selectedInventoryId,
        quantity: Math.max(1, Number(requestQuantity) || 1),
        packageTerm,
        paymentMethod,
        autoRenew: requestAutoRenew,
        reminderDays: Math.max(1, Number(requestReminderDays) || 3),
        forwardingType: requestForwardingType,
        forwardingDestination: requestForwardingDestination,
      });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/vonage/dashboard'] });
      toast({
        title: 'Application submitted',
        description: 'Your eRoaming Number request was submitted successfully.',
      });
      setDesiredNumber('');
      setSelectedInventoryId('');
      setNotes('');
      setRequestQuantity('1');
      setPackageTerm('1_month');
      setPaymentMethod('wallet');
      setRequestAutoRenew(true);
      setRequestReminderDays('3');
      setRequestForwardingType('sip');
      setRequestForwardingDestination('');
    },
    onError: (error: any) => {
      toast({
        title: 'Application failed',
        description: error.message || 'Could not submit eRoaming Number application',
        variant: 'destructive',
      });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/vonage/messages/send', {
        to: sendTo,
        text: messageText,
      });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/vonage/dashboard'] });
      toast({
        title: 'SMS sent',
        description: 'Your SMS was queued successfully.',
      });
      setMessageText('');
    },
    onError: (error: any) => {
      toast({
        title: 'SMS failed',
        description: error.message || 'Could not send SMS',
        variant: 'destructive',
      });
    },
  });

  const hasNativeVoiceBridge = () => {
    const w = window as any;
    return Boolean(
      w.ReactNativeWebView ||
      w.flutter_inappwebview ||
      w.EsimVoiceBridge ||
      w.VoiceBridge,
    );
  };

  const notifyNativeVoiceBridge = (session: any, number: string) => {
    const message = JSON.stringify({
      type: 'eroaming_voice',
      event: 'start_outbound_call',
      number,
      session,
      metadata: {
        backend: session?.backend || 'vonage',
      },
    });
    const w = window as any;

    if (w.ReactNativeWebView) {
      w.ReactNativeWebView.postMessage(message);
    }
    if (w.flutter_inappwebview) {
      w.flutter_inappwebview.callHandler('onVoiceEvent', message);
    }
    if (w.EsimVoiceBridge?.startOutboundCall) {
      w.EsimVoiceBridge.startOutboundCall(message);
    }
    if (w.VoiceBridge?.startOutboundCall) {
      w.VoiceBridge.startOutboundCall(message);
    }
    window.parent?.postMessage(message, '*');
  };

  const voiceMutation = useMutation({
    mutationFn: async () => {
      if (!hasNativeVoiceBridge()) {
        throw new Error('Live eRoaming calls require the Android or iOS app. Browser preview can show the dial pad, but it cannot open the native voice engine.');
      }

      const res = await apiRequest('POST', '/api/voice/session', {
        direction: 'outbound',
        to: dialNumber,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Could not start eRoaming call');
      return json.data;
    },
    onSuccess: (session) => {
      notifyNativeVoiceBridge(session, dialNumber);
      setCallStatus('Calling through mobile app');
      toast({
        title: 'Calling',
        description: `Calling ${dialNumber} through the mobile voice engine.`,
      });
    },
    onError: (error: any) => {
      setCallStatus('Native app required');
      toast({
        title: 'Native app required',
        description: error.message || 'Open this dial pad inside the Android or iOS app to place the call.',
        variant: 'destructive',
      });
    },
  });

  const updateNumberMutation = useMutation({
    mutationFn: async (payload: { id: string; settings: any }) => {
      const res = await apiRequest('PATCH', `/api/vonage/numbers/${payload.id}/settings`, payload.settings);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/vonage/dashboard'] });
      toast({
        title: 'Number settings updated',
        description: 'Subscription and forwarding settings were saved.',
      });
      setEditingNumberId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Could not update eRoaming Number settings',
        variant: 'destructive',
      });
    },
  });

  const testSipAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/vonage/sip-account/test');
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Could not test Free SIP registration');
      return json.data as {
        online: boolean;
        status: 'online' | 'offline';
        message: string;
        checkedAt: string;
      };
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/vonage/dashboard'] });
      toast({
        title: result.online ? 'Free SIP registration is online' : 'Free SIP registration is offline',
        description: result.message,
        variant: result.online ? 'default' : 'destructive',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'SIP test failed',
        description: error.message || 'Could not test Free SIP registration',
        variant: 'destructive',
      });
    },
  });

  const statusBadge = useMemo(() => {
    if (data?.number) return `Active number: ${data.number.msisdn}`;
    if (data?.application) return `Application status: ${data.application.status}`;
    return 'No eRoaming Number yet';
  }, [data]);

  const numbers = data?.numbers || [];
  const primaryNumber = numbers.find((item) => item.status === 'active') || numbers[0];
  const activeBilling = primaryNumber?.billing || data?.number?.billing || null;
  const canSendSms = Boolean(activeBilling?.canSendSms);
  const canStartCall = Boolean(activeBilling?.canStartOutboundCall);
  const smsRequiredAmount = activeBilling?.rates.smsOutbound || '0.00';
  const availableNumbers = selection?.numbers || [];
  const selectedInventory = availableNumbers.find((item) => item.id === selectedInventoryId) || null;
  const inventoryCountryCounts = new Map((selection?.countries || []).map((item) => [item.code, item.count]));
  const mergedCountryOptions = countryOptions.map(([code, name]) => ({
    code,
    name,
    count: inventoryCountryCounts.get(code) || 0,
  }));
  for (const item of selection?.countries || []) {
    if (!mergedCountryOptions.some((country) => country.code === item.code)) {
      mergedCountryOptions.push({ code: item.code, name: item.code, count: item.count });
    }
  }
  const userSipAccount = data?.sipAccount || null;
  const sipConnectionStatus = testSipAccountMutation.data?.status || userSipAccount?.connectionStatus || 'unknown';
  const sipConnectionMessage = testSipAccountMutation.data?.message || userSipAccount?.connectionMessage || 'SIP registration has not been tested yet.';
  const sipConnectionCheckedAt = testSipAccountMutation.data?.checkedAt || userSipAccount?.connectionCheckedAt || '';
  const sipOnline = sipConnectionStatus === 'online';
  const sipStatusLabel = sipOnline ? 'Online' : sipConnectionStatus === 'offline' ? 'Offline' : 'Not tested';
  const sipRegistrationLabel = sipOnline ? 'Registered' : sipConnectionStatus === 'offline' ? 'Not registered' : 'Not tested';
  const sipStatusClass = sipOnline
    ? 'border-emerald-300/25 bg-emerald-400/15 text-emerald-100'
    : sipConnectionStatus === 'offline'
      ? 'border-red-300/25 bg-red-400/15 text-red-100'
      : 'border-slate-300/20 bg-slate-400/10 text-slate-200';

  const useEroamingForRequest = () => {
    setRequestForwardingType('sip');
    setRequestForwardingDestination('');
  };

  const useEroamingForNumber = (
    numberId: string,
    localSettings: {
      autoRenew: boolean;
      reminderDays: string;
      forwardingType: ForwardingType;
      forwardingDestination: string;
      cancelAtPeriodEnd: boolean;
    },
  ) => {
    setNumberSettings((current) => ({
      ...current,
      [numberId]: {
        ...localSettings,
        forwardingType: 'sip',
        forwardingDestination: '',
      },
    }));
  };

  useEffect(() => {
    if (requestForwardingType !== 'sip') return;
    setRequestForwardingDestination('');
  }, [requestForwardingType]);

  const appendDialDigit = (digit: string) => {
    setDialNumber((current) => `${current}${digit}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="-m-2 min-h-[calc(100vh-8rem)] space-y-6 rounded-2xl bg-[linear-gradient(135deg,#050816_0%,#071735_48%,#0a1024_100%)] p-4 text-white md:-m-4 md:p-6">
      <div className="overflow-hidden rounded-2xl border border-blue-300/10 bg-blue-950/25 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex flex-col gap-5 border-b border-blue-300/10 bg-[linear-gradient(110deg,rgba(37,99,235,0.42),rgba(14,165,233,0.13),rgba(15,23,42,0.72))] p-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-medium text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Wallet-first voice and SMS
            </div>
            <h1 className="text-4xl font-bold">eRoaming Numbers</h1>
            <p className="mt-2 max-w-3xl text-cyan-50/80">
              Request and manage eRoaming Numbers for calls, SMS, forwarding, renewals, and wallet-first billing.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px]">
            <div className="rounded-xl border border-blue-300/10 bg-slate-950/45 px-4 py-3 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-cyan-100/70">Status</div>
              <div className="mt-1 truncate text-sm font-semibold">{statusBadge}</div>
            </div>
            <div className="rounded-xl border border-blue-300/10 bg-slate-950/45 px-4 py-3 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-cyan-100/70">Wallet</div>
              <div className="mt-1 text-sm font-semibold">${data?.walletBalance || activeBilling?.walletBalance || '0.00'}</div>
            </div>
            <div className="rounded-xl border border-blue-300/10 bg-slate-950/45 px-4 py-3 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-cyan-100/70">Billing</div>
              <div className="mt-1 text-sm font-semibold capitalize">{activeBilling?.billingRole || data?.billingRole || 'admin'} rates</div>
            </div>
          </div>
        </div>
        <div className="grid gap-0 md:grid-cols-3">
          <div className="border-b border-blue-300/10 p-5 md:border-b-0 md:border-r">
            <div className="text-xs uppercase tracking-wide text-cyan-100/70">Before every service</div>
            <div className="mt-1 font-semibold">Wallet balance is checked first</div>
          </div>
          <div className="border-b border-blue-300/10 p-5 md:border-b-0 md:border-r">
            <div className="text-xs uppercase tracking-wide text-cyan-100/70">When balance is low</div>
            <div className="mt-1 font-semibold">Calls and SMS are stopped</div>
          </div>
          <div className="p-5">
            <div className="text-xs uppercase tracking-wide text-cyan-100/70">Price source</div>
            <div className="mt-1 font-semibold">Retail rates by admin, reseller, or agent</div>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-blue-300/10 bg-blue-950/25 text-white shadow-xl shadow-black/30 backdrop-blur">
        <CardContent className="grid gap-0 p-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex items-start gap-4 p-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-400 text-slate-950 shadow-sm">
              <Phone className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">eRoaming Number</h2>
              <p className="mt-1 text-sm text-cyan-50/75">
                {statusBadge}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-blue-300/10 bg-slate-950/45 px-3 py-1 text-emerald-300">WALLET CHARGED BEFORE SERVICE</span>
                <span className="rounded-full border border-blue-300/10 bg-slate-950/45 px-3 py-1 text-emerald-300">AUTO SUSPEND ON LOW BALANCE</span>
                <span className="rounded-full border border-blue-300/10 bg-slate-950/45 px-3 py-1 text-emerald-300">SMS AND VOICE ENABLED</span>
              </div>
            </div>
          </div>
          <div className="grid border-t border-blue-300/10 bg-slate-950/35 p-5 sm:grid-cols-3 lg:border-l lg:border-t-0">
            <div className="p-2">
              <div className="text-xs uppercase tracking-wide text-cyan-100/70">SMS Send</div>
              <div className="mt-1 text-lg font-semibold">${activeBilling?.rates.smsOutbound || '0.00'}</div>
            </div>
            <div className="p-2">
              <div className="text-xs uppercase tracking-wide text-cyan-100/70">Voice Call</div>
              <div className="mt-1 text-lg font-semibold">${activeBilling?.rates.voiceOutbound || '0.00'}</div>
            </div>
            <div className="p-2">
              <div className="text-xs uppercase tracking-wide text-cyan-100/70">Inbound SMS</div>
              <div className="mt-1 text-lg font-semibold">${activeBilling?.rates.smsInbound || '0.00'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {userSipAccount && (
        <Card className="border-cyan-300/20 bg-cyan-400/10 text-white shadow-xl shadow-black/20">
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-cyan-200" />
                <h2 className="text-lg font-semibold">My eRoaming SIP Account</h2>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${sipStatusClass}`}>
                  {sipOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {sipStatusLabel}
                </span>
              </div>
              <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-lg border border-cyan-300/15 bg-slate-950/45 p-3">
                  <div className="text-xs uppercase tracking-wide text-cyan-50/60">SIP Address</div>
                  <div className="mt-1 break-all font-semibold">{userSipAccount.uri}</div>
                </div>
                <div className="rounded-lg border border-cyan-300/15 bg-slate-950/45 p-3">
                  <div className="text-xs uppercase tracking-wide text-cyan-50/60">Username</div>
                  <div className="mt-1 font-semibold">{userSipAccount.username}</div>
                </div>
                <div className="rounded-lg border border-cyan-300/15 bg-slate-950/45 p-3">
                  <div className="text-xs uppercase tracking-wide text-cyan-50/60">Password</div>
                  <div className="mt-1 break-all font-semibold">{userSipAccount.password}</div>
                </div>
              </div>
              <p className="mt-3 text-xs text-cyan-50/65">
                This is your voice identity on our SIP platform. eRoaming Number forwarding uses it automatically.
              </p>
              <div className={`mt-3 rounded-lg border p-3 text-xs ${sipStatusClass}`}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold">Registration: {sipRegistrationLabel}</span>
                  {sipOnline && <span className="rounded-full border border-emerald-300/25 bg-emerald-400/15 px-2 py-0.5 font-semibold text-emerald-100">Status: Online</span>}
                  {sipConnectionCheckedAt && <span className="opacity-75">Last checked: {new Date(sipConnectionCheckedAt).toLocaleString()}</span>}
                </div>
                <p className="mt-1 opacity-80">{sipConnectionMessage}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                onClick={useEroamingForRequest}
              >
                Use eRoaming forwarding
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-cyan-300/30 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/20 hover:text-white"
                onClick={() => testSipAccountMutation.mutate()}
                disabled={testSipAccountMutation.isPending}
              >
                {testSipAccountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Test SIP Registration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeBilling && (
        <Card className="border-amber-300/30 bg-amber-400/10 text-white">
          <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-4">
            <div><span className="font-medium">Rates:</span> {activeBilling.billingRole}</div>
            <div><span className="font-medium">SMS send:</span> ${activeBilling.rates.smsOutbound}</div>
            <div><span className="font-medium">Voice call:</span> ${activeBilling.rates.voiceOutbound}</div>
            <div><span className="font-medium">Inbound SMS:</span> ${activeBilling.rates.smsInbound}</div>
          </CardContent>
        </Card>
      )}

      {!data?.enabled && (
        <Card className="border-blue-300/10 bg-blue-950/25 text-white">
          <CardContent className="p-6 text-sm text-cyan-50/75">
            The eRoaming feature is not available right now.
          </CardContent>
        </Card>
      )}

      {data?.enabled && (
        <Card className="overflow-hidden border-blue-300/10 bg-blue-950/25 text-white shadow-xl shadow-black/30 backdrop-blur">
          <CardHeader className="border-b border-blue-300/10 bg-slate-950/35">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Sparkles className="h-5 w-5 text-cyan-300" />
                  Request an eRoaming Number
                </CardTitle>
                <CardDescription className="mt-2 max-w-3xl text-cyan-50/75">
                  Select the number you want, choose the request details, and your team can issue it after payment and approval. You can request more than one eRoaming Number.
                </CardDescription>
              </div>
              <div className="rounded-xl border border-blue-300/10 bg-slate-950/45 px-4 py-3 text-sm">
                <div className="text-xs uppercase tracking-wide text-cyan-100/70">Payment rule</div>
                <div className="font-semibold">Wallet Balance First</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 p-0 lg:grid-cols-[280px_1fr]">
            <div className="border-b border-blue-300/10 bg-slate-950/35 p-5 lg:border-b-0 lg:border-r">
              <div className="space-y-4 text-sm">
                <div className="rounded-xl border border-blue-300/10 bg-blue-400/10 p-4">
                    <div className="font-semibold">1. REQUEST</div>
                    <p className="mt-1 text-cyan-50/70">CHOOSE COUNTRY, PATTERN, PLAN, AND FORWARDING.</p>
                </div>
                <div className="rounded-xl border border-blue-300/10 bg-blue-400/10 p-4">
                    <div className="font-semibold">2. APPROVE</div>
                    <p className="mt-1 text-cyan-50/70">YOUR TEAM REVIEWS AND ISSUES THE EROAMING NUMBER.</p>
                </div>
                <div className="rounded-xl border border-blue-300/10 bg-blue-400/10 p-4">
                    <div className="font-semibold">3. USE</div>
                    <p className="mt-1 text-cyan-50/70">SMS AND VOICE ARE ALLOWED ONLY WITH ENOUGH WALLET BALANCE.</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="virtual-country">eRoaming Country</Label>
              <select
                id="virtual-country"
                className="flex h-10 w-full rounded-md border border-blue-300/15 bg-slate-950/70 px-3 py-2 text-sm text-white"
                value={countryCode || data.defaultCountry}
                onChange={(e) => {
                  setCountryCode(e.target.value);
                  setSelectedInventoryId('');
                }}
              >
                {mergedCountryOptions.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} ({country.code}){country.count ? ` - ${country.count} available` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desired-number">Preferred Number Pattern</Label>
              <Input
                id="desired-number"
                value={desiredNumber}
                onChange={(e) => {
                  setDesiredNumber(e.target.value);
                  setSelectedInventoryId('');
                }}
                placeholder="Optional"
                className="border-blue-300/15 bg-slate-950/70 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="available-did">Available eRoaming Number</Label>
              <select
                id="available-did"
                className="flex h-10 w-full rounded-md border border-blue-300/15 bg-slate-950/70 px-3 py-2 text-sm text-white"
                value={selectedInventoryId}
                onChange={(e) => {
                  setSelectedInventoryId(e.target.value);
                  if (e.target.value) setRequestQuantity('1');
                }}
                disabled={isSelectionLoading}
              >
                <option value="">
                  {isSelectionLoading
                    ? 'Loading available eRoaming numbers...'
                    : availableNumbers.length
                      ? 'Auto assign or manual review'
                      : 'No saved eRoaming inventory for this country'}
                </option>
                {availableNumbers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.msisdn} - {item.countryCode} - ${item.monthlyFee}/mo{item.isPremium ? ' - Premium' : ''}
                  </option>
                ))}
              </select>
              {selectedInventory && (
                <div className="rounded-lg border border-blue-300/10 bg-slate-950/45 p-3 text-xs text-cyan-50/80">
                  Selected eRoaming: {selectedInventory.msisdn} - Setup ${selectedInventory.setupFee}, monthly ${selectedInventory.monthlyFee}, inbound ${selectedInventory.inboundFee}, outbound ${selectedInventory.outboundFee}.
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="virtual-quantity">Quantity</Label>
              <Input
                id="virtual-quantity"
                type="number"
                min={1}
                value={requestQuantity}
                disabled={Boolean(selectedInventoryId)}
                onChange={(e) => setRequestQuantity(e.target.value)}
                className="border-blue-300/15 bg-slate-950/70 text-white"
              />
              {selectedInventoryId && <p className="text-xs text-cyan-50/65">Exact eRoaming selection supports one number per request.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="virtual-package">Subscription Plan</Label>
              <select
                id="virtual-package"
                className="flex h-10 w-full rounded-md border border-blue-300/15 bg-slate-950/70 px-3 py-2 text-sm text-white"
                value={packageTerm}
                onChange={(e) => setPackageTerm(e.target.value as any)}
              >
                <option value="1_month">1 Month</option>
                <option value="3_months">3 Months</option>
                <option value="6_months">6 Months</option>
                <option value="9_months">9 Months</option>
                <option value="1_year">1 Year</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="virtual-payment">Payment Method</Label>
              <select
                id="virtual-payment"
                className="flex h-10 w-full rounded-md border border-blue-300/15 bg-slate-950/70 px-3 py-2 text-sm text-white"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'wallet' | 'other')}
              >
                <option value="wallet">Wallet Balance First</option>
                <option value="other">Other Payment Method</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="virtual-reminder">Renewal Reminder Days</Label>
              <Input
                id="virtual-reminder"
                type="number"
                min={1}
                value={requestReminderDays}
                onChange={(e) => setRequestReminderDays(e.target.value)}
                className="border-blue-300/15 bg-slate-950/70 text-white"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="application-notes">Notes</Label>
              <Textarea
                id="application-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tell us how you want to use this number."
                rows={4}
                className="border-blue-300/15 bg-slate-950/70 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-forwarding-type">Forward Number To</Label>
              <select
                id="request-forwarding-type"
                className="flex h-10 w-full rounded-md border border-blue-300/15 bg-slate-950/70 px-3 py-2 text-sm text-white"
                value={requestForwardingType}
                onChange={(e) => {
                  const value = e.target.value as ForwardingType;
                  setRequestForwardingType(value);
                  if (value === 'sip' || value === 'none' || value === 'voicemail') {
                    setRequestForwardingDestination('');
                  }
                }}
              >
                <option value="none">No Forwarding</option>
                <option value="sip">eRoaming Number</option>
                <option value="international">International Number</option>
                <option value="voicemail">Voice Mail</option>
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="request-forwarding-destination">Forwarding Destination</Label>
                {requestForwardingType !== 'sip' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 border-cyan-300/30 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/20"
                    onClick={useEroamingForRequest}
                  >
                    eRoaming
                  </Button>
                )}
              </div>
              <Input
                id="request-forwarding-destination"
                value={requestForwardingDestination}
                onChange={(e) => setRequestForwardingDestination(e.target.value)}
                placeholder={
                  requestForwardingType === 'international'
                    ? '+12025550199'
                    : requestForwardingType === 'sip'
                      ? 'Automatic eRoaming SIP account'
                      : ''
                }
                disabled={requestForwardingType !== 'international'}
                className="border-blue-300/15 bg-slate-950/70 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="rounded-xl border border-blue-300/10 bg-slate-950/45 p-4 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Auto Renew</div>
                  <div className="text-xs text-cyan-50/65">Wallet balance is used first for renewal when enabled.</div>
                </div>
                <Button type="button" variant={requestAutoRenew ? 'default' : 'outline'} onClick={() => setRequestAutoRenew((current) => !current)}>
                  {requestAutoRenew ? 'On' : 'Off'}
                </Button>
              </div>
            </div>
            <div className="md:col-span-2">
              <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                      <Phone className="mr-2 h-4 w-4" />
                      Submit Request
                    </>
                  )}
                </Button>
            </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data?.application && !data.number && (
        <Card className="border-blue-300/10 bg-blue-950/25 text-white shadow-xl shadow-black/30 backdrop-blur">
          <CardHeader>
            <CardTitle>Latest Application</CardTitle>
            <CardDescription className="text-cyan-50/75">Your most recent eRoaming Number request waiting for payment or manual issuing</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <div><span className="font-medium">Status:</span> {data.application.status}</div>
            <div><span className="font-medium">Country:</span> {data.application.countryCode}</div>
            <div><span className="font-medium">Preferred:</span> {data.application.metadata?.selectedMsisdn || data.application.desiredNumber || 'Any available number'}</div>
            <div><span className="font-medium">Quantity:</span> {data.application.metadata?.requestQuantity || 1}</div>
            <div><span className="font-medium">Plan:</span> {getPackageLabel(data.application.metadata?.packageTerm || '1_month')}</div>
            <div><span className="font-medium">Payment:</span> {data.application.metadata?.paymentMethod === 'other' ? 'Other payment method' : 'Wallet balance first'}</div>
            <div><span className="font-medium">Auto Renew:</span> {data.application.metadata?.autoRenew === false ? 'Off' : 'On'}</div>
            <div><span className="font-medium">Reminder Days:</span> {data.application.metadata?.reminderDays || 3}</div>
            <div><span className="font-medium">Forwarding:</span> {formatForwarding(data.application.metadata?.forwardingType, data.application.metadata?.forwardingDestination)}</div>
            <div><span className="font-medium">Requested:</span> {new Date(data.application.createdAt).toLocaleString()}</div>
          </CardContent>
        </Card>
      )}

      {numbers.length > 0 && (
        <>
          <Card className="border-blue-300/10 bg-blue-950/25 text-white shadow-xl shadow-black/30 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-cyan-300" />
                Your eRoaming Numbers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {numbers.map((number) => {
                const subscription = number.subscription;
                const routing = number.routing;
                const localSettings = numberSettings[number.id] || {
                  autoRenew: Boolean(subscription?.autoRenew ?? true),
                  reminderDays: String(subscription?.reminderDays ?? 3),
                  forwardingType: (routing?.type as ForwardingType) || 'sip',
                  forwardingDestination: routing?.type === 'international' ? routing?.destination || '' : '',
                  cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
                };

                return (
                  <div key={number.id} className="rounded-2xl border border-blue-300/10 bg-slate-950/35 p-4">
                    <div className="grid gap-4 lg:grid-cols-4">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-cyan-50/60">Number</div>
                        <div className="mt-1 font-semibold">{number.msisdn}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-cyan-50/60">Monthly Fee</div>
                        <div className="mt-1 font-semibold">${number.pricing?.monthlyFee || '0.00'}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-cyan-50/60">Subscription</div>
                        <div className="mt-1 font-semibold">{subscription?.packageTerm ? getPackageLabel(subscription.packageTerm) : '1 Month'}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-cyan-50/60">Renewal</div>
                        <div className="mt-1 font-semibold">{subscription?.nextChargeAt ? new Date(subscription.nextChargeAt).toLocaleString() : 'Not scheduled'}</div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-blue-300/10 bg-blue-400/10 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium"><Repeat className="h-4 w-4 text-cyan-300" /> Auto Renew</div>
                        <div className="mt-2 text-lg font-semibold">{subscription?.autoRenew ? 'On' : 'Off'}</div>
                      </div>
                      <div className="rounded-xl border border-blue-300/10 bg-blue-400/10 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium"><CalendarClock className="h-4 w-4 text-cyan-300" /> Active Until</div>
                        <div className="mt-2 text-sm font-semibold">{subscription?.activeUntil ? new Date(subscription.activeUntil).toLocaleString() : 'Not set'}</div>
                      </div>
                      <div className="rounded-xl border border-blue-300/10 bg-blue-400/10 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium"><Route className="h-4 w-4 text-cyan-300" /> Forwarding</div>
                        <div className="mt-2 text-sm font-semibold">{formatForwarding(routing?.type, routing?.destination)}</div>
                      </div>
                      <div className="rounded-xl border border-blue-300/10 bg-blue-400/10 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium"><Phone className="h-4 w-4 text-cyan-300" /> Voice Outbound</div>
                        <div className="mt-2 text-sm font-semibold">${number.billing?.rates.voiceOutbound || number.pricing?.voiceFee || number.pricing?.outboundFee || '0.00'}</div>
                      </div>
                      <div className="rounded-xl border border-blue-300/10 bg-blue-400/10 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium"><Send className="h-4 w-4 text-cyan-300" /> SMS Outbound</div>
                        <div className="mt-2 text-sm font-semibold">${number.billing?.rates.smsOutbound || number.pricing?.smsFee || '0.00'}</div>
                      </div>
                      <div className="rounded-xl border border-blue-300/10 bg-blue-400/10 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium"><Route className="h-4 w-4 text-cyan-300" /> Inbound Price</div>
                        <div className="mt-2 text-sm font-semibold">${number.billing?.rates.smsInbound || number.pricing?.inboundFee || '0.00'}</div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-blue-300/10 bg-slate-950/45 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium"><Settings2 className="h-4 w-4 text-cyan-300" /> Subscription and Forwarding Settings</div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
                        <div className="space-y-2">
                          <Label>Auto Renew</Label>
                          <Button
                            type="button"
                            variant={localSettings.autoRenew ? 'default' : 'outline'}
                            className="h-11 w-full"
                            onClick={() => setNumberSettings((current) => ({
                              ...current,
                              [number.id]: { ...localSettings, autoRenew: !localSettings.autoRenew, cancelAtPeriodEnd: !localSettings.autoRenew ? false : localSettings.cancelAtPeriodEnd },
                            }))}
                          >
                            {localSettings.autoRenew ? 'On' : 'Off'}
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label>Reminder Days</Label>
                          <Input className="h-11 border-blue-300/15 bg-slate-950/70 text-white" value={localSettings.reminderDays} onChange={(e) => setNumberSettings((current) => ({ ...current, [number.id]: { ...localSettings, reminderDays: e.target.value } }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Forward Number To</Label>
                          <select
                            className="flex h-11 w-full rounded-md border border-blue-300/15 bg-slate-950/70 px-3 py-2 text-sm text-white"
                            value={localSettings.forwardingType}
                            onChange={(e) => {
                              const value = e.target.value as ForwardingType;
                              setNumberSettings((current) => ({
                                ...current,
                                [number.id]: {
                                  ...localSettings,
                                  forwardingType: value,
                                  forwardingDestination:
                                    value === 'sip' || value === 'none' || value === 'voicemail'
                                        ? ''
                                        : localSettings.forwardingDestination,
                                },
                              }));
                            }}
                          >
                            <option value="none">No Forwarding</option>
                            <option value="sip">eRoaming Number</option>
                            <option value="international">International Number</option>
                            <option value="voicemail">Voice Mail</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex min-h-5 items-center justify-between gap-2">
                            <Label>Destination</Label>
                            {localSettings.forwardingType !== 'sip' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 border-cyan-300/30 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/20"
                                onClick={() => useEroamingForNumber(number.id, localSettings)}
                              >
                                eRoaming
                              </Button>
                            )}
                          </div>
                          <Input
                            className="h-11 border-blue-300/15 bg-slate-950/70 text-white placeholder:text-slate-500 disabled:opacity-60"
                            value={localSettings.forwardingDestination}
                            onChange={(e) => setNumberSettings((current) => ({ ...current, [number.id]: { ...localSettings, forwardingDestination: e.target.value } }))}
                            placeholder={
                              localSettings.forwardingType === 'international'
                                ? '+12025550199'
                                : localSettings.forwardingType === 'sip'
                                  ? 'Automatic eRoaming SIP account'
                                  : ''
                            }
                            disabled={localSettings.forwardingType !== 'international'}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cancel Renewal</Label>
                          <Button
                            type="button"
                            variant={localSettings.cancelAtPeriodEnd ? 'destructive' : 'outline'}
                            className="h-11 w-full"
                            onClick={() => setNumberSettings((current) => ({
                              ...current,
                              [number.id]: { ...localSettings, cancelAtPeriodEnd: !localSettings.cancelAtPeriodEnd, autoRenew: !localSettings.cancelAtPeriodEnd ? false : localSettings.autoRenew },
                            }))}
                          >
                            {localSettings.cancelAtPeriodEnd ? 'Will cancel' : 'Keep active'}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          onClick={() => {
                            setEditingNumberId(number.id);
                            updateNumberMutation.mutate({
                              id: number.id,
                              settings: localSettings,
                            });
                          }}
                          disabled={updateNumberMutation.isPending && editingNumberId === number.id}
                        >
                          {updateNumberMutation.isPending && editingNumberId === number.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Save Number Settings
                        </Button>
                      </div>
                      <p className="mt-3 text-xs text-cyan-50/70">
                        Cancel renewal stops the next charge, but the number stays usable until the active-until date expires.
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-blue-300/10 bg-blue-950/25 text-white shadow-xl shadow-black/30 backdrop-blur">
            <CardHeader>
              <CardTitle>Dial Pad</CardTitle>
              <CardDescription className="text-cyan-50/75">Start an eRoaming voice session from your active eRoaming number</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[1fr_260px]">
              <div className="space-y-3">
                <Label htmlFor="dial-number">Call Number</Label>
                <Input
                  id="dial-number"
                  value={dialNumber}
                  onChange={(e) => setDialNumber(e.target.value)}
                  placeholder="+15551234567"
                  className="h-12 border-blue-300/15 bg-slate-950/70 text-lg text-white placeholder:text-slate-500"
                />
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '0', '#'].map((digit) => (
                    <Button
                      key={digit}
                      type="button"
                      variant="outline"
                      className="h-12 border-blue-300/15 bg-slate-950/50 text-lg text-white hover:bg-blue-500/20 hover:text-white"
                      onClick={() => appendDialDigit(digit)}
                    >
                      {digit}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-blue-500 text-white hover:bg-blue-400"
                    onClick={() => voiceMutation.mutate()}
                    disabled={voiceMutation.isPending || !canStartCall || !dialNumber.trim()}
                  >
                    {voiceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PhoneCall className="mr-2 h-4 w-4" />}
                    Call
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-blue-300/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    onClick={() => setDialNumber((current) => current.slice(0, -1))}
                  >
                    Delete
                  </Button>
                </div>
                {!canStartCall && (
                  <p className="text-sm text-red-300">Add wallet balance before starting an eRoaming call.</p>
                )}
              </div>
              <div className="rounded-2xl border border-blue-300/10 bg-slate-950/45 p-4">
                <div className="text-xs uppercase tracking-wide text-cyan-50/60">Calling from</div>
                <div className="mt-2 text-lg font-semibold">{primaryNumber?.msisdn || 'No active eRoaming'}</div>
                <div className="mt-4 text-xs uppercase tracking-wide text-cyan-50/60">Voice rate</div>
                <div className="mt-2 text-lg font-semibold">${activeBilling?.rates.voiceOutbound || '0.00'}</div>
                <div className="mt-4 text-xs uppercase tracking-wide text-cyan-50/60">Call status</div>
                <div className="mt-2 text-sm font-semibold">{callStatus}</div>
                {!hasNativeVoiceBridge() && (
                  <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-400/10 p-3 text-xs text-amber-100">
                    Browser preview cannot place live eRoaming calls. Open this feature in the Android or iOS app so the native voice engine can start the call.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-300/10 bg-blue-950/25 text-white shadow-xl shadow-black/30 backdrop-blur">
            <CardHeader>
              <CardTitle>Send SMS</CardTitle>
              <CardDescription className="text-cyan-50/75">Send SMS from your assigned eRoaming Number</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="send-to">Recipient Number</Label>
                <Input id="send-to" value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="+15551234567" className="border-blue-300/15 bg-slate-950/70 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sms-text">Message</Label>
                <Textarea id="sms-text" value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={4} className="border-blue-300/15 bg-slate-950/70 text-white placeholder:text-slate-500" />
              </div>
              <div>
                <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || !canSendSms}>
                  {sendMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send SMS
                    </>
                  )}
                </Button>
                {!canSendSms && (
                  <p className="mt-2 text-sm text-destructive">
                    Add wallet balance before sending SMS. Required for next SMS: ${smsRequiredAmount}.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-300/10 bg-blue-950/25 text-white shadow-xl shadow-black/30 backdrop-blur">
            <CardHeader>
              <CardTitle>SMS History</CardTitle>
              <CardDescription className="text-cyan-50/75">Inbound and outbound messages linked to your eRoaming Number</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.messages.length === 0 ? (
                <p className="text-sm text-cyan-50/70">No SMS messages yet.</p>
              ) : (
                data.messages.map((message) => (
                  <div key={message.id} className="rounded-lg border border-blue-300/10 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-medium capitalize">{message.direction}</span>
                      <span className="text-cyan-50/60">{new Date(message.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="mt-2 text-sm text-cyan-50/60">
                      {message.direction === 'inbound' ? `From ${message.fromNumber}` : `To ${message.toNumber}`}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{message.text}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
