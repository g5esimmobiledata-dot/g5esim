import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

type Mode = 'create' | 'edit';
type BillingMode = 'free' | 'paid';

type Tariff = {
  id: string;
  name: string;
  tariffType: 'internal' | 'international';
  currency: string;
  ratePerMinute: string;
  metadata?: Record<string, any>;
};

type ProfileInfo = {
  name: string;
  description: string;
  status: 'active' | 'inactive';
  isDefault: boolean;
};

type FeatureState = Record<string, any> & {
  allowInternalCalls: boolean;
  internalTariffType: 'internal';
  internalBillingMode: BillingMode;
  internalTariffId: string;
  allowInternationalCalls: boolean;
  internationalTariffType: 'international';
  internationalTariffId: string;
};

const initialInfo: ProfileInfo = {
  name: '',
  description: '',
  status: 'active',
  isDefault: false,
};

const paidFeaturePrefixes = [
  'profile',
  'sip',
  'did',
  'internal',
  'international',
  'receiveInternational',
  'voicemail',
  'pbx',
  'callForward',
  'doNotDisturb',
  'callback',
  'conferenceCall',
  'clear',
  'callerId',
  'callRecording',
  'ringGroup',
  'chat',
  'traceMe',
  'fax',
] as const;

function defaultTrialFeatures() {
  return paidFeaturePrefixes.reduce(
    (settings, prefix) => {
      settings[`${prefix}TrialEnabled`] = false;
      settings[`${prefix}TrialDays`] = '7';
      return settings;
    },
    {} as Record<string, boolean | string>,
  );
}

