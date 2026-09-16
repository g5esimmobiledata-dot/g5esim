declare module "airalo-sdk" {
  export interface AiraloConfig {
    client_id: string;
    client_secret: string;
    env?: "sandbox" | "production";
  }

  export interface EsimCloudOptions {
    to_email: string;
    sharing_option: ("link" | "pdf")[];
    copy_address?: string[];
  }

  export interface VoucherRequest {
    vouchers: { package_id: string; quantity: number }[];
  }

  export class Airalo {
    constructor(config: AiraloConfig);
    initialize(): Promise<void>;

    getAllPackages(flat?: boolean, limit?: number | null, page?: number | null): Promise<any>;
    getLocalPackages(flat?: boolean, limit?: number | null, page?: number | null): Promise<any>;
    getGlobalPackages(flat?: boolean, limit?: number | null, page?: number | null): Promise<any>;
    getCountryPackages(countryCode: string, flat?: boolean, limit?: number | null): Promise<any>;
    getSimPackages(countryCode: string, flat?: boolean, limit?: number | null): Promise<any>;

    order(packageId: string, quantity: number, description?: string | null): Promise<any>;
    orderAsync(packageId: string, quantity: number, webhookUrl?: string | null, description?: string | null): Promise<any>;
    orderWithEmailSimShare(packageId: string, quantity: number, esimCloud: EsimCloudOptions, description?: string | null): Promise<any>;
    orderBulk(packages: Record<string, number>, description?: string | null): Promise<any>;
    orderAsyncBulk(packages: Record<string, number>, webhookUrl?: string | null, description?: string | null): Promise<any>;

    getSimUsage(iccid: string): Promise<any>;
    simUsageBulk(iccids: string[]): Promise<any>;

    getSimTopups(iccid: string): Promise<any>;
    topup(packageId: string, iccid: string, description?: string | null): Promise<any>;

    getSimInstructions(iccid: string, language?: string): Promise<any>;
    getSimPackageHistory(iccid: string): Promise<any>;

    createFutureOrder(
      packageId: string,
      quantity: number,
      dueDate: string,
      webhookUrl?: string | null,
      description?: string | null,
      brandSettingsName?: string | null,
      toEmail?: string | null,
      sharingOption?: ("link" | "pdf")[] | null,
      copyAddress?: string[] | null
    ): Promise<any>;
    cancelFutureOrder(...requestIds: string[]): Promise<any>;

    getCompatibleDevices(): Promise<any>;

    voucher(
      usageLimit: number,
      amount: number,
      quantity: number,
      isPaid?: boolean,
      voucherCode?: string | null
    ): Promise<any>;
    esimVouchers(vouchers: VoucherRequest): Promise<any>;

    getExchangeRates(
      date?: string | null,
      source?: string | null,
      from?: string | null,
      to?: string | null
    ): Promise<any>;
  }

  export class AiraloStatic {
    static init(config: AiraloConfig): Promise<void>;
    static getAllPackages(flat?: boolean, limit?: number | null, page?: number | null): Promise<any>;
    static getLocalPackages(flat?: boolean, limit?: number | null, page?: number | null): Promise<any>;
    static getGlobalPackages(flat?: boolean, limit?: number | null, page?: number | null): Promise<any>;
    static getCountryPackages(countryCode: string, flat?: boolean, limit?: number | null): Promise<any>;
    static getSimPackages(countryCode: string, flat?: boolean, limit?: number | null): Promise<any>;
    static order(packageId: string, quantity: number, description?: string | null): Promise<any>;
    static orderAsync(packageId: string, quantity: number, webhookUrl?: string | null, description?: string | null): Promise<any>;
    static orderWithEmailSimShare(packageId: string, quantity: number, esimCloud: EsimCloudOptions, description?: string | null): Promise<any>;
    static orderBulk(packages: Record<string, number>, description?: string | null): Promise<any>;
    static orderAsyncBulk(packages: Record<string, number>, webhookUrl?: string | null, description?: string | null): Promise<any>;
    static getSimUsage(iccid: string): Promise<any>;
    static simUsageBulk(iccids: string[]): Promise<any>;
    static getSimTopups(iccid: string): Promise<any>;
    static topup(packageId: string, iccid: string, description?: string | null): Promise<any>;
    static getSimInstructions(iccid: string, language?: string): Promise<any>;
    static getSimPackageHistory(iccid: string): Promise<any>;
    static createFutureOrder(
      packageId: string,
      quantity: number,
      dueDate: string,
      webhookUrl?: string | null,
      description?: string | null,
      brandSettingsName?: string | null,
      toEmail?: string | null,
      sharingOption?: ("link" | "pdf")[] | null,
      copyAddress?: string[] | null
    ): Promise<any>;
    static cancelFutureOrder(...requestIds: string[]): Promise<any>;
    static getCompatibleDevices(): Promise<any>;
    static voucher(
      usageLimit: number,
      amount: number,
      quantity: number,
      isPaid?: boolean,
      voucherCode?: string | null
    ): Promise<any>;
    static esimVouchers(vouchers: VoucherRequest): Promise<any>;
    static getExchangeRates(
      date?: string | null,
      source?: string | null,
      from?: string | null,
      to?: string | null
    ): Promise<any>;
  }

  export class Cached {
    static setCachePath(path: string): void;
    static clearCache(): Promise<void>;
  }

  export class AiraloException extends Error {}
}
