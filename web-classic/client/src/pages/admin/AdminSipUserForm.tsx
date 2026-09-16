import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Phone, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

type Mode = 'create' | 'edit';
type SipStatus = 'active' | 'inactive' | 'suspended';
type SipProvider = 'external_sip' | 'custom_sip' | 'freepbx' | 'astpp' | 'local';
type SipTransport = 'udp' | 'tcp' | 'tls';
type BillingMode = 'free' | 'paid';
type SipUserCreateMode = 'new' | 'existing';
type SipCredentialMode = 'auto' | 'manual';

type UserOption = {
  id: string;
  displayUserId?: number | null;
  email: string;
  name?: string | null;
  phone?: string | null;
};

type Tariff = {
  id: string;
  name: string;
  tariffType: 'internal' | 'international';
  currency: string;
  ratePerMinute: string;
};

type RegistrationProfile = {
  id: string;
  name: string;
  isDefault: boolean;
  metadata: Record<string, any>;
};

type AvailableNumber = {
  id: string;
  msisdn: string;
  countryCode: string;
  provider: string;
};

type ConciergeOverview = {
  settings: Record<string, string>;
};

type SipProviderOption = {
  value: string;
  label: string;
  description: string;
  providerType: string;
  domain: string;
  transport: string;
  port: string;
  outboundProxy: string;
  status: string;
};

type SipAccountPayload = {
  account: Partial<FormState> & {
    id: string;
    userId: string;
    username: string;
    password: string;
    domain: string;
    uri: string;
    status: SipStatus;
    provider: SipProvider;
    transport: SipTransport;
    port?: number | null;
    outboundProxy?: string | null;
    allocatedMsisdn?: string;
    user: UserOption;
  };
};

type FormState = {
  userId: string;
  sipUserCreateMode: SipUserCreateMode;
  sipCredentialMode: SipCredentialMode;
  registrationProfileId: string;
  autoProvision: boolean;
  username: string;
  password: string;
  domain: string;
  uri: string;
  status: SipStatus;
  provider: SipProvider;
  sipProviderId: string;
  transport: SipTransport;
  port: string;
  outboundProxy: string;
  allowInternalCalls: boolean;
  internalBillingMode: BillingMode;
  internalTariffId: string;
  allowInternationalCalls: boolean;
  internationalTariffId: string;
  voicemailEnabled: boolean;
  pbxEnabled: boolean;
  callForwardEnabled: boolean;
  doNotDisturbEnabled: boolean;
  callbackEnabled: boolean;
  conferenceCallEnabled: boolean;
  clearEnabled: boolean;
  callerIdEnabled: boolean;
  callRecordingEnabled: boolean;
  ringGroupEnabled: boolean;
  chatEnabled: boolean;
  traceMeEnabled: boolean;
  faxEnabled: boolean;
  allocatedNumberId: string;
  allocatedMsisdn: string;
  receiveInternationalCalls: boolean;
  receiveInternationalBillingMode: BillingMode;
  receiveInternationalTariffId: string;
};

const initialForm: FormState = {
  userId: '',
  sipUserCreateMode: 'new',
  sipCredentialMode: 'auto',
  registrationProfileId: '',
  autoProvision: true,
  username: '',
  password: '',
  domain: '',
  uri: '',
  status: 'active',
  provider: 'external_sip',
  sipProviderId: '',
  transport: 'udp',
  port: '',
  outboundProxy: '',
  allowInternalCalls: true,
  internalBillingMode: 'free',
  internalTariffId: '',
  allowInternationalCalls: true,
  internationalTariffId: '',
  voicemailEnabled: false,
  pbxEnabled: false,
  callForwardEnabled: false,
  doNotDisturbEnabled: false,
  callbackEnabled: false,
  conferenceCallEnabled: false,
  clearEnabled: true,
  callerIdEnabled: false,
  callRecordingEnabled: false,
  ringGroupEnabled: false,
  chatEnabled: false,
  traceMeEnabled: false,
  faxEnabled: false,
  allocatedNumberId: '',
  allocatedMsisdn: '',
  receiveInternationalCalls: false,
  receiveInternationalBillingMode: 'free',
  receiveInternationalTariffId: '',
};

