"use strict";

export interface AiraloPackageData {
  id: string;
  type: string;
  price: number;
  net_price?: number;
  amount: number;
  day: number;
  is_unlimited: boolean;
  title: string;
  short_info?: string;
  data?: string;
  voice?: number;
  text?: number;
}

export interface AiraloOperator {
  id: number;
  title: string;
  type: string;
  style?: string;
  gradient_start?: string;
  gradient_end?: string;
  is_prepaid: boolean;
  esim_type: string;
  warning?: string;
  apn_type: string;
  apn_value: string;
  is_roaming: boolean;
  info: string[];
  image?: {
    width?: number;
    height?: number;
    url: string;
  };
  plan_type: string;
  activation_policy: string;
  is_kyc_verify: boolean;
  rechargeability: boolean;
  other_info?: string;
  coverages: Array<{
    name: string;
    code: string;
    networks: Array<{
      name: string;
      types: string[];
    }>;
  }>;
  install_window_days?: number;
  topup_grace_window_days?: number;
  apn: {
    ios: {
      apn_type: string;
      apn_value: string;
    };
    android: {
      apn_type: string;
      apn_value: string;
    };
  };
  packages: AiraloPackageData[];
}

export interface AiraloCountryData {
  slug: string;
  country_code: string;
  title: string;
  image?: {
    width?: number;
    height?: number;
    url: string;
  };
  operators: AiraloOperator[];
}

export interface AiraloAPIResponse {
  data: AiraloCountryData[];
}

export interface AiraloOrderResponse {
  data: {
    id: number;
    sims?: Array<{
      iccid: string;
      qrcode: string;
      lpa?: string;
      matching_id?: string;
      manual_activation_code?: string;
    }>;
  };
}

export interface AiraloUsageResponse {
  data: {
    total?: string;
    used?: string;
    expired_at?: string;
    status?: string;
  };
}

export interface AiraloSimDetailsResponse {
  data: {
    package?: {
      topup_packages?: Array<{
        id: string;
        title: string;
        data: string;
        validity: number;
        price: string;
        currency_code: string;
      }>;
    };
  };
}

export interface AiraloPackageDetailsResponse {
  data: {
    topup_packages?: Array<{
      id: string;
      title: string;
      data: string;
      validity: number;
      price: string;
      currency_code: string;
    }>;
  };
}
