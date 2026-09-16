import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ✅ New interface matching API response
export interface SettingsState {
  site_name: string;
  site_description: string;
  timezone: string;
  platform_name: string;
  platform_tagline: string;
  currency: string;
  logo: string;
  dark_logo?: string;
  favicon: string;
  theme_primary?: string;
  theme_primary_second?: string;
  theme_primary_light?: string;
  theme_primary_dark?: string;
  theme_font_heading?: string;
  theme_font_body?: string;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  updated_at?: string;

  // SEO Settings
  seo_default_title?: string;
  seo_title_suffix?: string;
  seo_default_description?: string;
  seo_default_keywords?: string;
  seo_og_image?: string;
  seo_twitter_handle?: string;
  seo_google_verification?: string;
  seo_bing_verification?: string;

  website_url?: string | string[];
  social_facebook?: string | string[];
  social_instagram?: string | string[];
  social_twitter?: string | string[];
  social_linkedin?: string | string[];
  social_youtube?: string | string[];
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
  show_demo_login?: string;
  kyc_enabled?: string;
  kyc_required_customer?: string;
  kyc_required_agent?: string;
  kyc_required_reseller?: string;
}

const initialState: SettingsState = {
  site_name: '',
  site_description: '',
  timezone: '',
  platform_name: '',
  platform_tagline: '',
  currency: '',
  logo: '',
  favicon: '',
  isLoading: false,
  error: null,
  lastFetched: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings: (
      state,
      action: PayloadAction<Omit<SettingsState, 'isLoading' | 'error' | 'lastFetched'>>,
    ) => {
      Object.assign(state, action.payload);
      state.lastFetched = Date.now();
      state.error = null;
    },
    updateSettingByKey: (
      state,
      action: PayloadAction<{
        key: keyof Omit<SettingsState, 'isLoading' | 'error' | 'lastFetched'>;
        value: string;
      }>,
    ) => {
      state[action.payload.key] = action.payload.value;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearSettings: (state) => {
      return { ...initialState };
    },
  },
});

export const { setSettings, updateSettingByKey, setLoading, setError, clearSettings } =
  settingsSlice.actions;

export default settingsSlice.reducer;
