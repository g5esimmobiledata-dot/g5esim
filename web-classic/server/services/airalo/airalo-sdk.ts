import { Airalo } from "airalo-sdk";
import axios from "axios";

const AIRALO_BASE_URL = "https://partners-api.airalo.com/v2";

class AiraloSDKWrapper {
  private sdk: Airalo | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private get clientId(): string {
    return process.env.AIRALO_API_KEY || "";
  }

  private get clientSecret(): string {
    return process.env.AIRALO_API_SECRET || "";
  }

  private async ensureInitialized(): Promise<Airalo> {
    if (this.initialized && this.sdk) {
      return this.sdk;
    }

    if (this.initPromise) {
      await this.initPromise;
      return this.sdk!;
    }

    this.initPromise = this.initialize();
    try {
      await this.initPromise;
      return this.sdk!;
    } finally {
      this.initPromise = null;
    }
  }

  private async initialize(): Promise<void> {
    try {
      const isProduction = process.env.AIRALO_ENV !== "sandbox";
      this.sdk = new Airalo({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        // The official SDK version used (1.2.2) defaults to production URL via hardcoded config.
        // We ensure we're using the right credentials by explicitly naming them.
      });
      await this.sdk.initialize();
      this.initialized = true;
      console.log(`[Airalo SDK] Initialized successfully (${isProduction ? 'Production' : 'Sandbox'})`);
    } catch (error: any) {
      this.initialized = false;
      this.sdk = null;
      console.error("[Airalo SDK] Initialization failed:", error.message);
      throw new Error("Failed to initialize Airalo SDK");
    }
  }

  private async withRetry<T>(fn: (sdk: Airalo) => Promise<T>): Promise<T> {
    let sdk = await this.ensureInitialized();
    try {
      return await fn(sdk);
    } catch (error: any) {
      // If 401 Unauthorized, token might be expired in file-based cache.
      // We clear our state and retry once.
      if (error.message?.includes("401") || error.response?.status === 401) {
        console.warn("[Airalo SDK] Received 401, clearing session and retrying...");
        this.initialized = false;
        this.sdk = null;
        this.accessToken = null;
        
        sdk = await this.ensureInitialized();
        return await fn(sdk);
      }
      throw error;
    }
  }

  async authenticate(): Promise<string> {
    return this.authenticateREST();
  }