const initialFeatures: FeatureState = {
  ...defaultTrialFeatures(),
  allowInternalCalls: true,
  internalTariffType: 'internal',
  internalBillingMode: 'free',
  internalTariffId: '',
  internalSetupFee: '0.00',
  internalMonthlyFee: '0.00',
  internalExtraChargeFixed: '0.00',
  internalExtraChargePercent: '0',
  internalCallsWebEnabled: true,
  internalCallsMobileEnabled: true,
  allowInternationalCalls: true,
  internationalTariffType: 'international',
  internationalBillingMode: 'free',
  internationalTariffId: '',
  internationalSetupFee: '0.00',
  internationalMonthlyFee: '0.00',
  internationalExtraChargeFixed: '0.00',
  internationalExtraChargePercent: '0',
  internationalCallsWebEnabled: true,
  internationalCallsMobileEnabled: true,
  profileBillingMode: 'free',
  profileSetupFee: '0.00',
  profileMonthlyFee: '0.00',
  profileExtraChargeFixed: '0.00',
  profileExtraChargePercent: '0',
  sipEnabled: true,
  sipBillingMode: 'free',
  sipSetupFee: '0.00',
  sipMonthlyFee: '0.00',
  sipExtraChargeFixed: '0.00',
  sipExtraChargePercent: '0',
  sipWebEnabled: true,
  sipMobileEnabled: true,
  didEnabled: true,
  didBillingMode: 'free',
  didSetupFee: '0.00',
  didMonthlyFee: '0.00',
  didExtraChargeFixed: '0.00',
  didExtraChargePercent: '0',
  didWebEnabled: true,
  didMobileEnabled: true,
  allowedMultipleDids: false,
  voicemailEnabled: false,
  voicemailBillingMode: 'free',
  voicemailSetupFee: '0.00',
  voicemailMonthlyFee: '0.00',
  voicemailExtraChargeFixed: '0.00',
  voicemailExtraChargePercent: '0',
  voicemailWebEnabled: true,
  voicemailMobileEnabled: true,
  voicemailForwardEmail: false,
  callForwardEnabled: false,
  callForwardBillingMode: 'free',
  callForwardSetupFee: '0.00',
  callForwardMonthlyFee: '0.00',
  callForwardExtraChargeFixed: '0.00',
  callForwardExtraChargePercent: '0',
  callForwardWebEnabled: true,
  callForwardMobileEnabled: true,
  callForwardType: 'internal_sip',
  doNotDisturbEnabled: false,
  doNotDisturbBillingMode: 'free',
  doNotDisturbSetupFee: '0.00',
  doNotDisturbMonthlyFee: '0.00',
  doNotDisturbExtraChargeFixed: '0.00',
  doNotDisturbExtraChargePercent: '0',
  doNotDisturbWebEnabled: true,
  doNotDisturbMobileEnabled: true,
  callbackEnabled: false,
  callbackBillingMode: 'free',
  callbackSetupFee: '0.00',
  callbackMonthlyFee: '0.00',
  callbackExtraChargeFixed: '0.00',
  callbackExtraChargePercent: '0',
  callbackWebEnabled: true,
  callbackMobileEnabled: true,
  conferenceCallEnabled: false,
  conferenceCallBillingMode: 'free',
  conferenceCallSetupFee: '0.00',
  conferenceCallMonthlyFee: '0.00',
  conferenceCallExtraChargeFixed: '0.00',
  conferenceCallExtraChargePercent: '0',
  conferenceCallWebEnabled: true,
  conferenceCallMobileEnabled: true,
  clearEnabled: true,
  clearBillingMode: 'free',
  clearSetupFee: '0.00',
  clearMonthlyFee: '0.00',
  clearExtraChargeFixed: '0.00',
  clearExtraChargePercent: '0',
  clearWebEnabled: true,
  clearMobileEnabled: true,
  callerIdEnabled: false,
  callerIdBillingMode: 'free',
  callerIdSetupFee: '0.00',
  callerIdMonthlyFee: '0.00',
  callerIdExtraChargeFixed: '0.00',
  callerIdExtraChargePercent: '0',
  callerIdWebEnabled: true,
  callerIdMobileEnabled: true,
  callRecordingEnabled: false,
  callRecordingBillingMode: 'free',
  callRecordingSetupFee: '0.00',
  callRecordingMonthlyFee: '0.00',
  callRecordingExtraChargeFixed: '0.00',
  callRecordingExtraChargePercent: '0',
  callRecordingWebEnabled: true,
  callRecordingMobileEnabled: true,
  ringGroupEnabled: false,
  ringGroupBillingMode: 'free',
  ringGroupSetupFee: '0.00',
  ringGroupMonthlyFee: '0.00',
  ringGroupExtraChargeFixed: '0.00',
  ringGroupExtraChargePercent: '0',
  ringGroupWebEnabled: true,
  ringGroupMobileEnabled: true,
  chatEnabled: false,
  chatBillingMode: 'free',
  chatSetupFee: '0.00',
  chatMonthlyFee: '0.00',
  chatExtraChargeFixed: '0.00',
  chatExtraChargePercent: '0',
  chatWebEnabled: true,
  chatMobileEnabled: true,
  chatVoiceCall: false,
  chatVideoCall: false,
  chatEmojis: true,
  chatFileShare: true,
  chatLocationShare: false,
  traceMeEnabled: false,
  traceMeBillingMode: 'free',
  traceMeSetupFee: '0.00',
  traceMeMonthlyFee: '0.00',
  traceMeExtraChargeFixed: '0.00',
  traceMeExtraChargePercent: '0',
  traceMeWebEnabled: true,
  traceMeMobileEnabled: true,
  faxEnabled: false,
  faxBillingMode: 'free',
  faxSetupFee: '0.00',
  faxMonthlyFee: '0.00',
  faxExtraChargeFixed: '0.00',
  faxExtraChargePercent: '0',
  faxWebEnabled: true,
  faxMobileEnabled: true,
  faxForwardEmail: false,
  pbxEnabled: false,
  pbxBillingMode: 'free',
  pbxSetupFee: '0.00',
  pbxMonthlyFee: '0.00',
  pbxExtraChargeFixed: '0.00',
  pbxExtraChargePercent: '0',
  pbxWebEnabled: true,
  pbxMobileEnabled: true,
  receiveInternationalCalls: false,
  receiveInternationalBillingMode: 'free',
  receiveInternationalTariffId: '',
  receiveInternationalSetupFee: '0.00',
  receiveInternationalMonthlyFee: '0.00',
  receiveInternationalExtraChargeFixed: '0.00',
  receiveInternationalExtraChargePercent: '0',
  receiveInternationalWebEnabled: true,
  receiveInternationalMobileEnabled: true,
};

const inputClass = 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500';
const selectClass = 'border-slate-300 bg-white text-slate-900 focus:ring-teal-500';
const selectContentClass = 'border-slate-200 bg-white text-slate-900 shadow-lg';
const selectItemClass =
  'text-slate-900 focus:bg-teal-100 focus:text-slate-950 data-[highlighted]:bg-teal-100 data-[highlighted]:text-slate-950 data-[state=checked]:bg-teal-600 data-[state=checked]:text-white [&_svg]:text-current';
const primaryButtonClass = 'gap-2 bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]';
const outlineButtonClass = 'gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';
const cardClass = 'border-slate-200 bg-white text-slate-950 shadow-sm';
const cardContentClass = 'grid items-start gap-6 sm:grid-cols-2 xl:grid-cols-4';
const threeCardContentClass = 'grid items-start gap-6 sm:grid-cols-2 xl:grid-cols-3';

function parseError(error: Error) {
  return error.message.replace(/^\d+:\s*/, '');
}

async function unwrap<T>(response: Response): Promise<T> {
  const payload = await response.json();
  return (payload?.data ?? payload) as T;
}

function selectValue(value: string) {
  return value || 'none';
}

function apiValue(value: string) {
  return value === 'none' ? '' : value;
}