const inputClass =
  'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500';
const selectClass = 'border-slate-300 bg-white text-slate-900 focus:ring-teal-500';
const selectContentClass = 'border-slate-200 bg-white text-slate-900 shadow-lg';
const selectItemClass =
  'text-slate-900 focus:bg-teal-100 focus:text-slate-950 data-[highlighted]:bg-teal-100 data-[highlighted]:text-slate-950 data-[state=checked]:bg-teal-600 data-[state=checked]:text-white [&_svg]:text-current';
const primaryButtonClass = 'gap-2 bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]';
const outlineButtonClass =
  'gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';

const userFeatureModules = [
  { key: 'voicemailEnabled', label: 'Voicemail' },
  { key: 'pbxEnabled', label: 'PBX' },
  { key: 'callForwardEnabled', label: 'Call Forward' },
  { key: 'doNotDisturbEnabled', label: 'Do Not Disturb' },
  { key: 'callbackEnabled', label: 'Callback' },
  { key: 'conferenceCallEnabled', label: 'Conference Call' },
  { key: 'clearEnabled', label: 'Clear / Hide Caller ID' },
  { key: 'callerIdEnabled', label: 'Caller ID' },
  { key: 'callRecordingEnabled', label: 'Call Recording' },
  { key: 'ringGroupEnabled', label: 'Ring Group' },
  { key: 'chatEnabled', label: 'Chat' },
  { key: 'traceMeEnabled', label: 'Trace Me' },
  { key: 'faxEnabled', label: 'Fax' },
] as const;

function parseError(error: Error) {
  return error.message.replace(/^\d+:\s*/, '');
}

async function unwrap<T>(response: Response): Promise<T> {
  const payload = await response.json();
  return (payload?.data ?? payload) as T;
}

function displayUser(user: UserOption) {
  const uid = user.displayUserId ? `UID${String(user.displayUserId).padStart(3, '0')}` : user.id.slice(0, 8);
  return `${user.name || user.email} (${uid})`;
}

function selectValue(value: string) {
  return value || 'none';
}

function apiValue(value: string) {
  return value === 'none' ? '' : value;
}

function parseCustomProviderOptions(settings: Record<string, string>): SipProviderOption[] {
  const raw = settings.sip_route_providers || settings.sip_providers || '';
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((provider: any) => ({
        value: String(provider.id || provider.value || provider.key || '').trim(),
        label: String(provider.label || provider.name || provider.id || '').trim(),
        description: String(provider.description || provider.domain || provider.host || 'Custom SIP Provider').trim(),
        providerType: String(provider.type || 'custom_sip').trim(),
        domain: String(provider.domain || provider.host || '').trim(),
        transport: String(provider.transport || '').trim(),
        port: String(provider.port || '').trim(),
        outboundProxy: String(provider.outboundProxy || provider.outbound_proxy || '').trim(),
        status: String(provider.status || 'active').trim(),
      }))
      .filter((provider) => provider.value && provider.label);
  } catch {
    return [];
  }
}

