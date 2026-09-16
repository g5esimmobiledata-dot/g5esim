import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, ChevronsUpDown, Loader2, PhoneCall, Save, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

type Mode = 'create' | 'edit';

type RateGroup = {
  id: string;
  name: string;
  status: string;
};

type DialPrefixCallType = 'all' | 'landline' | 'mobile' | 'toll_free' | 'premium';

type DialPrefixOption = {
  countryCode: string;
  country: string;
  prefix: string;
  destination: string;
  callType: DialPrefixCallType;
};

type SipAccountOption = {
  id: string;
  username: string;
  uri: string;
  domain: string;
  status: string;
  user?: {
    email?: string;
    name?: string;
    phone?: string;
    displayUserId?: number | string;
  };
};

type DidNumberOption = {
  id: string;
  msisdn: string;
  countryCode: string;
  provider: string;
};

type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
  meta?: Record<string, any>;
};

type FormState = {
  name: string;
  tariffType: 'internal' | 'international';
  originationKind: 'tariff' | 'destination';
  description: string;
  currency: string;
  connectionFee: string;
  ratePerMinute: string;
  billingIncrementSeconds: string;
  status: 'active' | 'inactive';
  rateGroupId: string;
  prefix: string;
  destination: string;
  country: string;
  callType: string;
  routingType: string;
  providerTrunk: string;
  parentTariffId: string;
  parentTariffName: string;
  targetSipAccountId: string;
  targetSipAccountLabel: string;
  targetSipUsername: string;
  targetSipUri: string;
  didNumberId: string;
  didNumber: string;
  buyingCost: string;
  sellingPrice: string;
  graceTime: string;
  costPerMinute: string;
  initialIncrement: string;
  increment: string;
};

const initialForm: FormState = {
  name: '',
  tariffType: 'internal',
  originationKind: 'tariff',
  description: '',
  currency: 'USD',
  connectionFee: '0.0000',
  ratePerMinute: '0.0000',
  billingIncrementSeconds: '60',
  status: 'active',
  rateGroupId: '',
  prefix: '',
  destination: '',
  country: '',
  callType: '',
  routingType: '',
  providerTrunk: '',
  parentTariffId: '',
  parentTariffName: '',
  targetSipAccountId: '',
  targetSipAccountLabel: '',
  targetSipUsername: '',
  targetSipUri: '',
  didNumberId: '',
  didNumber: '',
  buyingCost: '0.0000',
  sellingPrice: '0.0000',
  graceTime: '0',
  costPerMinute: '0.0000',
  initialIncrement: '60',
  increment: '60',
};

const inputClass = 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500';
const selectClass = 'border-slate-300 bg-white text-slate-900 focus:ring-teal-500';
const selectContentClass = 'border-slate-200 bg-white text-slate-900 shadow-lg';
const selectItemClass =
  'text-slate-900 focus:bg-teal-100 focus:text-slate-950 data-[highlighted]:bg-teal-100 data-[highlighted]:text-slate-950 data-[state=checked]:bg-teal-600 data-[state=checked]:text-white [&_svg]:text-current';
const primaryButtonClass = 'gap-2 bg-[#3b2f7f] text-white hover:bg-[#33286f]';
const outlineButtonClass = 'gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';
const panelClass = 'border-slate-200 bg-white text-slate-950 shadow-sm';
const originationShellClass = 'rounded-md bg-white p-5 text-slate-950 shadow-sm lg:p-6';
const compactInputClass = 'h-8 rounded-md border-slate-700 bg-slate-950 text-sm text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-teal-500';
const compactSelectClass = 'h-8 rounded-md border-slate-700 bg-slate-950 text-sm text-white focus:ring-1 focus:ring-teal-500 [&>span]:text-white';
const compactLabelClass = 'text-sm font-medium text-slate-950';
const quickPrimaryButtonClass = 'h-8 gap-2 rounded-md border border-teal-500 bg-teal-50 px-4 text-sm font-medium text-teal-700 hover:bg-teal-100';
const quickSecondaryButtonClass = 'h-8 rounded-md border border-slate-100 bg-slate-100 px-4 text-sm font-medium text-slate-900 hover:bg-slate-200';

const COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS',
  'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE',
  'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF',
  'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM',
  'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC',
  'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA',
  'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG',
  'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS',
  'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO',
  'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
];

const countryDisplayNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new (Intl as any).DisplayNames(['en'], { type: 'region' })
    : null;

const countryNameOverrides: Record<string, string> = {
  XK: 'Kosovo',
};

