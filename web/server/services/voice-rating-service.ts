import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from 'server/db';
import { sipTariffs, userVirtualNumbers, users } from '@shared/schema';
import {
  ensureSipCommercialSchema,
  getDefaultSipRegistrationProfile,
  mergeSipFeatureSettings,
} from 'server/services/sip-commercial-service';

type SipTariff = typeof sipTariffs.$inferSelect;
type UserVirtualNumber = typeof userVirtualNumbers.$inferSelect;

export type VoiceCallType = 'internal' | 'international';

export type VoiceRateQuote = {
  source: 'esim';
  destination: string;
  normalizedDestination: string;
  callType: VoiceCallType;
  currency: string;
  balance: string;
  connectionFee: string;
  ratePerMinute: string;
  billingIncrementSeconds: number;
  availableMinutes: number | null;
  unlimited: boolean;
  canCall: boolean;
  requiresDid: boolean;
  didNumber: string | null;
  callerId: string | null;
  tariff: {
    id: string;
    name: string;
  } | null;
  message: string;
};

function trim(value: unknown) {
  return String(value || '').trim();
}

function asMoney(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? '0'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number, digits = 4) {
  return Math.max(0, value).toFixed(digits);
}

function normalizeMoneyInput(value: unknown) {
  return asMoney(value).toFixed(2);
}

