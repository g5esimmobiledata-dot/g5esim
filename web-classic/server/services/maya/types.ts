"use strict";

export interface MayaProduct {
  uid: string;
  name: string;
  countries_enabled: string[];
  data_quota_mb: number;
  data_quota_bytes: number;
  validity_days: number;
  policy_id: number;
  policy_name: string;
  wholesale_price_usd: string;
  rrp_usd: string;
  rrp_eur: string;
  rrp_gbp: string;
  rrp_cad?: string;
  rrp_aud?: string;
  rrp_jpy?: string;
}

export interface MayaProductsResponse {
  result: number;
  status: number;
  request_id: string;
  message: string;
  developer_message?: string;
  products: MayaProduct[];
}

export interface MayaRegion {
  id: string;
  name: string;
  code: string;
  countries: string[];
}

export interface MayaRegionsResponse {
  result: number;
  status: number;
  request_id: string;
  message: string;
  regions: MayaRegion[];
}

export interface MayaPlan {
  id: string;
  product_uid: string;
  product_name: string;
  data_quota_mb: number;
  data_used_mb: number;
  data_remaining_mb: number;
  validity_days: number;
  start_date: string;
  end_date: string;
  status: "active" | "expired" | "pending" | "suspended";
}

export interface MayaEsim {
  id: string;
  iccid: string;
  status: "pending" | "active" | "suspended" | "deleted";
  activation_code: string;
  smdp_address: string;
  matching_id: string;
  qr_code_url?: string;
  plans: MayaPlan[];
  created_at: string;
  updated_at: string;
  activated_at?: string;
}

export interface MayaCreateEsimRequest {
  product_uid: string;
  quantity?: number;
  reference?: string;
}

export interface MayaCreateEsimResponse {
  result: number;
  status: number;
  request_id: string;
  message: string;
  esim: MayaEsim;
}

export interface MayaGetEsimResponse {
  result: number;
  status: number;
  request_id: string;
  message: string;
  esim: MayaEsim;
}

export interface MayaChangeEsimRequest {
  action: "add_package" | "suspend" | "reactivate";
  product_uid?: string;
}

export interface MayaChangeEsimResponse {
  result: number;
  status: number;
  request_id: string;
  message: string;
  esim: MayaEsim;
}

export interface MayaDeleteEsimResponse {
  result: number;
  status: number;
  request_id: string;
  message: string;
  refund_amount?: number;
  refund_currency?: string;
}

export interface MayaGetPlansResponse {
  result: number;
  status: number;
  request_id: string;
  message: string;
  plans: MayaPlan[];
}

export interface MayaApiError {
  result: number;
  status: number;
  request_id: string;
  message: string;
  developer_message?: string;
  errors?: Record<string, string[]>;
}

export interface MayaWebhookPayload {
  event: string;
  esim_id: string;
  iccid?: string;
  status?: string;
  data_used_mb?: number;
  data_remaining_mb?: number;
  plan_id?: string;
  timestamp: string;
  signature?: string;
}

export type MayaPackageType = "local" | "regional" | "global";

export function determineMayaPackageType(countriesEnabled: string[]): MayaPackageType {
  if (!countriesEnabled || countriesEnabled.length === 0) {
    return "local";
  }
  if (countriesEnabled.length === 1) {
    return "local";
  }
  if (countriesEnabled.length > 30) {
    return "global";
  }
  return "regional";
}

export function formatDataAmount(mb: number): string {
  // Use decimal conversion (1000 MB = 1 GB) to match product naming
  if (mb >= 1000) {
    const gb = mb / 1000;
    return gb % 1 === 0 ? `${gb}GB` : `${gb.toFixed(1)}GB`;
  }
  return `${mb}MB`;
}
