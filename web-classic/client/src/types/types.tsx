// Timeline/Features Section Types
export interface FeatureImage {
  src: string;
  alt: string;
}

export interface FeatureButtonInfo {
  title: string;
  herf: string;
}

export interface FeatureRightSection {
  image: FeatureImage;
  detils: string[];
  buttonInfo: FeatureButtonInfo;
}

export interface FeatureItem {
  title: string;
  subtitle: string;
  rightSec: FeatureRightSection[];
}

export interface FeatureSecDataType {
  secTitle: string;
  secData: FeatureItem[];
}

export interface AdminPlatformSettings {
  package_selection_mode: 'auto' | 'manual';
  platform_name: string;
  platform_tagline: string;
  site_name: string;
  site_description: string;
  timezone: string;
  preferred_provider_id: string;
  copyright_text: string;
  currency: string;
  support_whatsapp_number?: string;
  support_whatsapp_enabled?: string;
  support_whatsapp_schedule_enabled?: string;
  support_whatsapp_start_time?: string;
  support_whatsapp_end_time?: string;
  support_whatsapp_working_days?: string;
  support_whatsapp_mode?: string;
  support_whatsapp_phone_number_id?: string;
  support_whatsapp_access_token?: string;
  support_whatsapp_verify_token?: string;
  support_whatsapp_api_version?: string;
  concierge_enabled?: string;
  concierge_pricing_mode?: string;
  concierge_billing_cycle?: string;
  concierge_fee?: string;
  concierge_trial_enabled?: string;
  concierge_trial_days?: string;
  concierge_features?: string;
  concierge_hotline_enabled?: string;
  concierge_hotline_label?: string;
  concierge_hotline_number?: string;
  concierge_hotline_url?: string;
  concierge_ai_bot_enabled?: string;
  concierge_ai_bot_name?: string;
  concierge_ai_bot_welcome?: string;
  concierge_ai_bot_prompt?: string;
  vonage_enabled?: string;
  vonage_api_key?: string;
  vonage_api_secret?: string;
  vonage_application_id?: string;
  vonage_private_key?: string;
  voice_backend?: string;
  linphone_enabled?: string;
  linphone_sip_domain?: string;
  linphone_sip_port?: string;
  linphone_sip_transport?: string;
  linphone_sip_username_prefix?: string;
  linphone_sip_password?: string;
  linphone_sip_outbound_proxy?: string;
  linphone_voicemail_extension?: string;
  vonage_brand_name?: string;
  vonage_inbound_webhook_url?: string;
  vonage_status_webhook_url?: string;
  vonage_virtual_number_default_country?: string;
  vonage_virtual_number_auto_assign?: string;
  logo: string;
  dark_logo?: string;
  favicon: string;
  last_airalo_sync_timestamp: string; // stored as string timestamp
}

// Single setting item
export interface SettingItemType {
  id: string;
  key: string;
  value: string;
  category: 'general' | 'seo' | 'system' | string;
  updatedAt: string;
}

export interface SettingsResponse {
  success: boolean;
  message: string;
  data: SettingItemType[];
}

export type SettingsKey =
  | 'site_name'
  | 'site_description'
  | 'timezone'
  | 'platform_name'
  | 'platform_tagline'
  | 'copyright_text'
  | 'currency'
  | 'last_airalo_sync_timestamp';

export interface CompletePackageType {
  id: string;
  title: string;
  slug: string;
  dataAmount: string;
  validity: number;
  retailPrice: string;
  voiceMinutes: number;
  smsCount: number;
  countryCode?: string | null;
  countryName?: string | null;
  destinationId?: string;
  regionId?: string;
  region?: {
    id: string;
    name: string;
    slug: string;
  };
  destination?: {
    id: string;
    name: string;
    countryCode: string;
    slug: string;
  };
}

export interface PlanCommonCardProps {
  id: string;

  countryCode?: string;
  countryName?: string;
  slug?: string;

  dataAmount: string;
  validity: number;

  price: string;
  pricePerDay: string;
  currencySymbol: string;

  voiceMinutes?: number;
  smsCount?: number;

  destinationSlug?: string;

  badgeText?: string;
  badgeClassName?: string;

  primaryButtonText?: string;
  primaryButtonClassName?: string;

  isComplete?: boolean;
}

export interface PageApiData {
  id: string;
  slug: string;
  title: string;
  content: string;

  metaTitle?: string;
  metaDescription?: string;

  isPublished: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface PageApiResponse {
  success: boolean;
  data: PageApiData[];
}