const countryOptions = COUNTRY_CODES
  .map((code) => ({
    code,
    name: countryNameOverrides[code] || countryDisplayNames?.of(code) || code,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const COUNTRY_DIAL_CODES: Record<string, string> = {
  AD: '376',
  AE: '971',
  AF: '93',
  AG: '1268',
  AI: '1264',
  AL: '355',
  AM: '374',
  AO: '244',
  AQ: '672',
  AR: '54',
  AS: '1684',
  AT: '43',
  AU: '61',
  AW: '297',
  AX: '35818',
  AZ: '994',
  BA: '387',
  BB: '1246',
  BD: '880',
  BE: '32',
  BF: '226',
  BG: '359',
  BH: '973',
  BI: '257',
  BJ: '229',
  BL: '590',
  BM: '1441',
  BN: '673',
  BO: '591',
  BQ: '599',
  BR: '55',
  BS: '1242',
  BT: '975',
  BV: '47',
  BW: '267',
  BY: '375',
  BZ: '501',
  CA: '1',
  CC: '61',
  CD: '243',
  CF: '236',
  CG: '242',
  CH: '41',
  CI: '225',
  CK: '682',
  CL: '56',
  CM: '237',
  CN: '86',
  CO: '57',
  CR: '506',
  CU: '53',
  CV: '238',
  CW: '599',
  CX: '61',
  CY: '357',
  CZ: '420',
  DE: '49',
  DJ: '253',
  DK: '45',
  DM: '1767',
  DO: '1809',
  DZ: '213',
  EC: '593',
  EE: '372',
  EG: '20',
  EH: '212',
  ER: '291',
  ES: '34',
  ET: '251',
  FI: '358',
  FJ: '679',
  FK: '500',
  FM: '691',
  FO: '298',
  FR: '33',
  GA: '241',
  GB: '44',
  GD: '1473',
  GE: '995',
  GF: '594',
  GG: '44',
  GH: '233',
  GI: '350',
  GL: '299',
  GM: '220',
  GN: '224',
  GP: '590',
  GQ: '240',
  GR: '30',
  GS: '500',
  GT: '502',
  GU: '1671',
  GW: '245',
  GY: '592',
  HK: '852',
  HM: '672',
  HN: '504',
  HR: '385',
  HT: '509',
  HU: '36',
  ID: '62',
  IE: '353',
  IL: '972',
  IM: '44',
  IN: '91',
  IO: '246',
  IQ: '964',
  IR: '98',
  IS: '354',
  IT: '39',
  JE: '44',
  JM: '1876',
  JO: '962',
  JP: '81',
  KE: '254',
  KG: '996',
  KH: '855',
  KI: '686',
  KM: '269',
  KN: '1869',
  KP: '850',
  KR: '82',
  KW: '965',
  KY: '1345',
  KZ: '7',
  LA: '856',
  LB: '961',
  LC: '1758',
  LI: '423',
  LK: '94',
  LR: '231',
  LS: '266',
  LT: '370',
  LU: '352',
  LV: '371',
  LY: '218',
  MA: '212',
  MC: '377',
  MD: '373',
  ME: '382',
  MF: '590',
  MG: '261',
  MH: '692',
  MK: '389',
  ML: '223',
  MM: '95',
  MN: '976',
  MO: '853',
  MP: '1670',
  MQ: '596',
  MR: '222',
  MS: '1664',
  MT: '356',
  MU: '230',
  MV: '960',
  MW: '265',
  MX: '52',
  MY: '60',
  MZ: '258',
  NA: '264',
  NC: '687',
  NE: '227',
  NF: '672',
  NG: '234',
  NI: '505',
  NL: '31',
  NO: '47',
  NP: '977',
  NR: '674',
  NU: '683',
  NZ: '64',
  OM: '968',
  PA: '507',
  PE: '51',
  PF: '689',
  PG: '675',
  PH: '63',
  PK: '92',
  PL: '48',
  PM: '508',
  PN: '64',
  PR: '1787',
  PS: '970',
  PT: '351',
  PW: '680',
  PY: '595',
  QA: '974',
  RE: '262',
  RO: '40',
  RS: '381',
  RU: '7',
  RW: '250',
  SA: '966',
  SB: '677',
  SC: '248',
  SD: '249',
  SE: '46',
  SG: '65',
  SH: '290',
  SI: '386',
  SJ: '47',
  SK: '421',
  SL: '232',
  SM: '378',
  SN: '221',
  SO: '252',
  SR: '597',
  SS: '211',
  ST: '239',
  SV: '503',
  SX: '1721',
  SY: '963',
  SZ: '268',
  TC: '1649',
  TD: '235',
  TF: '262',
  TG: '228',
  TH: '66',
  TJ: '992',
  TK: '690',
  TL: '670',
  TM: '993',
  TN: '216',
  TO: '676',
  TR: '90',
  TT: '1868',
  TV: '688',
  TW: '886',
  TZ: '255',
  UA: '380',
  UG: '256',
  UM: '1',
  US: '1',
  UY: '598',
  UZ: '998',
  VA: '379',
  VC: '1784',
  VE: '58',
  VG: '1284',
  VI: '1340',
  VN: '84',
  VU: '678',
  WF: '681',
  WS: '685',
  XK: '383',
  YE: '967',
  YT: '262',
  ZA: '27',
  ZM: '260',
  ZW: '263',
};

const LEBANON_DIAL_PREFIX_OPTIONS: DialPrefixOption[] = [
  { countryCode: 'LB', country: 'Lebanon', prefix: '9611', destination: 'Lebanon Beirut Landline', callType: 'landline' },
  { countryCode: 'LB', country: 'Lebanon', prefix: '9614', destination: 'Lebanon Mount Lebanon Landline', callType: 'landline' },
  { countryCode: 'LB', country: 'Lebanon', prefix: '9615', destination: 'Lebanon Mount Lebanon Landline', callType: 'landline' },
  { countryCode: 'LB', country: 'Lebanon', prefix: '9616', destination: 'Lebanon North Landline', callType: 'landline' },
  { countryCode: 'LB', country: 'Lebanon', prefix: '9617', destination: 'Lebanon South Landline', callType: 'landline' },
  { countryCode: 'LB', country: 'Lebanon', prefix: '9618', destination: 'Lebanon Bekaa Landline', callType: 'landline' },
  { countryCode: 'LB', country: 'Lebanon', prefix: '9619', destination: 'Lebanon Mount Lebanon Landline', callType: 'landline' },
  { countryCode: 'LB', country: 'Lebanon', prefix: '9613', destination: 'Lebanon Mobile', callType: 'mobile' },
  { countryCode: 'LB', country: 'Lebanon', prefix: '96170', destination: 'Lebanon Mobile', callType: 'mobile' },
  { countryCode: 'LB', country: 'Lebanon', prefix: '96171', destination: 'Lebanon Mobile', callType: 'mobile' },
  { countryCode: 'LB', country: 'Lebanon', prefix: '96176', destination: 'Lebanon Mobile', callType: 'mobile' },
  { countryCode: 'LB', country: 'Lebanon', prefix: '96178', destination: 'Lebanon Mobile', callType: 'mobile' },
  { countryCode: 'LB', country: 'Lebanon', prefix: '96179', destination: 'Lebanon Mobile', callType: 'mobile' },
  { countryCode: 'LB', country: 'Lebanon', prefix: '96181', destination: 'Lebanon Mobile', callType: 'mobile' },
];

const countryDialPrefixOptions: DialPrefixOption[] = countryOptions.flatMap((country) => {
  const prefix = COUNTRY_DIAL_CODES[country.code];
  if (!prefix) return [];

  return [
    {
      countryCode: country.code,
      country: country.name,
      prefix,
      destination: `${country.name} All Destinations`,
      callType: 'all' as const,
    },
    {
      countryCode: country.code,
      country: country.name,
      prefix,
      destination: `${country.name} Landline`,
      callType: 'landline' as const,
    },
    {
      countryCode: country.code,
      country: country.name,
      prefix,
      destination: `${country.name} Mobile`,
      callType: 'mobile' as const,
    },
  ];
});

const dialPrefixOptions = [...LEBANON_DIAL_PREFIX_OPTIONS, ...countryDialPrefixOptions]
  .sort((a, b) => a.country.localeCompare(b.country) || a.prefix.localeCompare(b.prefix));

async function unwrap<T>(response: Response): Promise<T> {
  const payload = await response.json();
  return (payload?.data ?? payload) as T;
}

function parseError(error: Error) {
  return error.message.replace(/^\d+:\s*/, '');
}

function selectValue(value: string) {
  return value || 'none';
}

function apiValue(value: string) {
  return value === 'none' ? '' : value;
}

function countryLabel(value: string) {
  if (!value) return '--Select--';
  const normalized = value.trim().toLowerCase();
  const match = countryOptions.find((country) =>
    country.name.toLowerCase() === normalized || country.code.toLowerCase() === normalized,
  );
  return match ? `${match.name} (${match.code})` : value;
}

function countryCodeFromValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return countryOptions.find((country) =>
    country.name.toLowerCase() === normalized || country.code.toLowerCase() === normalized,
  )?.code || '';
}

function callTypeLabel(value: DialPrefixCallType | string) {
  switch (value) {
    case 'international':
      return 'International';
    case 'local':
      return 'Local';
    case 'internal_sip':
      return 'Internal SIP';
    case 'sip_to_sip':
      return 'SIP To SIP';
    case 'did':
      return 'DID';
    case 'landline':
      return 'Landline';
    case 'mobile':
      return 'Mobile';
    case 'toll_free':
      return 'Toll Free';
    case 'premium':
      return 'Premium';
    default:
      return 'All Destinations';
  }
}

function prefixOptionsFor(country: string, callType: string) {
  const selectedCountryCode = countryCodeFromValue(country);
  const selectedCallType = ['landline', 'mobile', 'toll_free', 'premium'].includes(apiValue(callType))
    ? apiValue(callType)
    : '';

  return dialPrefixOptions.filter((option) => {
    const countryMatches = !selectedCountryCode || option.countryCode === selectedCountryCode;
    const callTypeMatches = !selectedCallType || option.callType === 'all' || option.callType === selectedCallType;
    return countryMatches && callTypeMatches;
  });
}

export default function AdminSipTariffForm({ mode, tariffId }: { mode: Mode; tariffId?: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [form, setForm] = useState<FormState>(initialForm);
  const isEdit = mode === 'edit';

  const tariffQuery = useQuery<{ tariff: FormState & { metadata?: Record<string, any> } }>({
    queryKey: [`/api/admin/sip-tariffs/${tariffId}`],
    enabled: isEdit && Boolean(tariffId),
  });
  const parentTariffQuery = useQuery<{ tariff: FormState & { metadata?: Record<string, any> } }>({
    queryKey: [`/api/admin/sip-tariffs/${form.parentTariffId}`],
    enabled: Boolean(form.parentTariffId),
  });
  const rateGroupsQuery = useQuery<{ data: RateGroup[] }>({
    queryKey: ['/api/admin/sip-rate-groups'],
  });
  const rateGroups = rateGroupsQuery.data?.data || [];
  const isOrigination = form.tariffType === 'international';
  const isTariffName = form.originationKind === 'tariff';
  const isDestination = form.originationKind === 'destination';
  const sipAccountsQuery = useQuery<{ data: SipAccountOption[] }>({
    queryKey: ['/api/admin/sip-users', { limit: 100 }],
    enabled: isDestination,
  });
  const didNumbersQuery = useQuery<{ numbers: DidNumberOption[] }>({
    queryKey: ['/api/admin/sip-users/available-numbers', { limit: 200 }],
    enabled: isDestination,
  });
  const sipAccounts = sipAccountsQuery.data?.data || [];
  const didNumbers = didNumbersQuery.data?.numbers || [];
  const parentTariffName = parentTariffQuery.data?.tariff?.name || form.parentTariffName;
  const tariffFamilyLabel = isOrigination ? 'Origination' : 'Internal';
  const pageTitle = isTariffName
    ? isEdit ? `Edit ${tariffFamilyLabel} Tariff` : `Create ${tariffFamilyLabel} Tariff`
    : isDestination
      ? isEdit ? 'Edit Destination' : 'Create Destination'
      : isEdit ? 'Edit Internal Tariff' : 'Create Internal Tariff';
  const backHref = isDestination && form.parentTariffId
    ? `/admin/sip-configuration/tariffs/${isOrigination ? 'origination' : 'internal'}/${form.parentTariffId}`
    : '/admin/sip-configuration/tariffs';

  useEffect(() => {
    if (isEdit) return;
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const parentId = params.get('parentId') || '';
    const kind = params.get('kind');
    setForm((current) => ({
      ...current,
      tariffType: type === 'international' ? 'international' : 'internal',
      originationKind: parentId ? 'destination' : (kind === 'origination_tariff' || kind === 'internal_tariff') ? 'tariff' : 'tariff',
      parentTariffId: parentId,
    }));
  }, [isEdit]);

  useEffect(() => {
    if (!parentTariffQuery.data?.tariff || isEdit) return;
    setForm((current) => ({
      ...current,
      parentTariffName: parentTariffQuery.data.tariff.name,
    }));
  }, [isEdit, parentTariffQuery.data?.tariff]);

  useEffect(() => {
    const tariff = tariffQuery.data?.tariff;
    if (!tariff) return;
    const metadata = tariff.metadata || {};
    setForm({
      ...initialForm,
      ...tariff,
      billingIncrementSeconds: String(tariff.billingIncrementSeconds || 60),
      originationKind: ['origination_destination', 'internal_destination'].includes(metadata.kind) ? 'destination' : 'tariff',
      rateGroupId: metadata.rateGroupId || '',
      prefix: metadata.prefix || '',
      destination: metadata.destination || '',
      country: metadata.country || countryOptions.find((country) => country.code === metadata.countryCode)?.name || '',
      callType: metadata.callType || '',
      routingType: metadata.routingType || '',
      providerTrunk: metadata.providerTrunk || '',
      parentTariffId: metadata.parentTariffId || '',
      parentTariffName: metadata.parentTariffName || metadata.tariffName || '',
      targetSipAccountId: metadata.targetSipAccountId || '',
      targetSipAccountLabel: metadata.targetSipAccountLabel || '',
      targetSipUsername: metadata.targetSipUsername || '',
      targetSipUri: metadata.targetSipUri || '',
      didNumberId: metadata.didNumberId || '',
      didNumber: metadata.didNumber || '',
      buyingCost: metadata.buyingCost || tariff.connectionFee || '0.0000',
      sellingPrice: metadata.sellingPrice || tariff.ratePerMinute || '0.0000',
      graceTime: metadata.graceTime || '0',
      costPerMinute: metadata.costPerMinute || tariff.ratePerMinute || '0.0000',
      initialIncrement: metadata.initialIncrement || String(tariff.billingIncrementSeconds || 60),
      increment: metadata.increment || String(tariff.billingIncrementSeconds || 60),
    });
  }, [tariffQuery.data?.tariff]);

  const autoName = useMemo(() => {
    if (!isDestination) return form.name;
    return form.name || [form.destination, form.prefix].filter(Boolean).join(' / ');
  }, [isDestination, form.name, form.destination, form.prefix]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const currentMetadata = tariffQuery.data?.tariff?.metadata || {};
      const metadata = isTariffName
        ? {
            ...currentMetadata,
            kind: isOrigination ? 'origination_tariff' : 'internal_tariff',
            tariffName: form.name,
          }
        : isDestination
          ? {
            ...currentMetadata,
            kind: isOrigination ? 'origination_destination' : 'internal_destination',
            parentTariffId: form.parentTariffId,
            parentTariffName,
            tariffName: parentTariffName || form.parentTariffName,
            rateGroupId: apiValue(form.rateGroupId),
            prefix: form.prefix,
            destination: form.destination,
            country: form.country,
            countryCode: countryCodeFromValue(form.country),
            callType: form.callType,
            routingType: form.routingType,
            targetSipAccountId: form.targetSipAccountId,
            targetSipAccountLabel: form.targetSipAccountLabel,
            targetSipUsername: form.targetSipUsername,
            targetSipUri: form.targetSipUri,
            didNumberId: form.didNumberId,
            didNumber: form.didNumber,
            buyingCost: form.buyingCost,
            sellingPrice: form.sellingPrice,
            graceTime: form.graceTime,
            costPerMinute: form.costPerMinute,
            initialIncrement: form.initialIncrement,
            increment: form.increment,
          }
        : {};
      const body = {
        name: autoName || form.name,
        tariffType: form.tariffType,
        description: form.description,
        currency: form.currency.toUpperCase(),
        connectionFee: isDestination ? form.buyingCost || form.connectionFee : form.connectionFee,
        ratePerMinute: isDestination ? form.sellingPrice || form.ratePerMinute : form.ratePerMinute,
        billingIncrementSeconds: Number(isDestination ? form.increment || form.billingIncrementSeconds : form.billingIncrementSeconds || 60),
        status: form.status,
        metadata,
      };
      const response = isEdit
        ? await apiRequest('PATCH', `/api/admin/sip-tariffs/${tariffId}`, body)
        : await apiRequest('POST', '/api/admin/sip-tariffs', body);
      return unwrap(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/sip-tariffs'] });
      toast({ title: `${tariffFamilyLabel} Tariff Saved`, description: 'The Rate Was Saved Successfully.' });
      navigate(backHref);
    },
    onError: (error: Error) => {
      toast({ title: isEdit ? 'Update Failed' : 'Create Failed', description: parseError(error), variant: 'destructive' });
    },
  });

  const missingCallTarget =
    (form.callType === 'sip_to_sip' && !form.targetSipAccountId) ||
    (form.callType === 'did' && !form.didNumber.trim());
  const saveDisabled = saveMutation.isPending || (
    isTariffName
      ? !form.name.trim()
      : isDestination
        ? !form.parentTariffId || !form.rateGroupId || !autoName.trim() || !form.callType || missingCallTarget
      : !form.name.trim()
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            <PhoneCall className="h-8 w-8 text-cyan-300" />
            {pageTitle}
          </h1>
          <p className="mt-2 text-slate-400">Build Rate Tables For Internal SIP Calls Or Origination Routes.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className={outlineButtonClass}>
            <Link href={backHref}>
              <X className="h-4 w-4" />
              Close
            </Link>
          </Button>
          <Button asChild variant="outline" className={outlineButtonClass}>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              Back To Tariff's
            </Link>
          </Button>
        </div>
      </div>

      {isTariffName ? (
        <OriginationTariffNameForm
          form={form}
          title={`${tariffFamilyLabel} Tariff Name`}
          placeholder={isOrigination ? 'Retail' : 'Internal Standard'}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onSave={() => saveMutation.mutate()}
          saving={saveMutation.isPending}
          saveDisabled={saveDisabled}
        />
      ) : isDestination ? (
        <OriginationRateForm
          form={form}
          parentName={parentTariffName}
          rateGroups={rateGroups}
          sipAccounts={sipAccounts}
          didNumbers={didNumbers}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onSave={() => saveMutation.mutate()}
          onCancel={() => navigate(backHref)}
          saving={saveMutation.isPending}
          saveDisabled={saveDisabled}
        />
      ) : (
        <InternalTariffForm
          form={form}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onSave={() => saveMutation.mutate()}
          saving={saveMutation.isPending}
          saveDisabled={saveDisabled}
        />
      )}
    </div>
  );
}

function InternalTariffForm({
  form,
  onChange,
  onSave,
  saving,
  saveDisabled,
}: {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
  onSave: () => void;
  saving: boolean;
  saveDisabled: boolean;
}) {
  return (
    <Card className={panelClass}>
      <CardHeader>
        <CardTitle>Internal Tariff Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tariff Name" value={form.name} onChange={(name) => onChange({ name })} />
          <SelectField label="Tariff Type" value={form.tariffType} onChange={(tariffType) => onChange({ tariffType: tariffType as FormState['tariffType'] })}>
            <SelectItem className={selectItemClass} value="internal">Internal Tariff</SelectItem>
            <SelectItem className={selectItemClass} value="international">Origination Rates</SelectItem>
          </SelectField>
          <Field label="Currency" value={form.currency} onChange={(currency) => onChange({ currency })} placeholder="USD" />
          <SelectField label="Status" value={form.status} onChange={(status) => onChange({ status: status as FormState['status'] })}>
            <SelectItem className={selectItemClass} value="active">Active</SelectItem>
            <SelectItem className={selectItemClass} value="inactive">Inactive</SelectItem>
          </SelectField>
          <Field label="Connection Fee" value={form.connectionFee} onChange={(connectionFee) => onChange({ connectionFee })} placeholder="0.0000" />
          <Field label="Rate Per Minute" value={form.ratePerMinute} onChange={(ratePerMinute) => onChange({ ratePerMinute })} placeholder="0.0000" />
          <Field label="Billing Increment Seconds" value={form.billingIncrementSeconds} onChange={(billingIncrementSeconds) => onChange({ billingIncrementSeconds })} placeholder="60" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea className={inputClass} value={form.description} onChange={(event) => onChange({ description: event.target.value })} />
        </div>
        <div className="flex justify-end gap-3">
          <Button asChild variant="outline" className={outlineButtonClass}>
            <Link href="/admin/sip-configuration/tariffs">Cancel</Link>
          </Button>
          <Button className={primaryButtonClass} disabled={saveDisabled} onClick={onSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OriginationTariffNameForm({
  form,
  title,
  placeholder,
  onChange,
  onSave,
  saving,
  saveDisabled,
}: {
  form: FormState;
  title: string;
  placeholder: string;
  onChange: (patch: Partial<FormState>) => void;
  onSave: () => void;
  saving: boolean;
  saveDisabled: boolean;
}) {
  return (
    <Card className={panelClass}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tariff Name" value={form.name} onChange={(name) => onChange({ name })} placeholder={placeholder} />
          <Field label="Currency" value={form.currency} onChange={(currency) => onChange({ currency })} placeholder="USD" />
          <SelectField label="Status" value={form.status} onChange={(status) => onChange({ status: status as FormState['status'] })}>
            <SelectItem className={selectItemClass} value="active">Active</SelectItem>
            <SelectItem className={selectItemClass} value="inactive">Inactive</SelectItem>
          </SelectField>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea className={inputClass} value={form.description} onChange={(event) => onChange({ description: event.target.value })} placeholder="Optional notes for this tariff table" />
        </div>
        <div className="flex justify-end gap-3">
          <Button asChild variant="outline" className={outlineButtonClass}>
            <Link href="/admin/sip-configuration/tariffs">Cancel</Link>
          </Button>
          <Button className={primaryButtonClass} disabled={saveDisabled} onClick={onSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Tariff Name
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OriginationRateForm({
  form,
  parentName,
  rateGroups,
  sipAccounts,
  didNumbers,
  onChange,
  onSave,
  onCancel,
  saving,
  saveDisabled,
}: {
  form: FormState;
  parentName: string;
  rateGroups: RateGroup[];
  sipAccounts: SipAccountOption[];
  didNumbers: DidNumberOption[];
  onChange: (patch: Partial<FormState>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  saveDisabled: boolean;
}) {
  const isInternationalCall = form.callType === 'international';
  const isLocalCall = form.callType === 'local';
  const isSipToSipCall = form.callType === 'sip_to_sip';
  const isDidCall = form.callType === 'did';
  const sipAccountOptions: ComboboxOption[] = sipAccounts.map((account) => {
    const accountName = account.user?.name || account.user?.email || account.username;
    const label = `${account.username}${accountName ? ` - ${accountName}` : ''}`;
    return {
      value: account.id,
      label,
      description: account.uri || account.domain || account.user?.phone || '',
      meta: account as unknown as Record<string, any>,
    };
  });
  const didNumberOptions: ComboboxOption[] = didNumbers.map((number) => ({
    value: number.id,
    label: number.msisdn,
    description: [number.countryCode, number.provider].filter(Boolean).join(' - '),
    meta: number as unknown as Record<string, any>,
  }));

  return (
    <div className={originationShellClass}>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
        <section className="space-y-5">
          <h2 className="text-xl font-medium text-slate-950">Rate Information</h2>
          <div className="grid gap-x-5 gap-y-4 2xl:grid-cols-2">
            <CompactReadOnlyField label="Tariff Name" value={parentName || form.parentTariffName || 'Selected Tariff'} />
            <CompactField label="Destination Name *" value={form.name} onChange={(name) => onChange({ name })} placeholder="Afghanistan Cellular-AT" />
            <CompactSelectField label="Rate Group *" value={selectValue(form.rateGroupId)} onChange={(rateGroupId) => onChange({ rateGroupId: apiValue(rateGroupId) })}>
              <SelectItem className={selectItemClass} value="none">--Select--</SelectItem>
              {rateGroups.map((group) => (
                <SelectItem className={selectItemClass} key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </CompactSelectField>
            <CompactSelectField
              label="Call Type *"
              value={selectValue(form.callType)}
              onChange={(callType) => onChange({
                callType: apiValue(callType),
                ...(apiValue(callType) !== 'sip_to_sip'
                  ? { targetSipAccountId: '', targetSipAccountLabel: '', targetSipUsername: '', targetSipUri: '' }
                  : {}),
                ...(apiValue(callType) !== 'did'
                  ? { didNumberId: '', didNumber: '' }
                  : {}),
              })}
            >
              <SelectItem className={selectItemClass} value="none">--Select--</SelectItem>
              <SelectItem className={selectItemClass} value="international">International</SelectItem>
              <SelectItem className={selectItemClass} value="local">Local</SelectItem>
              <SelectItem className={selectItemClass} value="internal_sip">Internal SIP</SelectItem>
              <SelectItem className={selectItemClass} value="sip_to_sip">SIP To SIP</SelectItem>
              <SelectItem className={selectItemClass} value="did">DID</SelectItem>
            </CompactSelectField>
            {isInternationalCall ? (
              <>
                <CountryComboboxField label="Country" value={form.country} onChange={(country) => onChange({ country })} />
                <PrefixComboboxField
                  label="Prefix List"
                  value={form.prefix}
                  destination={form.destination}
                  country={form.country}
                  callType={form.callType}
                  onSelect={(option) => onChange({
                    prefix: option.prefix,
                    destination: option.prefix,
                    country: option.country,
                    name: form.name || option.destination,
                  })}
                />
                <CompactField label="Prefix" value={form.prefix} onChange={(prefix) => onChange({ prefix, destination: form.destination || prefix })} placeholder="96171" />
                <CompactField label="Destination" value={form.destination} onChange={(destination) => onChange({ destination })} placeholder="96171" />
              </>
            ) : null}
            {isLocalCall ? (
              <>
                <CompactField label="Local Prefix" value={form.prefix} onChange={(prefix) => onChange({ prefix, destination: form.destination || prefix })} placeholder="71 or 01" />
                <CompactField label="Destination" value={form.destination} onChange={(destination) => onChange({ destination })} placeholder="Local mobile or landline route" />
              </>
            ) : null}
            {isSipToSipCall ? (
              <OptionComboboxField
                label="SIP Account *"
                value={form.targetSipAccountId}
                placeholder="Select SIP Account"
                emptyMessage="No SIP Account Found."
                options={sipAccountOptions}
                onSelect={(option) => {
                  const account = option?.meta as SipAccountOption | undefined;
                  onChange({
                    targetSipAccountId: option?.value || '',
                    targetSipAccountLabel: option?.label || '',
                    targetSipUsername: account?.username || '',
                    targetSipUri: account?.uri || '',
                    destination: account?.username || '',
                    prefix: '',
                  });
                }}
              />
            ) : null}
            {isDidCall ? (
              <>
                <OptionComboboxField
                  label="DID List"
                  value={form.didNumberId || form.didNumber}
                  placeholder="Select DID Number"
                  emptyMessage="No DID Number Found."
                  options={didNumberOptions}
                  onSelect={(option) => {
                    const number = option?.meta as DidNumberOption | undefined;
                    onChange({
                      didNumberId: option?.value || '',
                      didNumber: number?.msisdn || option?.label || '',
                      destination: number?.msisdn || option?.label || '',
                      country: number?.countryCode || form.country,
                      prefix: '',
                    });
                  }}
                />
                <CompactField
                  label="DID Number *"
                  value={form.didNumber}
                  onChange={(didNumber) => onChange({ didNumber, destination: didNumber, didNumberId: '' })}
                  placeholder="96171724040"
                />
              </>
            ) : null}
            <CompactSelectField label="Routing Type" value={selectValue(form.routingType)} onChange={(routingType) => onChange({ routingType: apiValue(routingType) })}>
              <SelectItem className={selectItemClass} value="none">--Select--</SelectItem>
              <SelectItem className={selectItemClass} value="standard">Standard</SelectItem>
              <SelectItem className={selectItemClass} value="enterprise">Enterprise</SelectItem>
            </CompactSelectField>
            <CompactSelectField label="Status" value={form.status} onChange={(status) => onChange({ status: status as FormState['status'] })}>
              <SelectItem className={selectItemClass} value="active">Active</SelectItem>
              <SelectItem className={selectItemClass} value="inactive">Inactive</SelectItem>
            </CompactSelectField>
            <CompactField label="Currency" value={form.currency} onChange={(currency) => onChange({ currency })} placeholder="USD" />
          </div>
        </section>

        <div className="space-y-7">
          <section className="space-y-5">
            <h2 className="text-xl font-medium text-slate-950">Billing Information</h2>
            <div className="space-y-4">
              <CompactField label={`Buying Cost (${form.currency || 'USD'})`} value={form.buyingCost} onChange={(buyingCost) => onChange({ buyingCost, connectionFee: buyingCost })} placeholder="0.0000" />
              <CompactField label={`Selling Price (${form.currency || 'USD'})`} value={form.sellingPrice} onChange={(sellingPrice) => onChange({ sellingPrice, ratePerMinute: sellingPrice })} placeholder="0.0000" />
              <CompactField label="Grace Time" value={form.graceTime} onChange={(graceTime) => onChange({ graceTime })} placeholder="0" />
              <CompactField label={`Cost / Min (${form.currency || 'USD'})`} value={form.costPerMinute} onChange={(costPerMinute) => onChange({ costPerMinute })} placeholder="0.0000" />
              <CompactField label="Initial Increment" value={form.initialIncrement} onChange={(initialIncrement) => onChange({ initialIncrement })} placeholder="60" />
              <CompactField label="Increment" value={form.increment} onChange={(increment) => onChange({ increment, billingIncrementSeconds: increment })} placeholder="60" />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-slate-950">Quick Actions</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className={quickSecondaryButtonClass} onClick={onCancel}>
                Cancel
              </Button>
              <Button className={quickPrimaryButtonClass} disabled={saveDisabled} onClick={onSave}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save Rate'}
              </Button>
            </div>
          </section>
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

function CompactField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center">
      <Label className={compactLabelClass}>{label}:</Label>
      <Input className={compactInputClass} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function CompactReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center">
      <Label className={compactLabelClass}>{label}:</Label>
      <div className="flex h-8 items-center rounded-md border border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-700">
        {value}
      </div>
    </div>
  );
}

function PrefixComboboxField({
  label,
  value,
  destination,
  country,
  callType,
  onSelect,
}: {
  label: string;
  value: string;
  destination: string;
  country: string;
  callType: string;
  onSelect: (option: DialPrefixOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => prefixOptionsFor(country, callType), [country, callType]);
  const selectedOption = dialPrefixOptions.find((option) =>
    option.prefix === value && (!destination || option.destination === destination),
  );
  const displayValue = value
    ? `${value}${destination && destination !== value ? ` - ${destination}` : ''}`
    : 'Search Prefix, Country, Or Destination';

  return (
    <div className="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center">
      <Label className={compactLabelClass}>{label}:</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(compactSelectClass, 'flex w-full items-center justify-between px-3 text-left')}
          >
            <span className={cn('truncate', !value && 'text-slate-400')}>{displayValue}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] border-slate-200 bg-white p-0 text-slate-950 shadow-lg">
          <Command className="bg-white text-slate-950">
            <CommandInput className="text-slate-950 placeholder:text-slate-400" placeholder="Search prefix, country, city, mobile..." />
            <CommandList className="max-h-80">
              <CommandEmpty>No Prefix Found. Use The Manual Prefix Field.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const selected = selectedOption?.prefix === option.prefix && selectedOption?.destination === option.destination;

                  return (
                    <CommandItem
                      key={`${option.countryCode}-${option.prefix}-${option.callType}-${option.destination}`}
                      value={`${option.prefix} ${option.country} ${option.countryCode} ${option.destination} ${callTypeLabel(option.callType)}`}
                      className="cursor-pointer text-slate-900 data-[selected=true]:bg-teal-100 data-[selected=true]:text-slate-950"
                      onSelect={() => {
                        onSelect(option);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-950">{option.prefix}</span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{callTypeLabel(option.callType)}</span>
                        </div>
                        <div className="truncate text-xs text-slate-500">{option.destination}</div>
                      </div>
                      <span className="ml-3 shrink-0 text-xs font-medium text-slate-500">{option.countryCode}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function OptionComboboxField({
  label,
  value,
  placeholder,
  emptyMessage,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  placeholder: string;
  emptyMessage: string;
  options: ComboboxOption[];
  onSelect: (option: ComboboxOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value || option.label === value);

  return (
    <div className="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center">
      <Label className={compactLabelClass}>{label}:</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(compactSelectClass, 'flex w-full items-center justify-between px-3 text-left')}
          >
            <span className={cn('truncate', !selectedOption && 'text-slate-400')}>{selectedOption?.label || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] border-slate-200 bg-white p-0 text-slate-950 shadow-lg">
          <Command className="bg-white text-slate-950">
            <CommandInput className="text-slate-950 placeholder:text-slate-400" placeholder={placeholder} />
            <CommandList className="max-h-80">
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="clear selection none"
                  className="cursor-pointer text-slate-900 data-[selected=true]:bg-teal-100 data-[selected=true]:text-slate-950"
                  onSelect={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                  --Select--
                </CommandItem>
                {options.map((option) => {
                  const selected = selectedOption?.value === option.value;

                  return (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.description || ''}`}
                      className="cursor-pointer text-slate-900 data-[selected=true]:bg-teal-100 data-[selected=true]:text-slate-950"
                      onSelect={() => {
                        onSelect(option);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-950">{option.label}</div>
                        {option.description ? <div className="truncate text-xs text-slate-500">{option.description}</div> : null}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CountryComboboxField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const normalizedValue = value.trim().toLowerCase();

  return (
    <div className="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center">
      <Label className={compactLabelClass}>{label}:</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(compactSelectClass, 'flex w-full items-center justify-between px-3 text-left')}
          >
            <span className={cn('truncate', !value && 'text-slate-400')}>{countryLabel(value)}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] border-slate-200 bg-white p-0 text-slate-950 shadow-lg">
          <Command className="bg-white text-slate-950">
            <CommandInput className="text-slate-950 placeholder:text-slate-400" placeholder="Search country name or code..." />
            <CommandList className="max-h-80">
              <CommandEmpty>No Country Found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="clear country none select"
                  className="cursor-pointer text-slate-900 data-[selected=true]:bg-teal-100 data-[selected=true]:text-slate-950"
                  onSelect={() => {
                    onChange('');
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                  --Select--
                </CommandItem>
                {countryOptions.map((country) => {
                  const selected = normalizedValue === country.name.toLowerCase() || normalizedValue === country.code.toLowerCase();

                  return (
                    <CommandItem
                      key={country.code}
                      value={`${country.name} ${country.code}`}
                      className="cursor-pointer text-slate-900 data-[selected=true]:bg-teal-100 data-[selected=true]:text-slate-950"
                      onSelect={() => {
                        onChange(country.name);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">{country.name}</span>
                      <span className="ml-auto text-xs font-medium text-slate-500">{country.code}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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

function CompactSelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center">
      <Label className={compactLabelClass}>{label}:</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={compactSelectClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={selectContentClass}>{children}</SelectContent>
      </Select>
    </div>
  );
}