function tariffNameFor(tariffs: Tariff[], tariffId: string) {
  return tariffs.find((tariff) => tariff.id === apiValue(tariffId))?.name || '';
}

const featureAccessKeys = [
  ['internalCalls', 'internalCallsWebEnabled', 'internalCallsMobileEnabled'],
  ['internationalCalls', 'internationalCallsWebEnabled', 'internationalCallsMobileEnabled'],
  ['sip', 'sipWebEnabled', 'sipMobileEnabled'],
  ['did', 'didWebEnabled', 'didMobileEnabled'],
  ['voicemail', 'voicemailWebEnabled', 'voicemailMobileEnabled'],
  ['pbx', 'pbxWebEnabled', 'pbxMobileEnabled'],
  ['callForward', 'callForwardWebEnabled', 'callForwardMobileEnabled'],
  ['doNotDisturb', 'doNotDisturbWebEnabled', 'doNotDisturbMobileEnabled'],
  ['callback', 'callbackWebEnabled', 'callbackMobileEnabled'],
  ['conferenceCall', 'conferenceCallWebEnabled', 'conferenceCallMobileEnabled'],
  ['clear', 'clearWebEnabled', 'clearMobileEnabled'],
  ['callerId', 'callerIdWebEnabled', 'callerIdMobileEnabled'],
  ['callRecording', 'callRecordingWebEnabled', 'callRecordingMobileEnabled'],
  ['ringGroup', 'ringGroupWebEnabled', 'ringGroupMobileEnabled'],
  ['chat', 'chatWebEnabled', 'chatMobileEnabled'],
  ['traceMe', 'traceMeWebEnabled', 'traceMeMobileEnabled'],
  ['fax', 'faxWebEnabled', 'faxMobileEnabled'],
  ['receiveInternational', 'receiveInternationalWebEnabled', 'receiveInternationalMobileEnabled'],
] as const;

function buildFeatureAccess(features: FeatureState) {
  return featureAccessKeys.reduce(
    (access, [key, webKey, mobileKey]) => {
      access.web[key] = features[webKey] !== false;
      access.mobile[key] = features[mobileKey] !== false;
      return access;
    },
    { web: {} as Record<string, boolean>, mobile: {} as Record<string, boolean> },
  );
}

