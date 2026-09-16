import { asc, eq, sql } from 'drizzle-orm';
import { db } from 'server/db';
import { sipRateGroups, sipRegistrationProfiles, sipTariffs } from '@shared/schema';

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

function defaultTrialSettings() {
  return paidFeaturePrefixes.reduce(
    (settings, prefix) => {
      settings[`${prefix}TrialEnabled`] = false;
      settings[`${prefix}TrialDays`] = '7';
      return settings;
    },
    {} as Record<string, boolean | string>,
  );
}

export const defaultSipFeatureSettings = {
  ...defaultTrialSettings(),
  registrationProfileId: null,
  registrationProfileName: '',
  allowInternalCalls: true,
  internalTariffType: 'internal',
  internalBillingMode: 'free',
  internalTariffId: '',
  internalTariffName: '',
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
  internationalTariffName: '',
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
  didSetupFee: '0.00',
  didMonthlyFee: '0.00',
  didEnabled: true,
  didBillingMode: 'free',
  didExtraChargeFixed: '0.00',
  didExtraChargePercent: '0',
  didWebEnabled: true,
  didMobileEnabled: true,
  allowedMultipleDids: false,
  sipEnabled: true,
  sipBillingMode: 'free',
  sipMonthlyFee: '0.00',
  sipSetupFee: '0.00',
  sipExtraChargeFixed: '0.00',
  sipExtraChargePercent: '0',
  sipWebEnabled: true,
  sipMobileEnabled: true,
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
  allocateNumberEnabled: false,
  allocatedNumberId: '',
  allocatedMsisdn: '',
  receiveInternationalCalls: false,
  receiveInternationalBillingMode: 'free',
  receiveInternationalTariffId: '',
  receiveInternationalTariffName: '',
  receiveInternationalSetupFee: '0.00',
  receiveInternationalMonthlyFee: '0.00',
  receiveInternationalExtraChargeFixed: '0.00',
  receiveInternationalExtraChargePercent: '0',
  receiveInternationalWebEnabled: true,
  receiveInternationalMobileEnabled: true,
  featureAccess: {
    web: {},
    mobile: {},
  },
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

let ensurePromise: Promise<void> | null = null;

function cleanMetadata(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

export function normalizeSipFeatureSettings(value: unknown) {
  const metadata = cleanMetadata(value);
  return {
    ...defaultSipFeatureSettings,
    ...metadata,
  };
}

export async function ensureSipCommercialSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS sip_tariffs (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          tariff_type text NOT NULL DEFAULT 'internal',
          description text,
          currency text NOT NULL DEFAULT 'USD',
          connection_fee numeric(10,4) NOT NULL DEFAULT 0.0000,
          rate_per_minute numeric(10,4) NOT NULL DEFAULT 0.0000,
          billing_increment_seconds integer NOT NULL DEFAULT 60,
          status text NOT NULL DEFAULT 'active',
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS sip_tariffs_type_idx ON sip_tariffs(tariff_type)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS sip_tariffs_status_idx ON sip_tariffs(status)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS sip_tariffs_prefix_lookup_idx ON sip_tariffs(tariff_type, status, ((metadata->>'prefix')))`,
      );

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS sip_rate_groups (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          description text,
          status text NOT NULL DEFAULT 'active',
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS sip_rate_groups_status_idx ON sip_rate_groups(status)`,
      );

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS sip_registration_profiles (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          description text,
          status text NOT NULL DEFAULT 'active',
          is_default boolean NOT NULL DEFAULT false,
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS sip_registration_profiles_status_idx ON sip_registration_profiles(status)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS sip_registration_profiles_is_default_idx ON sip_registration_profiles(is_default)`,
      );
    })();
  }

  return ensurePromise;
}

export async function getDefaultSipRegistrationProfile() {
  await ensureSipCommercialSchema();
  const [defaultProfile] = await db
    .select()
    .from(sipRegistrationProfiles)
    .where(eq(sipRegistrationProfiles.isDefault, true))
    .limit(1);
  if (defaultProfile) return defaultProfile;

  const [activeProfile] = await db
    .select()
    .from(sipRegistrationProfiles)
    .where(eq(sipRegistrationProfiles.status, 'active'))
    .orderBy(asc(sipRegistrationProfiles.createdAt))
    .limit(1);
  if (activeProfile) return activeProfile;

  const [createdProfile] = await db
    .insert(sipRegistrationProfiles)
    .values({
      name: 'Default SIP Registration Profile',
      description: 'Default profile used when customers register online.',
      status: 'active',
      isDefault: true,
      metadata: defaultSipFeatureSettings,
    })
    .returning();
  return createdProfile;
}

export async function getSipRegistrationProfileById(profileId?: string | null) {
  await ensureSipCommercialSchema();
  const id = String(profileId || '').trim();
  if (!id) return null;
  const [profile] = await db
    .select()
    .from(sipRegistrationProfiles)
    .where(eq(sipRegistrationProfiles.id, id))
    .limit(1);
  return profile || null;
}

export function mergeSipFeatureSettings(
  profile: typeof sipRegistrationProfiles.$inferSelect | null,
  overrides: Record<string, any> = {},
) {
  const profileMetadata = normalizeSipFeatureSettings(profile?.metadata);
  return {
    ...profileMetadata,
    ...overrides,
    registrationProfileId:
      overrides.registrationProfileId ??
      profile?.id ??
      profileMetadata.registrationProfileId ??
      null,
    registrationProfileName:
      overrides.registrationProfileName ??
      profile?.name ??
      profileMetadata.registrationProfileName ??
      '',
  };
}

export function publicSipTariff(row: typeof sipTariffs.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    tariffType: row.tariffType,
    description: row.description || '',
    currency: row.currency,
    connectionFee: row.connectionFee,
    ratePerMinute: row.ratePerMinute,
    billingIncrementSeconds: row.billingIncrementSeconds,
    status: row.status,
    metadata: cleanMetadata(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function publicSipRateGroup(row: typeof sipRateGroups.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    status: row.status,
    metadata: cleanMetadata(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function publicSipRegistrationProfile(row: typeof sipRegistrationProfiles.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    status: row.status,
    isDefault: row.isDefault,
    metadata: normalizeSipFeatureSettings(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