  private async authenticateREST(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(`${AIRALO_BASE_URL}/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "client_credentials",
      });

      this.accessToken = response.data.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.data.expires_in * 1000) - 60000;

      return this.accessToken!;
    } catch (error: any) {
      console.error("[Airalo REST] Authentication failed:", error.response?.data || error.message);
      throw new Error("Failed to authenticate with Airalo API");
    }
  }

  private async restRequest(method: string, endpoint: string, params?: any, isRetry = false): Promise<any> {
    const token = await this.authenticateREST();

    try {
      const response = await axios({
        method,
        url: `${AIRALO_BASE_URL}${endpoint}`,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: method === "GET" ? params : undefined,
        data: method !== "GET" ? params : undefined,
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401 && !isRetry) {
        console.warn("[Airalo REST] Received 401, clearing token and retrying...");
        this.accessToken = null;
        this.tokenExpiry = 0;
        return this.restRequest(method, endpoint, params, true);
      }
      const errorData = error.response?.data;
      const detailedMessage =
        errorData?.message ||
        errorData?.meta?.message ||
        errorData?.errors?.[0]?.message ||
        errorData?.errors?.[0]?.detail ||
        errorData?.error ||
        error.message ||
        "Airalo API request failed";

      console.error(`[Airalo REST] API error (${method} ${endpoint}):`, errorData || error.message);
      throw new Error(detailedMessage);
    }
  }

  async getPackages(params?: {
    country?: string;
    type?: string;
    limit?: number;
    page?: number;
    include?: string;
    filter?: Record<string, any>;
    "filter[type]"?: string;
    "filter[country]"?: string;
  }): Promise<any> {
    return this.withRetry(async (sdk) => {
      if (params?.country) {
        return await sdk.getCountryPackages(params.country, false, params?.limit || null);
      }
      const response = await sdk.getAllPackages(false, params?.limit || null, params?.page || null);
      return response;
    });
  }

  async getAllPackagesFlat(): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.getAllPackages(true);
    });
  }

  async getLocalPackages(flat: boolean = false): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.getLocalPackages(flat);
    });
  }

  async getGlobalPackages(flat: boolean = false): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.getGlobalPackages(flat);
    });
  }

  async getCountryPackages(countryCode: string, flat: boolean = false): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.getCountryPackages(countryCode, flat);
    });
  }

  async getSimPackages(countryCode: string, flat: boolean = false): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.getSimPackages(countryCode, flat);
    });
  }

  async getPackage(packageId: string): Promise<any> {
    return this.restRequest("GET", `/packages/${packageId}`);
  }

  async submitOrder(packageId: string, quantity: number = 1, description?: string): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.order(packageId, quantity, description || null);
    });
  }

  async submitOrderAsync(packageId: string, quantity: number = 1, webhookUrl?: string): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.orderAsync(packageId, quantity, webhookUrl || null);
    });
  }

  async orderWithEmailSimShare(packageId: string, quantity: number, esimCloud: {
    to_email: string;
    sharing_option: ('link' | 'pdf')[];
    copy_address?: string[];
  }, description?: string): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.orderWithEmailSimShare(packageId, quantity, esimCloud, description || null);
    });
  }

  async orderBulk(packages: Record<string, number>, description?: string): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.orderBulk(packages, description || null);
    });
  }

  async orderAsyncBulk(packages: Record<string, number>, webhookUrl?: string, description?: string): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.orderAsyncBulk(packages, webhookUrl || null, description || null);
    });
  }

  async getOrder(orderId: string): Promise<any> {
    return this.restRequest("GET", `/orders/${orderId}`);
  }

  async getOrdersList(params?: {
    include?: string;
    "filter[created_at]"?: string;
    "filter[code]"?: string;
    "filter[order_status]"?: string;
    "filter[iccid]"?: string;
    "filter[description]"?: string;
    limit?: number;
    page?: number;
  }): Promise<any> {
    return this.restRequest("GET", "/orders", params);
  }

  async submitTopup(iccid: string, packageId: string, description?: string): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.topup(packageId, iccid, description || null);
    });
  }

  async getTopupPackages(iccid: string): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.getSimTopups(iccid);
    });
  }

  async getSimDetails(iccid: string): Promise<any> {
    return this.restRequest("GET", `/sims/${iccid}`);
  }

  async getSimInfo(iccid: string, language: string = "en"): Promise<any> {
    return this.restRequest("GET", `/sims/${iccid}`, { language });
  }

  async getUsage(iccid: string): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.getSimUsage(iccid);
    });
  }

  async getUsageBulk(iccids: string[]): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.simUsageBulk(iccids);
    });
  }

  async getSimPackageHistory(iccid: string): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.getSimPackageHistory(iccid);
    });
  }

  async getInstallationInstructions(iccid: string, params?: {
    language?: string;
    device?: string;
    model?: string;
  }): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.getSimInstructions(iccid, params?.language || "en");
    });
  }

  async getCountries(): Promise<any> {
    return this.restRequest("GET", "/countries");
  }

  async getRegions(): Promise<any> {
    return this.restRequest("GET", "/regions");
  }

  async getDevices(): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.getCompatibleDevices();
    });
  }

  async submitFutureOrder(
    packageId: string,
    quantity: number,
    dueDate: string,
    webhookUrl?: string,
    description?: string,
    brandSettingsName?: string,
    toEmail?: string,
    sharingOption?: ('link' | 'pdf')[],
    copyAddress?: string[]
  ): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.createFutureOrder(
        packageId,
        quantity,
        dueDate,
        webhookUrl || null,
        description || null,
        brandSettingsName || null,
        toEmail || null,
        sharingOption || null,
        copyAddress || null
      );
    });
  }

  async cancelFutureOrder(orderId: string): Promise<any> {
    return this.restRequest("DELETE", `/orders/future/${orderId}`);
  }

  async cancelFutureOrders(requestIds: string[]): Promise<any> {
    return this.restRequest("POST", "/cancel-future-orders", {
      request_ids: requestIds,
    });
  }

  async getSimsList(params?: {
    iccid?: string;
    "filter[order_id]"?: string;
    "filter[iccid]"?: string;
    "filter[created_at]"?: string;
    limit?: number;
    page?: number;
    include?: string;
  }): Promise<any> {
    return this.restRequest("GET", "/sims", params);
  }

  async updateSimBrand(iccid: string, brandName: string): Promise<any> {
    return this.restRequest("PUT", `/sims/${iccid}`, {
      brand_settings_name: brandName,
    });
  }

  async getBrandedQRCode(iccid: string, params?: {
    brand_name?: string;
    size?: number;
    brand_settings_name?: string;
  }): Promise<any> {
    return this.restRequest("GET", `/sims/${iccid}/qr`, params);
  }

  async requestRefund(params: {
    iccids: string[];
    reason: "SERVICE_ISSUES" | "OTHERS";
    notes?: string;
    email?: string;
  }): Promise<any> {
    return this.restRequest("POST", "/refund", params);
  }

  async getBalance(): Promise<any> {
    return this.restRequest("GET", "/balance");
  }

  async voucher(
    usageLimit: number,
    amount: number,
    quantity: number,
    isPaid: boolean = false,
    voucherCode?: string
  ): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.voucher(usageLimit, amount, quantity, isPaid, voucherCode || null);
    });
  }

  async esimVouchers(vouchers: { vouchers: { package_id: string; quantity: number }[] }): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.esimVouchers(vouchers);
    });
  }

  async getExchangeRates(
    date?: string,
    source?: string,
    from?: string,
    to?: string
  ): Promise<any> {
    return this.withRetry(async (sdk) => {
      return await sdk.getExchangeRates(date || null, source || null, from || null, to || null);
    });
  }
}

export const airaloAPI = new AiraloSDKWrapper();