function buildSipProviderOptions(settings: Record<string, string>): SipProviderOption[] {
  const activeProvider = settings.sip_provisioning_provider || 'freepbx';
  const freePbxDomain = settings.freepbx_sip_domain || settings.linphone_sip_domain || settings.user_sip_domain || '';
  const astppDomain = settings.astpp_sip_domain || settings.user_sip_domain || '';
  const options: SipProviderOption[] = [
    {
      value: 'freepbx',
      label: 'FreePBX / Asterisk',
      description: freePbxDomain ? `Domain: ${freePbxDomain}` : 'Configured In SIP Configuration',
      providerType: 'freepbx',
      domain: freePbxDomain,
      transport: settings.freepbx_sip_transport || settings.user_sip_transport || settings.linphone_sip_transport || '',
      port: settings.linphone_sip_port || settings.user_sip_port || '',
      outboundProxy: settings.linphone_sip_outbound_proxy || '',
      status: settings.freepbx_status || (settings.freepbx_enabled === 'false' ? 'inactive' : 'active'),
    },
    {
      value: 'astpp',
      label: 'ASTPP Community',
      description: astppDomain ? `Domain: ${astppDomain}` : settings.astpp_api_url ? `API: ${settings.astpp_api_url}` : 'Configured In SIP Configuration',
      providerType: 'astpp',
      domain: astppDomain,
      transport: settings.astpp_sip_transport || settings.user_sip_transport || '',
      port: settings.astpp_sip_port || settings.user_sip_port || '',
      outboundProxy: settings.astpp_outbound_proxy || '',
      status: settings.astpp_status || (settings.astpp_enabled === 'true' || activeProvider === 'astpp' ? 'active' : 'inactive'),
    },
    {
      value: 'local',
      label: 'Local SIP',
      description: 'Use Platform Internal SIP Routing',
      providerType: 'local',
      domain: settings.user_sip_domain || freePbxDomain || astppDomain,
      transport: settings.user_sip_transport || '',
      port: settings.user_sip_port || '',
      outboundProxy: '',
      status: 'active',
    },
    ...parseCustomProviderOptions(settings),
  ];

  const unique = new Map<string, SipProviderOption>();
  options.forEach((provider) => {
    if (!unique.has(provider.value)) unique.set(provider.value, provider);
  });

  return Array.from(unique.values()).sort((a, b) => {
    if (a.value === activeProvider) return -1;
    if (b.value === activeProvider) return 1;
    if (a.value === 'local') return 1;
    if (b.value === 'local') return -1;
    return a.label.localeCompare(b.label);
  });
}

function normalizeSipProvider(value: string): SipProvider {
  if (value === 'freepbx' || value === 'astpp' || value === 'local' || value === 'external_sip' || value === 'custom_sip') {
    return value;
  }
  return 'custom_sip';
}

function normalizeSipTransport(value: string): SipTransport {
  const normalized = value.toLowerCase();
  if (normalized.includes('tls')) return 'tls';
  if (normalized.includes('tcp')) return 'tcp';
  return 'udp';
}

function defaultPort(transport: SipTransport) {
  return transport === 'tls' ? '5061' : '5060';
}