export default function AdminSipRegistrationProfileForm({ mode, profileId }: { mode: Mode; profileId?: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [info, setInfo] = useState<ProfileInfo>(initialInfo);
  const [features, setFeatures] = useState<FeatureState>(initialFeatures);
  const isEdit = mode === 'edit';

  const profileQuery = useQuery<{ profile: ProfileInfo & { metadata: FeatureState } }>({
    queryKey: [`/api/admin/sip-registration-profiles/${profileId}`],
    enabled: isEdit && Boolean(profileId),
  });
  const internalTariffsQuery = useQuery<{ data: Tariff[] }>({
    queryKey: ['/api/admin/sip-tariffs', { tariffType: 'internal', kind: 'internal_tariff', limit: 5000 }],
  });
  const internationalTariffsQuery = useQuery<{ data: Tariff[] }>({
    queryKey: ['/api/admin/sip-tariffs', { tariffType: 'international', kind: 'origination_tariff', limit: 5000 }],
  });
  const internalTariffs = internalTariffsQuery.data?.data || [];
  const internationalTariffs = internationalTariffsQuery.data?.data || [];

  useEffect(() => {
    const profile = profileQuery.data?.profile;
    if (!profile) return;
    setInfo({
      name: profile.name,
      description: profile.description,
      status: profile.status,
      isDefault: profile.isDefault,
    });
    setFeatures({ ...initialFeatures, ...(profile.metadata || {}) });
  }, [profileQuery.data?.profile]);

  const setFeature = (key: string, value: any) => setFeatures((current) => ({ ...current, [key]: value }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const metadata = {
        ...features,
        internalTariffType: 'internal',
        internalTariffId: apiValue(features.internalTariffId),
        internalTariffName: tariffNameFor(internalTariffs, features.internalTariffId),
        internationalTariffType: 'international',
        internationalTariffId: apiValue(features.internationalTariffId),
        internationalTariffName: tariffNameFor(internationalTariffs, features.internationalTariffId),
        receiveInternationalTariffId: apiValue(features.receiveInternationalTariffId),
        receiveInternationalTariffName: tariffNameFor(internationalTariffs, features.receiveInternationalTariffId),
        featureAccess: buildFeatureAccess(features),
        extraChargePolicy: {
          appliesOnlyWhenBillingModeIsPaid: true,
          freeMeansNoAdditionalProfileCharge: true,
          chargesAreAddedOnTopOfBaseERoamingPrices: true,
          didFreeMeansNoExtraChargeOnTopOfBaseDidPrice: true,
          didPaidMeansAddExtraChargesToBaseDidPrice: true,
        },
        freeTrialPolicy: {
          appliesOnlyWhenBillingModeIsPaid: true,
          freeTrialDelaysExtraProfileChargesOnly: true,
          trialDaysAreConfiguredPerPaidFeature: true,
        },
      };
      const response = isEdit
        ? await apiRequest('PATCH', `/api/admin/sip-registration-profiles/${profileId}`, { ...info, metadata })
        : await apiRequest('POST', '/api/admin/sip-registration-profiles', { ...info, metadata });
      return unwrap(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/sip-registration-profiles'] });
      toast({ title: isEdit ? 'Registration Profile Updated' : 'Registration Profile Created', description: 'The SIP Registration Profile Was Saved Successfully.' });
      navigate('/admin/sip-configuration/registration-profiles');
    },
    onError: (error: Error) => {
      toast({ title: isEdit ? 'Update Failed' : 'Create Failed', description: parseError(error), variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            <ShieldCheck className="h-8 w-8 text-cyan-300" />
            {isEdit ? 'Edit Registration Profile' : 'Create Registration Profile'}
          </h1>
          <p className="mt-2 text-slate-400">Set The Default SIP Services, Fees, And Call Rules Used During User Registration.</p>
        </div>
        <Button asChild variant="outline" className={outlineButtonClass}>
          <Link href="/admin/sip-configuration/registration-profiles">
            <ArrowLeft className="h-4 w-4" />
            Back To Registration Profile
          </Link>
        </Button>
      </div>

      <div className="w-full space-y-8">
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-2">
            <Field label="Profile Name" value={info.name} onChange={(name) => setInfo((current) => ({ ...current, name }))} placeholder="Standard SIP Profile" />
            <SelectField label="Status" value={info.status} onChange={(status) => setInfo((current) => ({ ...current, status: status as ProfileInfo['status'] }))}>
              <SelectItem className={selectItemClass} value="active">Active</SelectItem>
              <SelectItem className={selectItemClass} value="inactive">Inactive</SelectItem>
            </SelectField>
            <div className="space-y-2 lg:col-span-2">
              <Label>Description</Label>
              <Textarea className={`${inputClass} min-h-24`} value={info.description} onChange={(event) => setInfo((current) => ({ ...current, description: event.target.value }))} placeholder="Short note for this profile" />
            </div>
            <div className="lg:col-span-2">
              <SwitchRow label="Default Profile" description="Use This Profile For Automatic SIP User Creation During Online Signup." checked={info.isDefault} onChange={(isDefault) => setInfo((current) => ({ ...current, isDefault }))} />
            </div>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle>Base Services</CardTitle>
          </CardHeader>
          <CardContent className={threeCardContentClass}>
            <ServicePricingSection
              title="Profile Package"
              enabled
              lockedEnabled
              billing={features.profileBillingMode}
              onBilling={(value) => setFeature('profileBillingMode', value)}
              paidFieldKeys={{ setup: 'profileSetupFee', monthly: 'profileMonthlyFee', fixed: 'profileExtraChargeFixed', percent: 'profileExtraChargePercent' }}
              features={features}
              setFeature={setFeature}
            />
            <ServicePricingSection
              title="SIP Account"
              enabled={features.sipEnabled}
              onEnabled={(value) => setFeature('sipEnabled', value)}
              billing={features.sipBillingMode}
              onBilling={(value) => setFeature('sipBillingMode', value)}
              paidFieldKeys={{ setup: 'sipSetupFee', monthly: 'sipMonthlyFee', fixed: 'sipExtraChargeFixed', percent: 'sipExtraChargePercent' }}
              visibilityKeys={{ web: 'sipWebEnabled', mobile: 'sipMobileEnabled' }}
              features={features}
              setFeature={setFeature}
            />
            <ServicePricingSection
              title="DID Numbers"
              description="Free Means No Extra Profile Charge On Top Of The Normal ERoaming DID Price. Paid Adds Extra DID Fees To The Normal DID Price."
              enabled={features.didEnabled}
              onEnabled={(value) => setFeature('didEnabled', value)}
              billing={features.didBillingMode}
              onBilling={(value) => setFeature('didBillingMode', value)}
              paidFieldKeys={{ setup: 'didSetupFee', monthly: 'didMonthlyFee', fixed: 'didExtraChargeFixed', percent: 'didExtraChargePercent' }}
              visibilityKeys={{ web: 'didWebEnabled', mobile: 'didMobileEnabled' }}
              features={features}
              setFeature={setFeature}
            >
              <SwitchRow label="Allowed Multiple DID's" checked={features.allowedMultipleDids} onChange={(value) => setFeature('allowedMultipleDids', value)} />
            </ServicePricingSection>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle>Call Rules</CardTitle>
          </CardHeader>
          <CardContent className={threeCardContentClass}>
            <ServicePricingSection
              title="Internal Calls"
              enabled={features.allowInternalCalls}
              onEnabled={(value) => setFeature('allowInternalCalls', value)}
              billing={features.internalBillingMode}
              onBilling={(value) => setFeature('internalBillingMode', value)}
              paidFieldKeys={{ setup: 'internalSetupFee', monthly: 'internalMonthlyFee', fixed: 'internalExtraChargeFixed', percent: 'internalExtraChargePercent' }}
              visibilityKeys={{ web: 'internalCallsWebEnabled', mobile: 'internalCallsMobileEnabled' }}
              features={features}
              setFeature={setFeature}
            >
              <div className="grid gap-4">
                <ReadOnlyField label="Tariff Type" value="Internal" />
                <TariffSelect label="Select Internal Tariff" value={features.internalTariffId} tariffs={internalTariffs} loading={internalTariffsQuery.isLoading} emptyLabel="No Internal Tariff Found" onChange={(value) => setFeature('internalTariffId', value)} />
              </div>
            </ServicePricingSection>

            <ServicePricingSection
              title="International Calls"
              enabled={features.allowInternationalCalls}
              onEnabled={(value) => setFeature('allowInternationalCalls', value)}
              billing={features.internationalBillingMode}
              onBilling={(value) => setFeature('internationalBillingMode', value)}
              paidFieldKeys={{ setup: 'internationalSetupFee', monthly: 'internationalMonthlyFee', fixed: 'internationalExtraChargeFixed', percent: 'internationalExtraChargePercent' }}
              visibilityKeys={{ web: 'internationalCallsWebEnabled', mobile: 'internationalCallsMobileEnabled' }}
              features={features}
              setFeature={setFeature}
            >
              <div className="grid gap-4">
                <ReadOnlyField label="Tariff Type" value="International" />
                <TariffSelect label="Select International Tariff" value={features.internationalTariffId} tariffs={internationalTariffs} loading={internationalTariffsQuery.isLoading} emptyLabel="No International Tariff Found" onChange={(value) => setFeature('internationalTariffId', value)} />
              </div>
            </ServicePricingSection>

            <ServicePricingSection
              title="Receive International Calls"
              enabled={features.receiveInternationalCalls}
              onEnabled={(value) => setFeature('receiveInternationalCalls', value)}
              billing={features.receiveInternationalBillingMode}
              onBilling={(value) => setFeature('receiveInternationalBillingMode', value)}
              paidFieldKeys={{ setup: 'receiveInternationalSetupFee', monthly: 'receiveInternationalMonthlyFee', fixed: 'receiveInternationalExtraChargeFixed', percent: 'receiveInternationalExtraChargePercent' }}
              visibilityKeys={{ web: 'receiveInternationalWebEnabled', mobile: 'receiveInternationalMobileEnabled' }}
              features={features}
              setFeature={setFeature}
            >
              <TariffSelect label="Receive International Tariff" value={features.receiveInternationalTariffId} tariffs={internationalTariffs} loading={internationalTariffsQuery.isLoading} emptyLabel="No International Tariff Found" onChange={(value) => setFeature('receiveInternationalTariffId', value)} />
            </ServicePricingSection>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle>Voice Features</CardTitle>
          </CardHeader>
          <CardContent className={cardContentClass}>
            <ServicePricingSection title="Voicemail" enabled={features.voicemailEnabled} onEnabled={(value) => setFeature('voicemailEnabled', value)} billing={features.voicemailBillingMode} onBilling={(value) => setFeature('voicemailBillingMode', value)} paidFieldKeys={{ setup: 'voicemailSetupFee', monthly: 'voicemailMonthlyFee', fixed: 'voicemailExtraChargeFixed', percent: 'voicemailExtraChargePercent' }} visibilityKeys={{ web: 'voicemailWebEnabled', mobile: 'voicemailMobileEnabled' }} features={features} setFeature={setFeature}>
              <SwitchRow label="Forward Voicemail To Email" checked={features.voicemailForwardEmail} onChange={(value) => setFeature('voicemailForwardEmail', value)} />
            </ServicePricingSection>
            <ServicePricingSection title="PBX" enabled={features.pbxEnabled} onEnabled={(value) => setFeature('pbxEnabled', value)} billing={features.pbxBillingMode} onBilling={(value) => setFeature('pbxBillingMode', value)} paidFieldKeys={{ setup: 'pbxSetupFee', monthly: 'pbxMonthlyFee', fixed: 'pbxExtraChargeFixed', percent: 'pbxExtraChargePercent' }} visibilityKeys={{ web: 'pbxWebEnabled', mobile: 'pbxMobileEnabled' }} features={features} setFeature={setFeature} />
            <ServicePricingSection title="Call Forward" description="Forward To Internal SIP, External SIP, Or International Number." enabled={features.callForwardEnabled} onEnabled={(value) => setFeature('callForwardEnabled', value)} billing={features.callForwardBillingMode} onBilling={(value) => setFeature('callForwardBillingMode', value)} paidFieldKeys={{ setup: 'callForwardSetupFee', monthly: 'callForwardMonthlyFee', fixed: 'callForwardExtraChargeFixed', percent: 'callForwardExtraChargePercent' }} visibilityKeys={{ web: 'callForwardWebEnabled', mobile: 'callForwardMobileEnabled' }} features={features} setFeature={setFeature}>
              <SelectField label="Call Forward Type" value={features.callForwardType} onChange={(value) => setFeature('callForwardType', value)}>
                <SelectItem className={selectItemClass} value="internal_sip">Internal SIP</SelectItem>
                <SelectItem className={selectItemClass} value="external_sip">External SIP</SelectItem>
                <SelectItem className={selectItemClass} value="international_number">International Number</SelectItem>
              </SelectField>
            </ServicePricingSection>
            <ServicePricingSection title="Do Not Disturb" enabled={features.doNotDisturbEnabled} onEnabled={(value) => setFeature('doNotDisturbEnabled', value)} billing={features.doNotDisturbBillingMode} onBilling={(value) => setFeature('doNotDisturbBillingMode', value)} paidFieldKeys={{ setup: 'doNotDisturbSetupFee', monthly: 'doNotDisturbMonthlyFee', fixed: 'doNotDisturbExtraChargeFixed', percent: 'doNotDisturbExtraChargePercent' }} visibilityKeys={{ web: 'doNotDisturbWebEnabled', mobile: 'doNotDisturbMobileEnabled' }} features={features} setFeature={setFeature} />
            <ServicePricingSection title="Callback" description="Allow Leg A And Leg B Callback Calls." enabled={features.callbackEnabled} onEnabled={(value) => setFeature('callbackEnabled', value)} billing={features.callbackBillingMode} onBilling={(value) => setFeature('callbackBillingMode', value)} paidFieldKeys={{ setup: 'callbackSetupFee', monthly: 'callbackMonthlyFee', fixed: 'callbackExtraChargeFixed', percent: 'callbackExtraChargePercent' }} visibilityKeys={{ web: 'callbackWebEnabled', mobile: 'callbackMobileEnabled' }} features={features} setFeature={setFeature} />
            <ServicePricingSection title="Conference Call" enabled={features.conferenceCallEnabled} onEnabled={(value) => setFeature('conferenceCallEnabled', value)} billing={features.conferenceCallBillingMode} onBilling={(value) => setFeature('conferenceCallBillingMode', value)} paidFieldKeys={{ setup: 'conferenceCallSetupFee', monthly: 'conferenceCallMonthlyFee', fixed: 'conferenceCallExtraChargeFixed', percent: 'conferenceCallExtraChargePercent' }} visibilityKeys={{ web: 'conferenceCallWebEnabled', mobile: 'conferenceCallMobileEnabled' }} features={features} setFeature={setFeature} />
            <ServicePricingSection title="Clear / Hide Caller ID" enabled={features.clearEnabled} onEnabled={(value) => setFeature('clearEnabled', value)} billing={features.clearBillingMode} onBilling={(value) => setFeature('clearBillingMode', value)} paidFieldKeys={{ setup: 'clearSetupFee', monthly: 'clearMonthlyFee', fixed: 'clearExtraChargeFixed', percent: 'clearExtraChargePercent' }} visibilityKeys={{ web: 'clearWebEnabled', mobile: 'clearMobileEnabled' }} features={features} setFeature={setFeature} />
            <ServicePricingSection title="Caller ID" enabled={features.callerIdEnabled} onEnabled={(value) => setFeature('callerIdEnabled', value)} billing={features.callerIdBillingMode} onBilling={(value) => setFeature('callerIdBillingMode', value)} paidFieldKeys={{ setup: 'callerIdSetupFee', monthly: 'callerIdMonthlyFee', fixed: 'callerIdExtraChargeFixed', percent: 'callerIdExtraChargePercent' }} visibilityKeys={{ web: 'callerIdWebEnabled', mobile: 'callerIdMobileEnabled' }} features={features} setFeature={setFeature} />
            <ServicePricingSection title="Call Recording" enabled={features.callRecordingEnabled} onEnabled={(value) => setFeature('callRecordingEnabled', value)} billing={features.callRecordingBillingMode} onBilling={(value) => setFeature('callRecordingBillingMode', value)} paidFieldKeys={{ setup: 'callRecordingSetupFee', monthly: 'callRecordingMonthlyFee', fixed: 'callRecordingExtraChargeFixed', percent: 'callRecordingExtraChargePercent' }} visibilityKeys={{ web: 'callRecordingWebEnabled', mobile: 'callRecordingMobileEnabled' }} features={features} setFeature={setFeature} />
            <ServicePricingSection title="Ring Group" enabled={features.ringGroupEnabled} onEnabled={(value) => setFeature('ringGroupEnabled', value)} billing={features.ringGroupBillingMode} onBilling={(value) => setFeature('ringGroupBillingMode', value)} paidFieldKeys={{ setup: 'ringGroupSetupFee', monthly: 'ringGroupMonthlyFee', fixed: 'ringGroupExtraChargeFixed', percent: 'ringGroupExtraChargePercent' }} visibilityKeys={{ web: 'ringGroupWebEnabled', mobile: 'ringGroupMobileEnabled' }} features={features} setFeature={setFeature} />
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle>Chat And Business Features</CardTitle>
          </CardHeader>
          <CardContent className={threeCardContentClass}>
            <ServicePricingSection title="Chat" enabled={features.chatEnabled} onEnabled={(value) => setFeature('chatEnabled', value)} billing={features.chatBillingMode} onBilling={(value) => setFeature('chatBillingMode', value)} paidFieldKeys={{ setup: 'chatSetupFee', monthly: 'chatMonthlyFee', fixed: 'chatExtraChargeFixed', percent: 'chatExtraChargePercent' }} visibilityKeys={{ web: 'chatWebEnabled', mobile: 'chatMobileEnabled' }} features={features} setFeature={setFeature}>
              <div className="grid gap-4">
                <SwitchRow label="Voice Call" checked={features.chatVoiceCall} onChange={(value) => setFeature('chatVoiceCall', value)} />
                <SwitchRow label="Video Call" checked={features.chatVideoCall} onChange={(value) => setFeature('chatVideoCall', value)} />
                <SwitchRow label="Send Emojis" checked={features.chatEmojis} onChange={(value) => setFeature('chatEmojis', value)} />
                <SwitchRow label="Share Files, Audio, Video" checked={features.chatFileShare} onChange={(value) => setFeature('chatFileShare', value)} />
                <SwitchRow label="Share Location" checked={features.chatLocationShare} onChange={(value) => setFeature('chatLocationShare', value)} />
              </div>
            </ServicePricingSection>
            <ServicePricingSection title="Trace Me" description="Requires Admin And Owner Approval For Location Monitoring." enabled={features.traceMeEnabled} onEnabled={(value) => setFeature('traceMeEnabled', value)} billing={features.traceMeBillingMode} onBilling={(value) => setFeature('traceMeBillingMode', value)} paidFieldKeys={{ setup: 'traceMeSetupFee', monthly: 'traceMeMonthlyFee', fixed: 'traceMeExtraChargeFixed', percent: 'traceMeExtraChargePercent' }} visibilityKeys={{ web: 'traceMeWebEnabled', mobile: 'traceMeMobileEnabled' }} features={features} setFeature={setFeature} />
            <ServicePricingSection title="Fax" enabled={features.faxEnabled} onEnabled={(value) => setFeature('faxEnabled', value)} billing={features.faxBillingMode} onBilling={(value) => setFeature('faxBillingMode', value)} paidFieldKeys={{ setup: 'faxSetupFee', monthly: 'faxMonthlyFee', fixed: 'faxExtraChargeFixed', percent: 'faxExtraChargePercent' }} visibilityKeys={{ web: 'faxWebEnabled', mobile: 'faxMobileEnabled' }} features={features} setFeature={setFeature}>
              <SwitchRow label="Forward Fax Copy To Email" checked={features.faxForwardEmail} onChange={(value) => setFeature('faxForwardEmail', value)} />
            </ServicePricingSection>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button asChild variant="outline" className={outlineButtonClass}>
            <Link href="/admin/sip-configuration/registration-profiles">Cancel</Link>
          </Button>
          <Button className={primaryButtonClass} disabled={saveMutation.isPending || !info.name.trim()} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Registration Profile
          </Button>
        </div>
      </div>
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex h-10 items-center rounded-md border border-slate-300 bg-slate-100 px-3 text-sm font-medium text-slate-700">
        {value}
      </div>
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

type PaidFieldKeys = {
  setup: string;
  monthly: string;
  fixed: string;
  percent: string;
};

type VisibilityKeys = {
  web: string;
  mobile: string;
};

function moneyValue(features: FeatureState, key: string, fallback = '0.00') {
  return String(features[key] ?? fallback);
}

function trialKeysFor(keys: PaidFieldKeys) {
  const prefix = keys.setup.endsWith('SetupFee') ? keys.setup.slice(0, -'SetupFee'.length) : keys.setup;
  return {
    enabled: `${prefix}TrialEnabled`,
    days: `${prefix}TrialDays`,
  };
}

function ServicePricingSection({
  title,
  description,
  enabled,
  lockedEnabled = false,
  onEnabled,
  billing,
  onBilling,
  paidFieldKeys,
  visibilityKeys,
  features,
  setFeature,
  children,
}: {
  title: string;
  description?: string;
  enabled: boolean;
  lockedEnabled?: boolean;
  onEnabled?: (enabled: boolean) => void;
  billing: BillingMode;
  onBilling: (billing: BillingMode) => void;
  paidFieldKeys: PaidFieldKeys;
  visibilityKeys?: VisibilityKeys;
  features: FeatureState;
  setFeature: (key: string, value: any) => void;
  children?: ReactNode;
}) {
  return (
    <section className="h-full min-w-0 space-y-5 rounded-lg border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {lockedEnabled ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">Enabled</span>
        ) : (
          <Switch checked={enabled} onCheckedChange={(value) => onEnabled?.(value)} />
        )}
      </div>

      {enabled ? (
        <div className="space-y-5">
          <BillingChoice value={billing} onChange={onBilling} />
          <p className="rounded-md border border-sky-100 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
            {billing === 'paid'
              ? 'Paid means these are extra profile charges added on top of the normal ERoaming or service price.'
              : 'Free means no extra profile charge. Any normal ERoaming or base service price stays separate.'}
          </p>
          {children}
          {billing === 'paid' ? <PaidFields features={features} setFeature={setFeature} keys={paidFieldKeys} /> : null}
          {visibilityKeys ? <VisibilityControls features={features} setFeature={setFeature} keys={visibilityKeys} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function BillingChoice({ value, onChange }: { value: BillingMode; onChange: (value: BillingMode) => void }) {
  return (
    <div className="grid w-full max-w-sm grid-cols-2 gap-2 rounded-md bg-white p-1">
      {(['free', 'paid'] as BillingMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
            value === mode
              ? 'bg-slate-950 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
          }`}
          onClick={() => onChange(mode)}
        >
          {mode === 'free' ? 'Free' : 'Paid'}
        </button>
      ))}
    </div>
  );
}

function PaidFields({
  features,
  setFeature,
  keys,
}: {
  features: FeatureState;
  setFeature: (key: string, value: any) => void;
  keys: PaidFieldKeys;
}) {
  const trialKeys = trialKeysFor(keys);
  const trialEnabled = features[trialKeys.enabled] === true;
  const trialDays = String(features[trialKeys.days] || '7');
  const setTrialEnabled = (enabled: boolean) => {
    setFeature(trialKeys.enabled, enabled);
    if (enabled && !features[trialKeys.days]) {
      setFeature(trialKeys.days, '7');
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-teal-100 bg-white p-4">
      <p className="text-xs font-medium text-teal-700">Extra charges only. These fields apply only when Paid is selected.</p>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <SwitchRow
          label="Free Trial"
          description="Allow this paid feature without extra profile charges for a limited number of days."
          checked={trialEnabled}
          onChange={setTrialEnabled}
        />
        {trialEnabled ? (
          <div className="mt-3 space-y-2">
            <Field label="Trial Days" value={trialDays} onChange={(value) => setFeature(trialKeys.days, value)} placeholder="7" />
            <p className="text-xs text-slate-500">Use 7 for one week, 30 for one month, or enter any number of days you allow.</p>
          </div>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Extra One Time Setup Fee" value={moneyValue(features, keys.setup)} onChange={(value) => setFeature(keys.setup, value)} placeholder="0.00" />
        <Field label="Extra Monthly Fee" value={moneyValue(features, keys.monthly)} onChange={(value) => setFeature(keys.monthly, value)} placeholder="0.00" />
        <Field label="Extra Fixed Charge" value={moneyValue(features, keys.fixed)} onChange={(value) => setFeature(keys.fixed, value)} placeholder="0.00" />
        <Field label="Extra Charge %" value={moneyValue(features, keys.percent, '0')} onChange={(value) => setFeature(keys.percent, value)} placeholder="0" />
      </div>
    </div>
  );
}

function VisibilityControls({
  features,
  setFeature,
  keys,
}: {
  features: FeatureState;
  setFeature: (key: string, value: any) => void;
  keys: VisibilityKeys;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SwitchRow label="Enabled For Web Users" checked={features[keys.web] !== false} onChange={(value) => setFeature(keys.web, value)} />
      <SwitchRow label="Enabled For Mobile App Users" checked={features[keys.mobile] !== false} onChange={(value) => setFeature(keys.mobile, value)} />
    </div>
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

function FeatureBilling({
  label,
  description,
  checked,
  billing,
  onChecked,
  onBilling,
}: {
  label: string;
  description?: string;
  checked: boolean;
  billing: BillingMode;
  onChecked: (checked: boolean) => void;
  onBilling: (billing: BillingMode) => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <SwitchRow label={label} description={description} checked={checked} onChange={onChecked} />
      {checked && <BillingSelect label={`${label} Billing`} value={billing} onChange={onBilling} />}
    </div>
  );
}
