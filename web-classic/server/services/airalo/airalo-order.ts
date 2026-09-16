import { airaloAPI } from "./airalo-sdk";

// Airalo API response interfaces based on official documentation
// https://developers.partners.airalo.com/submit-order-11883024e0
// https://developers.partners.airalo.com/submit-order-async-11883025e0

export interface AiraloSim {
  id: number;
  created_at: string;
  iccid: string;
  lpa: string; // SMDP+ address
  matching_id: string; // Activation code
  qrcode: string; // QR code data string (LPA format)
  qrcode_url: string; // Pre-generated QR code image URL
  direct_apple_installation_url?: string; // iOS 17.4+ universal link
  apn_type: string; // "automatic" or "manual"
  apn_value?: string; // APN value if manual
  is_roaming: boolean;
  confirmation_code?: string;
  airalo_code?: string;
  imsis?: string | null;
}

export interface AiraloOrderResponse {
  data: {
    id: number;
    code: string; // Order reference (e.g., "20240514-077671")
    package_id: string;
    quantity: string | number;
    type: string;
    description?: string;
    esim_type: string;
    validity: number;
    package: string;
    data: string; // Human readable (e.g., "1 GB")
    price: number;
    currency: string;
    created_at: string;
    manual_installation?: string;
    qrcode_installation?: string;
    installation_guides?: Record<string, string>;
    brand_settings_name?: string;
    sims: AiraloSim[];
  };
  meta: {
    message: string;
  };
}

export interface AiraloAsyncOrderResponse {
  request_id: string;
}

export interface AiraloWebhookPayload {
  request_id: string;
  data: AiraloOrderResponse["data"] | null;
  meta: {
    message: string;
    errors?: Record<string, string[]>;
  };
}

export interface ParsedSimDetails {
  iccid: string;
  qrCode: string; // QR code data string
  qrCodeUrl: string; // Pre-generated QR code image URL
  lpaCode: string; // Full LPA string
  smdpAddress: string; // SMDP+ address extracted from lpa
  activationCode: string; // Matching ID for manual installation
  directAppleUrl?: string;
  apnType: string;
  apnValue?: string;
  isRoaming: boolean;
}

export interface ParsedOrderDetails {
  airaloOrderId: string; // Airalo's order ID
  airaloCode: string; // Order reference code
  packageId: string;
  quantity: number;
  price: number;
  currency: string;
  validity: number;
  dataAmount: string;
  sims: ParsedSimDetails[];
  providerEmailSent?: boolean;
}

export class AiraloOrderService {
  /**
   * Submit a single order (synchronous) - for 1 eSIM
   */
  async submitSingleOrder(
    packageId: string,
    quantity: number = 1,
    description?: string,
    customerEmail?: string
  ): Promise<ParsedOrderDetails> {
    try {
      console.log(`📱 Submitting single order: ${packageId} x${quantity}`);
      
      const response = customerEmail
        ? await airaloAPI.orderWithEmailSimShare(
            packageId,
            quantity,
            {
              to_email: customerEmail,
              sharing_option: ["link", "pdf"],
            },
            description,
          ) as AiraloOrderResponse
        : await airaloAPI.submitOrder(packageId, quantity, description) as AiraloOrderResponse;
      
      if (!response.data || !response.data.sims || response.data.sims.length === 0) {
        throw new Error("Invalid order response: No eSIM data received");
      }

      return {
        ...this.parseOrderResponse(response.data),
        providerEmailSent: Boolean(customerEmail),
      };
    } catch (error: any) {
      console.error("❌ Single order failed:", error.message);
      throw new Error(`Airalo order failed: ${error.message}`);
    }
  }

  /**
   * Submit a batch order (asynchronous) - for 2+ eSIMs
   * Returns request_id to track the order via webhook
   */
  async submitBatchOrder(
    packageId: string,
    quantity: number
  ): Promise<{ requestId: string }> {
    try {
      console.log(`📦 Submitting batch order: ${packageId} x${quantity}`);
      
      const response = await airaloAPI.submitOrderAsync(packageId, quantity) as AiraloAsyncOrderResponse;
      
      if (!response.request_id) {
        throw new Error("Invalid async order response: No request_id received");
      }

      console.log(`✅ Batch order submitted. Request ID: ${response.request_id}`);
      return { requestId: response.request_id };
    } catch (error: any) {
      console.error("❌ Batch order failed:", error.message);
      throw new Error(`Airalo batch order failed: ${error.message}`);
    }
  }

  /**
   * Parse webhook payload from async order completion
   */
  parseWebhookPayload(payload: AiraloWebhookPayload): ParsedOrderDetails | null {
    if (!payload.data || !payload.data.sims || payload.data.sims.length === 0) {
      console.warn("⚠️ Webhook received with no eSIM data:", payload.meta.message);
      return null;
    }

    return this.parseOrderResponse(payload.data);
  }

  /**
   * Parse Airalo order response into structured format
   */
  parseOrderResponse(data: AiraloOrderResponse["data"]): ParsedOrderDetails {
    const sims: ParsedSimDetails[] = data.sims.map(sim => this.parseSimDetails(sim));

    return {
      airaloOrderId: data.id.toString(),
      airaloCode: data.code,
      packageId: data.package_id,
      quantity: typeof data.quantity === "string" ? parseInt(data.quantity) : data.quantity,
      price: data.price,
      currency: data.currency,
      validity: data.validity,
      dataAmount: data.data,
      sims,
    };
  }

  /**
   * Parse individual eSIM details from Airalo response
   */
  private parseSimDetails(sim: AiraloSim): ParsedSimDetails {
    // Extract SMDP+ address from LPA string
    // LPA format: "LPA:1$lpa.airalo.com$ACTIVATION_CODE"
    let smdpAddress = "";
    let lpaCode = sim.qrcode || sim.lpa; // Use qrcode as fallback since it contains full LPA
    
    if (lpaCode) {
      const lpaParts = lpaCode.split("$");
      if (lpaParts.length >= 2) {
        smdpAddress = lpaParts[1]; // Extract "lpa.airalo.com"
      }
    }

    return {
      iccid: sim.iccid,
      qrCode: sim.qrcode,
      qrCodeUrl: sim.qrcode_url,
      lpaCode: lpaCode,
      smdpAddress: smdpAddress,
      activationCode: sim.matching_id,
      directAppleUrl: sim.direct_apple_installation_url,
      apnType: sim.apn_type,
      apnValue: sim.apn_value,
      isRoaming: sim.is_roaming,
    };
  }

  /**
   * Validate webhook authenticity (optional but recommended)
   * You can add signature verification here based on Airalo's webhook security mechanism
   */
  validateWebhookSignature(payload: any, signature?: string): boolean {
    // TODO: Implement signature verification if Airalo provides webhook signatures
    // For now, we'll accept all webhooks
    return true;
  }
}

export const airaloOrderService = new AiraloOrderService();
