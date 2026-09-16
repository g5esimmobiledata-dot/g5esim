export type OrderSource = 'website' | 'api' | 'mobile' | 'admin';

export interface OrderRequest {
  packageId: string;
  unifiedPackageId: string;
  quantity: number;
  customerEmail: string;
  customerPhone?: string;
  transactionId: string;
  paymentIntentId?: string;
  source: OrderSource;
  userId?: string | null;
  customerRole?: 'customer' | 'agent' | 'reseller';
  orderId?: string;
  customerRef?: string;
  apiKeyId?: string;
  webhookUrl?: string;
  partnerReference?: string;
}

export interface EsimDetails {
  iccid: string;
  qrCode?: string;
  qrCodeUrl?: string;
  lpaCode?: string;
  smdpAddress?: string;
  activationCode?: string;
  directAppleUrl?: string;
  apnType?: string;
  apnValue?: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  providerOrderId?: string;
  esimDetails?: EsimDetails[];
  failoverUsed: boolean;
  originalProviderId?: string;
  finalProviderId?: string;
  attempts: FailoverAttempt[];
  error?: string;
  errorCode?: string;
  totalWholesalePrice?: number;
  totalRetailPrice?: number;
}

export interface MarginCalculation {
  wholesalePrice: number;
  retailPrice: number;
  marginPercent: number;
  minimumRequired: number;
  passed: boolean;
}

export interface FailoverAttempt {
  providerId: string;
  providerName: string;
  timestamp: string;
  success: boolean;
  error?: string;
  errorCode?: string;
  responseTimeMs: number;
  margin: MarginCalculation;
}

export interface ProviderCandidate {
  providerId: string;
  providerName: string;
  providerSlug: string;
  packageId: string;
  providerPackageId: string;
  wholesalePrice: number;
  priority: number;
  minMarginPercent: number;
}

export interface FailoverSettings {
  enabled: boolean;
  defaultMinMarginPercent: number;
}