export default function AdminSipUserForm({ mode, accountId }: { mode: Mode; accountId?: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [userSearch, setUserSearch] = useState('');
  const [form, setForm] = useState<FormState>(initialForm);

  const isEdit = mode === 'edit';

  const accountQuery = useQuery<SipAccountPayload>({
    queryKey: [`/api/admin/sip-users/${accountId}`],
    enabled: isEdit && Boolean(accountId),
  });

  const userOptionsQuery = useQuery<{ users: UserOption[] }>({
    queryKey: ['/api/admin/sip-users/users', { search: userSearch || undefined, availableOnly: true, limit: 80 }],
    enabled: !isEdit,
  });

  const internalTariffsQuery = useQuery<{ data: Tariff[] }>({
    queryKey: ['/api/admin/sip-tariffs', { tariffType: 'internal', kind: 'internal_tariff', limit: 5000 }],
  });
  const internationalTariffsQuery = useQuery<{ data: Tariff[] }>({
    queryKey: ['/api/admin/sip-tariffs', { tariffType: 'international', kind: 'origination_tariff', limit: 5000 }],
  });
  const profilesQuery = useQuery<{ data: RegistrationProfile[] }>({ queryKey: ['/api/admin/sip-registration-profiles'] });
  const numbersQuery = useQuery<{ numbers: AvailableNumber[] }>({
    queryKey: ['/api/admin/sip-users/available-numbers', { limit: 200 }],
  });
  const sipSettingsQuery = useQuery<ConciergeOverview>({
    queryKey: ['/api/admin/concierge/overview'],
  });

  const profiles = profilesQuery.data?.data || [];
  const internalTariffs = internalTariffsQuery.data?.data || [];
  const internationalTariffs = internationalTariffsQuery.data?.data || [];
  const numbers = numbersQuery.data?.numbers || [];
  const sipProviderOptions = useMemo(
    () => buildSipProviderOptions(sipSettingsQuery.data?.settings || {}),
    [sipSettingsQuery.data?.settings],
  );
  const selectedSipProvider = sipProviderOptions.find((provider) => provider.value === form.sipProviderId);

  useEffect(() => {
    const account = accountQuery.data?.account;
    if (!account) return;
    setForm({
      ...initialForm,
      userId: account.userId,
      sipUserCreateMode: 'existing',
      sipCredentialMode: 'manual',
      registrationProfileId: account.registrationProfileId || '',
      autoProvision: false,
      username: account.username || '',
      password: account.password || '',
      domain: account.domain || '',
      uri: account.uri || '',
      status: account.status || 'active',
      provider: account.provider || 'external_sip',
      sipProviderId: account.sipProviderId || account.provider || '',
      transport: account.transport || 'udp',
      port: account.port ? String(account.port) : '',
      outboundProxy: account.outboundProxy || '',
      allowInternalCalls: account.allowInternalCalls !== false,
      internalBillingMode: account.internalBillingMode || 'free',
      internalTariffId: account.internalTariffId || '',
      allowInternationalCalls: account.allowInternationalCalls !== false,
      internationalTariffId: account.internationalTariffId || '',
      voicemailEnabled: account.voicemailEnabled === true,
      pbxEnabled: account.pbxEnabled === true,
      callForwardEnabled: account.callForwardEnabled === true,
      doNotDisturbEnabled: account.doNotDisturbEnabled === true,
      callbackEnabled: account.callbackEnabled === true,
      conferenceCallEnabled: account.conferenceCallEnabled === true,
      clearEnabled: account.clearEnabled !== false,
      callerIdEnabled: account.callerIdEnabled === true,
      callRecordingEnabled: account.callRecordingEnabled === true,
      ringGroupEnabled: account.ringGroupEnabled === true,
      chatEnabled: account.chatEnabled === true,
      traceMeEnabled: account.traceMeEnabled === true,
      faxEnabled: account.faxEnabled === true,
      allocatedNumberId: account.allocatedNumberId || '',
      allocatedMsisdn: account.allocatedMsisdn || '',
      receiveInternationalCalls: account.receiveInternationalCalls === true,
      receiveInternationalBillingMode: account.receiveInternationalBillingMode || 'free',
      receiveInternationalTariffId: account.receiveInternationalTariffId || '',
    });
  }, [accountQuery.data?.account]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === form.registrationProfileId),
    [profiles, form.registrationProfileId],
  );

  const applyProfile = (profileId: string) => {
    const id = apiValue(profileId);
    const profile = profiles.find((item) => item.id === id);
    const metadata = profile?.metadata || {};
    setForm((current) => ({
      ...current,
      registrationProfileId: id,
      allowInternalCalls: metadata.allowInternalCalls ?? current.allowInternalCalls,
      internalBillingMode: metadata.internalBillingMode || current.internalBillingMode,
      internalTariffId: metadata.internalTariffId || current.internalTariffId,
      allowInternationalCalls: metadata.allowInternationalCalls ?? current.allowInternationalCalls,
      internationalTariffId: metadata.internationalTariffId || current.internationalTariffId,
      ...userFeatureModules.reduce(
        (next, module) => ({
          ...next,
          [module.key]: metadata[module.key] ?? current[module.key],
        }),
        {} as Pick<FormState, (typeof userFeatureModules)[number]['key']>,
      ),
      receiveInternationalCalls: metadata.receiveInternationalCalls ?? current.receiveInternationalCalls,
      receiveInternationalBillingMode: metadata.receiveInternationalBillingMode || current.receiveInternationalBillingMode,
      receiveInternationalTariffId: metadata.receiveInternationalTariffId || current.receiveInternationalTariffId,
    }));
  };

  const setSipUserCreateMode = (sipUserCreateMode: SipUserCreateMode) => {
    setForm((current) => {
      const sipCredentialMode: SipCredentialMode = sipUserCreateMode === 'new' ? current.sipCredentialMode : 'manual';
      return {
        ...current,
        sipUserCreateMode,
        sipCredentialMode,
        autoProvision: sipUserCreateMode === 'new' && sipCredentialMode === 'auto',
      };
    });
  };

  const setSipCredentialMode = (sipCredentialMode: SipCredentialMode) => {
    setForm((current) => ({
      ...current,
      sipCredentialMode,
      autoProvision: current.sipUserCreateMode === 'new' && sipCredentialMode === 'auto',
    }));
  };

  const applySipProvider = (providerId: string) => {
    const id = apiValue(providerId);
    const selected = sipProviderOptions.find((provider) => provider.value === id);
    setForm((current) => {
      const transport = selected?.transport ? normalizeSipTransport(selected.transport) : current.transport;
      return {
        ...current,
        sipProviderId: id,
        provider: selected ? normalizeSipProvider(selected.providerType || selected.value) : current.provider,
        domain: selected?.domain || current.domain,
        transport,
        port: selected?.port || current.port || defaultPort(transport),
        outboundProxy: selected?.outboundProxy || current.outboundProxy,
      };
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,
        registrationProfileId: apiValue(form.registrationProfileId),
        sipProviderId: apiValue(form.sipProviderId),
        internalTariffId: apiValue(form.internalTariffId),
        internationalTariffId: apiValue(form.internationalTariffId),
        allocatedNumberId: apiValue(form.allocatedNumberId),
        receiveInternationalTariffId: apiValue(form.receiveInternationalTariffId),
        port: form.port || undefined,
        username: form.autoProvision ? undefined : form.username,
        password: form.autoProvision ? undefined : form.password,
        domain: form.autoProvision ? undefined : form.domain,
        uri: form.autoProvision ? undefined : form.uri,
      };
      const response = isEdit
        ? await apiRequest('PATCH', `/api/admin/sip-users/${accountId}`, body)
        : await apiRequest('POST', '/api/admin/sip-users', body);
      return unwrap(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/sip-users'] });
      toast({
        title: isEdit ? 'SIP User Updated' : 'SIP User Created',
        description: isEdit ? 'The SIP User Settings Were Saved.' : 'The SIP User Was Created Successfully.',
      });
      navigate('/admin/sip-users');
    },
    onError: (error: Error) => {
      toast({ title: isEdit ? 'Update Failed' : 'Create Failed', description: parseError(error), variant: 'destructive' });
    },
  });

  const submitDisabled = saveMutation.isPending || (!isEdit && !form.userId) || (!form.autoProvision && (!form.password || !form.domain || (!form.username && !form.allocatedNumberId)));

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            <Phone className="h-8 w-8 text-cyan-300" />
            {isEdit ? 'Edit SIP User' : 'Create SIP User'}
          </h1>
          <p className="mt-2 text-slate-400">Configure SIP Credentials, DID Allocation, And Calling Permissions.</p>
        </div>
        <Button asChild variant="outline" className={outlineButtonClass}>
          <Link href="/admin/sip-users">
            <ArrowLeft className="h-4 w-4" />
            Back To SIP Users
          </Link>
        </Button>
      </div>

      {accountQuery.isLoading ? (
        <Card className="border-slate-200 bg-white text-slate-950">
          <CardContent className="py-10 text-center text-slate-500">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            Loading SIP User...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="space-y-6">
            <Card className="border-slate-200 bg-white text-slate-950 shadow-sm">
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEdit && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <SelectField label="Create User" value={form.sipUserCreateMode} onChange={(value) => setSipUserCreateMode(value as SipUserCreateMode)}>
                        <SelectItem className={selectItemClass} value="new">New</SelectItem>
                        <SelectItem className={selectItemClass} value="existing">Existing</SelectItem>
                      </SelectField>
                      {form.sipUserCreateMode === 'new' && (
                        <SelectField label="SIP Credentials" value={form.sipCredentialMode} onChange={(value) => setSipCredentialMode(value as SipCredentialMode)}>
                          <SelectItem className={selectItemClass} value="auto">Auto Generate</SelectItem>
                          <SelectItem className={selectItemClass} value="manual">Manual</SelectItem>
                        </SelectField>
                      )}
                      <div className="space-y-2">
                        <Label>Search Platform User</Label>
                        <Input className={inputClass} value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Email, Name, Phone" />
                      </div>
                      <div className="space-y-2">
                        <Label>Platform User</Label>
                        <Select value={selectValue(form.userId)} onValueChange={(userId) => setForm((current) => ({ ...current, userId: apiValue(userId) }))}>
                          <SelectTrigger className={selectClass}>
                            <SelectValue placeholder="Select User" />
                          </SelectTrigger>
                          <SelectContent className={selectContentClass}>
                            <SelectItem className={selectItemClass} value="none">Select User</SelectItem>
                            {(userOptionsQuery.data?.users || []).map((user) => (
                              <SelectItem className={selectItemClass} key={user.id} value={user.id}>
                                {displayUser(user)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-slate-600">
                      {form.autoProvision
                        ? 'Auto Generate Will Create The SIP Username And Password From The Current SIP Provider Configuration When You Save.'
                        : 'Manual Or Existing Means You Enter The SIP Username, Password, And Domain Below.'}
                    </p>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SelectField label="Registration Profile" value={selectValue(form.registrationProfileId)} onChange={applyProfile}>
                    <SelectItem className={selectItemClass} value="none">No Profile</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem className={selectItemClass} key={profile.id} value={profile.id}>
                        {profile.name}{profile.isDefault ? ' (Default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectField>
                  <SelectField label="Status" value={form.status} onChange={(status) => setForm((current) => ({ ...current, status: status as SipStatus }))}>
                    <SelectItem className={selectItemClass} value="active">Active</SelectItem>
                    <SelectItem className={selectItemClass} value="inactive">Inactive</SelectItem>
                    <SelectItem className={selectItemClass} value="suspended">Suspended</SelectItem>
                  </SelectField>
                </div>

                {!form.autoProvision && (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SelectField label="SIP Provider" value={selectValue(form.sipProviderId)} onChange={applySipProvider}>
                      <SelectItem className={selectItemClass} value="none">Select SIP Provider</SelectItem>
                      {sipSettingsQuery.isLoading ? (
                        <SelectItem className={selectItemClass} value="loading" disabled>Loading SIP Provider's...</SelectItem>
                      ) : sipProviderOptions.length === 0 ? (
                        <SelectItem className={selectItemClass} value="empty" disabled>No SIP Provider Found</SelectItem>
                      ) : sipProviderOptions.map((provider) => (
                        <SelectItem className={selectItemClass} key={provider.value} value={provider.value}>
                          {provider.label}{provider.status === 'offline' || provider.status === 'inactive' ? ' (Inactive)' : ''}
                        </SelectItem>
                      ))}
                    </SelectField>
                    {selectedSipProvider && (
                      <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-slate-600 md:self-end">
                        {selectedSipProvider.description}
                      </div>
                    )}
                    <Field label="SIP Username" value={form.username} onChange={(username) => setForm((current) => ({ ...current, username }))} placeholder="Use DID If Number Is Allocated" />
                    <Field label="SIP Password" value={form.password} onChange={(password) => setForm((current) => ({ ...current, password }))} />
                    <Field label="SIP Domain" value={form.domain} onChange={(domain) => setForm((current) => ({ ...current, domain }))} placeholder="sip.example.com" />
                    <Field label="SIP URI" value={form.uri} onChange={(uri) => setForm((current) => ({ ...current, uri }))} placeholder="sip:10000003@sip.example.com" />
                    <SelectField label="Provider Type" value={form.provider} onChange={(provider) => setForm((current) => ({ ...current, provider: provider as SipProvider }))}>
                      <SelectItem className={selectItemClass} value="external_sip">External SIP</SelectItem>
                      <SelectItem className={selectItemClass} value="custom_sip">Custom SIP</SelectItem>
                      <SelectItem className={selectItemClass} value="freepbx">FreePBX</SelectItem>
                      <SelectItem className={selectItemClass} value="astpp">ASTPP</SelectItem>
                      <SelectItem className={selectItemClass} value="local">Local</SelectItem>
                    </SelectField>
                    <SelectField label="Transport" value={form.transport} onChange={(transport) => setForm((current) => ({ ...current, transport: transport as SipTransport }))}>
                      <SelectItem className={selectItemClass} value="udp">UDP</SelectItem>
                      <SelectItem className={selectItemClass} value="tcp">TCP</SelectItem>
                      <SelectItem className={selectItemClass} value="tls">TLS</SelectItem>
                    </SelectField>
                    <Field label="Port" value={form.port} onChange={(port) => setForm((current) => ({ ...current, port }))} placeholder="5060" />
                    <Field label="Outbound Proxy" value={form.outboundProxy} onChange={(outboundProxy) => setForm((current) => ({ ...current, outboundProxy }))} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white text-slate-950 shadow-sm">
              <CardHeader>
                <CardTitle>Call Permissions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SwitchRow label="Internal Calls" description="Allow Internal SIP To SIP User Calls." checked={form.allowInternalCalls} onChange={(allowInternalCalls) => setForm((current) => ({ ...current, allowInternalCalls }))} />
                {form.allowInternalCalls && (
                  <>
                    <BillingSelect label="Internal Call Billing" value={form.internalBillingMode} onChange={(internalBillingMode) => setForm((current) => ({ ...current, internalBillingMode }))} />
                    <TariffSelect
                      label="Internal Tariff"
                      value={form.internalTariffId}
                      tariffs={internalTariffs}
                      loading={internalTariffsQuery.isLoading}
                      emptyLabel="No Internal Tariff Found"
                      onChange={(internalTariffId) => setForm((current) => ({ ...current, internalTariffId }))}
                    />
                  </>
                )}

                <SwitchRow label="International Calls" description="Allow Outgoing Calls To International Numbers." checked={form.allowInternationalCalls} onChange={(allowInternationalCalls) => setForm((current) => ({ ...current, allowInternationalCalls }))} />
                {form.allowInternationalCalls && (
                  <TariffSelect
                    label="International Tariff"
                    value={form.internationalTariffId}
                    tariffs={internationalTariffs}
                    loading={internationalTariffsQuery.isLoading}
                    emptyLabel="No International Tariff Found"
                    onChange={(internationalTariffId) => setForm((current) => ({ ...current, internationalTariffId }))}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white text-slate-950 shadow-sm">
              <CardHeader>
                <CardTitle>User Feature Modules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-slate-600">
                  Enable The Modules This SIP User Is Allowed To Use. The Selected Registration Profile Still Controls Free, Paid, Trial, And Extra Charge Rules.
                </p>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {userFeatureModules.map((module) => (
                    <SwitchRow
                      key={module.key}
                      label={module.label}
                      checked={Boolean(form[module.key])}
                      onChange={(enabled) => setForm((current) => ({ ...current, [module.key]: enabled }))}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200 bg-white text-slate-950 shadow-sm">
              <CardHeader>
                <CardTitle>DID Allocation</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SelectField label="Allocate Number" value={selectValue(form.allocatedNumberId)} onChange={(allocatedNumberId) => setForm((current) => ({ ...current, allocatedNumberId: apiValue(allocatedNumberId) }))}>
                  <SelectItem className={selectItemClass} value="none">No DID Number</SelectItem>
                  {form.allocatedNumberId && form.allocatedMsisdn && (
                    <SelectItem className={selectItemClass} value={form.allocatedNumberId}>
                      {form.allocatedMsisdn} (Current)
                    </SelectItem>
                  )}
                  {numbers.map((number) => (
                    <SelectItem className={selectItemClass} key={number.id} value={number.id}>
                      {number.msisdn} / {number.countryCode}
                    </SelectItem>
                  ))}
                </SelectField>
                <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 md:col-span-2">
                  When A DID Is Allocated, The SIP Username Will Become The DID Number So The User Can Receive Inbound Calls.
                </p>
                <SwitchRow label="Receive International Calls" description="Allow Calls To The Assigned DID Number." checked={form.receiveInternationalCalls} onChange={(receiveInternationalCalls) => setForm((current) => ({ ...current, receiveInternationalCalls }))} />
                {form.receiveInternationalCalls && (
                  <>
                    <BillingSelect label="Receive International Billing" value={form.receiveInternationalBillingMode} onChange={(receiveInternationalBillingMode) => setForm((current) => ({ ...current, receiveInternationalBillingMode }))} />
                    {form.receiveInternationalBillingMode === 'paid' && (
                      <TariffSelect
                        label="Receive International Tariff"
                        value={form.receiveInternationalTariffId}
                        tariffs={internationalTariffs}
                        loading={internationalTariffsQuery.isLoading}
                        emptyLabel="No International Tariff Found"
                        onChange={(receiveInternationalTariffId) => setForm((current) => ({ ...current, receiveInternationalTariffId }))}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {selectedProfile && (
              <Card className="border-teal-200 bg-teal-50 text-slate-950 shadow-sm">
                <CardContent className="space-y-1 p-4 text-sm">
                  <p className="font-semibold">Selected Profile: {selectedProfile.name}</p>
                  <p className="text-slate-600">Profile Defaults Are Applied When Selected, Then You Can Override This SIP User Manually.</p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-3">
              <Button asChild variant="outline" className={outlineButtonClass}>
                <Link href="/admin/sip-users">Cancel</Link>
              </Button>
              <Button className={primaryButtonClass} disabled={submitDisabled} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save SIP User
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={selectClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={selectContentClass}>{children}</SelectContent>
      </Select>
    </div>
  );
}

function BillingSelect({ label, value, onChange }: { label: string; value: BillingMode; onChange: (value: BillingMode) => void }) {
  return (
    <SelectField label={label} value={value} onChange={(nextValue) => onChange(nextValue as BillingMode)}>
      <SelectItem className={selectItemClass} value="free">Free</SelectItem>
      <SelectItem className={selectItemClass} value="paid">Paid</SelectItem>
    </SelectField>
  );
}

function TariffSelect({
  label,
  value,
  tariffs,
  loading = false,
  emptyLabel = 'No Tariff Found',
  onChange,
}: {
  label: string;
  value: string;
  tariffs: Tariff[];
  loading?: boolean;
  emptyLabel?: string;
  onChange: (value: string) => void;
}) {
  return (
    <SelectField label={label} value={selectValue(value)} onChange={(nextValue) => onChange(apiValue(nextValue))}>
      <SelectItem className={selectItemClass} value="none">No Tariff</SelectItem>
      {loading ? (
        <SelectItem className={selectItemClass} value="loading" disabled>Loading Tariff's...</SelectItem>
      ) : tariffs.length === 0 ? (
        <SelectItem className={selectItemClass} value="empty" disabled>{emptyLabel}</SelectItem>
      ) : tariffs.map((tariff) => (
        <SelectItem className={selectItemClass} key={tariff.id} value={tariff.id}>
          {tariff.name} / {tariff.currency} {tariff.ratePerMinute} Per Minute
        </SelectItem>
      ))}
    </SelectField>
  );
}

function SwitchRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div>
        <Label>{label}</Label>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
