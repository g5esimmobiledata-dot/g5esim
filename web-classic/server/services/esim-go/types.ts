"use strict";

export interface EsimGoCountry {
  name: string;
  region: string;
  iso: string;
}

export interface EsimGoAllowance {
  type: "DATA" | "VOICE" | "SMS";
  service: "STANDARD" | "ROAMING";
  description: string;
  amount: number;
  unit: "MB" | "SMS" | "MINS";
  unlimited: boolean;
}

export interface EsimGoBundle {
  name: string;
  description?: string;
  groups: string[];
  countries: EsimGoCountry[];
  dataAmount: number;
  duration: number;
  speed?: string[];
  autostart?: boolean;
  unlimited?: boolean;
  roamingEnabled?: EsimGoCountry[];
  price: number;
  billingType?: string;
  allowances?: EsimGoAllowance[];
}

export interface EsimGoCatalogueResponse {
  bundles: EsimGoBundle[];
}

export interface EsimGoOrderResponse {
  statusMessage: string;
  reference: string;
  total: number;
  iccids: Array<{
    iccid: string;
    smdpAddress: string;
    matchingId: string;
  }>;
}

export interface EsimGoOrderDetailsResponse {
  order: {
    id: string;
    status: string;
    esims: Array<{
      iccid: string;
      qr_code: string;
      activation_code: string;
      sm_dp_address: string;
    }>;
  };
}

export interface EsimGoEsimResponse {
  esim: {
    iccid: string;
    status: string;
    data: {
      used_in_bytes: number;
      limit_in_bytes: number;
      remaining_in_bytes: number;
    };
    validity: {
      expires_at: string;
    };
    current_usage?: {
      id: string;
      bundle_id: string;
      status: string;
    };
    supported_topups?: Array<{
      bundle_id: string;
      name: string;
      data_limit_in_bytes: number;
      validity: {
        duration_in_days: number;
      };
      price: {
        currency_code: string;
        amount: number;
      };
    }>;
  };
}

export interface EsimGoBundleResponse {
  bundle: {
    id: string;
    name: string;
    data_limit_in_bytes: number;
    validity: {
      duration_in_days: number;
    };
    price: {
      currency_code: string;
      amount: number;
    };
    supported_topups: string[];
  };
}

export interface EsimGoTopupResponse {
  topup: {
    id: string;
    status: string;
  };
}