function cleanMetadata(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function normalizePrefix(value: unknown) {
  const raw = trim(value);
  if (!raw || raw === '*') return '';
  const compact = raw.startsWith('+') ? raw.slice(1) : raw;
  return compact.replace(/\D/g, '');
}

function compactDialString(value: string) {
  return value.replace(/[\s().-]/g, '');
}

const didRequiredMessage =
  'Please Buy DID eRoaming Number. International Calls require an eRoaming Number.';
const fullDestinationMessage = 'Invalid number. Check the number and try again.';

function isInternalVoiceDestination(value: string) {
  const raw = trim(value);
  if (/^sips?:/i.test(raw)) return true;

  const compact = compactDialString(raw);
  return (
    /^91\d{4,6}$/.test(compact) || /^10\d{4,13}$/.test(compact) || /^\*[0-9]{2,6}$/.test(compact)
  );
}

function normalizeInternationalCandidate(value: string) {
  const compact = compactDialString(value);
  return compact.startsWith('00')
    ? `+${compact.slice(2)}`
    : compact.startsWith('+')
      ? compact
      : /^[1-9]\d{9,14}$/.test(compact)
        ? `+${compact}`
        : '';
}

function isRecognizedVoiceDestination(value: string) {
  if (isInternalVoiceDestination(value)) return true;
  return /^\+[1-9]\d{7,14}$/.test(normalizeInternationalCandidate(value));
}

export function normalizeVoiceDestination(destination: string): {
  callType: VoiceCallType;
  normalizedDestination: string;
  digits: string;
} {
  const raw = trim(destination);
  if (!raw) {
    return { callType: 'internal', normalizedDestination: '', digits: '' };
  }

  if (/^sips?:/i.test(raw)) {
    const digits =
      raw
        .replace(/^sips?:/i, '')
        .split('@')[0]
        ?.replace(/\D/g, '') || '';
    return { callType: 'internal', normalizedDestination: raw, digits };
  }

  const compact = compactDialString(raw);
  if (isInternalVoiceDestination(raw)) {
    return {
      callType: 'internal',
      normalizedDestination: compact,
      digits: compact.replace(/\D/g, ''),
    };
  }

  const internationalCandidate = normalizeInternationalCandidate(raw);

  if (/^\+[1-9]\d{7,14}$/.test(internationalCandidate)) {
    return {
      callType: 'international',
      normalizedDestination: internationalCandidate,
      digits: internationalCandidate.slice(1),
    };
  }

  return {
    callType: 'internal',
    normalizedDestination: compact,
    digits: compact.replace(/\D/g, ''),
  };
}

function tariffPrefixes(tariff: SipTariff) {
  const metadata = cleanMetadata(tariff.metadata);
  const values: unknown[] = [
    metadata.prefix,
    metadata.destinationPrefix,
    metadata.dialPrefix,
    metadata.dialingPrefix,
    metadata.countryDialCode,
    metadata.countryCallingCode,
    metadata.e164Prefix,
  ];

  for (const key of ['prefixes', 'destinationPrefixes', 'dialPrefixes']) {
    const arrayValue = metadata[key];
    if (Array.isArray(arrayValue)) values.push(...arrayValue);
  }

  return values
    .map(normalizePrefix)
    .filter((prefix, index, array) => prefix && array.indexOf(prefix) === index);
}

async function getVoiceFeatureSettings() {
  const profile = await getDefaultSipRegistrationProfile();
  return mergeSipFeatureSettings(profile);
}

function destinationPrefixCandidates(destinationDigits: string) {
  const digits = destinationDigits.replace(/\D/g, '');
  const candidates: string[] = [];
  for (let length = digits.length; length > 0; length -= 1) {
    candidates.push(digits.slice(0, length));
  }
  return candidates;
}

async function getBestTariff(
  type: VoiceCallType,
  destinationDigits: string,
  preferredId?: string | null,
) {
  await ensureSipCommercialSchema();

  const preferred = trim(preferredId);
  if (preferred) {
    const [matched] = await db
      .select()
      .from(sipTariffs)
      .where(
        and(
          eq(sipTariffs.id, preferred),
          eq(sipTariffs.tariffType, type),
          eq(sipTariffs.status, 'active'),
        ),
      )
      .limit(1);
    if (matched) return matched;
  }

  if (type === 'internal') {
    const [tariff] = await db
      .select()
      .from(sipTariffs)
      .where(and(eq(sipTariffs.tariffType, type), eq(sipTariffs.status, 'active')))
      .orderBy(desc(sipTariffs.updatedAt), desc(sipTariffs.createdAt))
      .limit(1);
    return tariff || null;
  }

  const prefixes = destinationPrefixCandidates(destinationDigits);
  if (prefixes.length > 0) {
    const [matched] = await db
      .select()
      .from(sipTariffs)
      .where(
        and(
          eq(sipTariffs.tariffType, 'international'),
          eq(sipTariffs.status, 'active'),
          inArray(sql<string>`${sipTariffs.metadata}->>'prefix'`, prefixes),
        ),
      )
      .orderBy(
        sql`length(${sipTariffs.metadata}->>'prefix') desc`,
        desc(sipTariffs.updatedAt),
        desc(sipTariffs.createdAt),
      )
      .limit(1);
    if (matched) return matched;
  }

  const [generic] = await db
    .select()
    .from(sipTariffs)
    .where(
      and(
        eq(sipTariffs.tariffType, 'international'),
        eq(sipTariffs.status, 'active'),
        sql`coalesce(nullif(${sipTariffs.metadata}->>'prefix', '*'), '') = ''`,
      ),
    )
    .orderBy(desc(sipTariffs.updatedAt), desc(sipTariffs.createdAt))
    .limit(1);

  return generic || null;
}

async function getPrimaryActiveDid(userId: string) {
  const numbers = await db
    .select()
    .from(userVirtualNumbers)
    .where(and(eq(userVirtualNumbers.userId, userId), eq(userVirtualNumbers.status, 'active')))
    .orderBy(desc(userVirtualNumbers.assignedAt), desc(userVirtualNumbers.createdAt))
    .limit(20);

  return (
    numbers.find((number) => {
      const capabilities = cleanMetadata(number.capabilities);
      return capabilities.voice !== false && capabilities.outbound !== false;
    }) || null
  );
}

function buildQuote({
  destination,
  normalizedDestination,
  callType,
  balance,
  tariff,
  ratePerMinute,
  connectionFee,
  billingIncrementSeconds,
  did,
  canCall,
  requiresDid,
  message,
}: {
  destination: string;
  normalizedDestination: string;
  callType: VoiceCallType;
  balance: number;
  tariff: SipTariff | null;
  ratePerMinute: number;
  connectionFee: number;
  billingIncrementSeconds: number;
  did: UserVirtualNumber | null;
  canCall: boolean;
  requiresDid: boolean;
  message: string;
}): VoiceRateQuote {
  const unlimited = canCall && ratePerMinute <= 0;
  const availableMinutes = unlimited
    ? null
    : ratePerMinute <= 0 || balance <= connectionFee
      ? 0
      : Math.floor(((balance - connectionFee) / ratePerMinute) * 100) / 100;

  return {
    source: 'esim',
    destination,
    normalizedDestination,
    callType,
    currency: tariff?.currency || 'USD',
    balance: normalizeMoneyInput(balance),
    connectionFee: formatMoney(connectionFee),
    ratePerMinute: formatMoney(ratePerMinute),
    billingIncrementSeconds,
    availableMinutes,
    unlimited,
    canCall,
    requiresDid,
    didNumber: did?.msisdn || null,
    callerId: did?.msisdn || null,
    tariff: tariff ? { id: tariff.id, name: tariff.name } : null,
    message,
  };
}

export async function quoteVoiceCall(userId: string, destination: string): Promise<VoiceRateQuote> {
  const trimmedDestination = trim(destination);
  const normalized = normalizeVoiceDestination(trimmedDestination);
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new Error('User not found');
  }

  const balance = asMoney(user.walletBalance);
  if (trimmedDestination && !isRecognizedVoiceDestination(trimmedDestination)) {
    return buildQuote({
      destination: trimmedDestination,
      normalizedDestination: normalized.normalizedDestination,
      callType: normalized.callType,
      balance,
      tariff: null,
      ratePerMinute: 0,
      connectionFee: 0,
      billingIncrementSeconds: 60,
      did: null,
      canCall: false,
      requiresDid: false,
      message: fullDestinationMessage,
    });
  }

  const did = normalized.callType === 'international' ? await getPrimaryActiveDid(userId) : null;
  if (normalized.callType === 'international' && !did) {
    return buildQuote({
      destination: trimmedDestination,
      normalizedDestination: normalized.normalizedDestination,
      callType: 'international',
      balance,
      tariff: null,
      ratePerMinute: 0,
      connectionFee: 0,
      billingIncrementSeconds: 60,
      did,
      canCall: false,
      requiresDid: true,
      message: didRequiredMessage,
    });
  }

  const settings = await getVoiceFeatureSettings();
  const preferredTariffId =
    normalized.callType === 'internal'
      ? trim(settings.internalTariffId)
      : trim(settings.internationalTariffId);
  const tariff = await getBestTariff(
    normalized.callType,
    normalized.digits,
    preferredTariffId || null,
  );
  const billingMode =
    normalized.callType === 'internal'
      ? trim(settings.internalBillingMode).toLowerCase()
      : trim(settings.internationalBillingMode).toLowerCase();
  const ratePerMinute = tariff ? asMoney(tariff.ratePerMinute) : 0;
  const connectionFee = tariff ? asMoney(tariff.connectionFee) : 0;
  const billingIncrementSeconds = Math.max(1, Number(tariff?.billingIncrementSeconds || 60));
  const hasConfiguredRate = Boolean(tariff) || billingMode === 'free';

  if (!trimmedDestination) {
    return buildQuote({
      destination: trimmedDestination,
      normalizedDestination: '',
      callType: normalized.callType,
      balance,
      tariff,
      ratePerMinute,
      connectionFee,
      billingIncrementSeconds,
      did,
      canCall: false,
      requiresDid: false,
      message: 'Enter a destination number first.',
    });
  }

  if (!hasConfiguredRate) {
    return buildQuote({
      destination: trimmedDestination,
      normalizedDestination: normalized.normalizedDestination,
      callType: normalized.callType,
      balance,
      tariff,
      ratePerMinute,
      connectionFee,
      billingIncrementSeconds,
      did,
      canCall: false,
      requiresDid: false,
      message:
        normalized.callType === 'internal'
          ? 'No eSIM internal rate is configured for this call.'
          : 'No eSIM international rate is configured for this destination.',
    });
  }

  if (ratePerMinute > 0 && balance + 0.0001 < connectionFee + ratePerMinute) {
    return buildQuote({
      destination: trimmedDestination,
      normalizedDestination: normalized.normalizedDestination,
      callType: normalized.callType,
      balance,
      tariff,
      ratePerMinute,
      connectionFee,
      billingIncrementSeconds,
      did,
      canCall: false,
      requiresDid: false,
      message: 'Insufficient wallet balance for this call.',
    });
  }

  if (normalized.callType === 'internal' && ratePerMinute <= 0) {
    return buildQuote({
      destination: trimmedDestination,
      normalizedDestination: normalized.normalizedDestination,
      callType: 'internal',
      balance,
      tariff,
      ratePerMinute,
      connectionFee,
      billingIncrementSeconds,
      did,
      canCall: true,
      requiresDid: false,
      message: 'Unlimited Internal Calls',
    });
  }

  return buildQuote({
    destination: trimmedDestination,
    normalizedDestination: normalized.normalizedDestination,
    callType: normalized.callType,
    balance,
    tariff,
    ratePerMinute,
    connectionFee,
    billingIncrementSeconds,
    did,
    canCall: true,
    requiresDid: false,
    message:
      normalized.callType === 'international' && ratePerMinute <= 0
        ? 'International calls are currently free for this destination.'
        : 'eSIM voice rate loaded.',
  });
}
