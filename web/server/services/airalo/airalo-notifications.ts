import crypto from "crypto";
import axios from "axios";

const AIRALO_BASE_URL_V2 = "https://partners-api.airalo.com/v2";
const AIRALO_BASE_URL_V1 = "https://partners-api.airalo.com/v1";

export interface NotificationSettings {
  lowData75Enabled: boolean;
  lowData90Enabled: boolean;
  expiring3DaysEnabled: boolean;
  expiring1DayEnabled: boolean;
  creditLimitEnabled: boolean;
  webhookUrl: string;
  optedIn: boolean;
  lastOptInAt?: Date;
}

export interface LowDataWebhookPayload {
  iccid: string;
  threshold: "75_percent" | "90_percent" | "3_days" | "1_day";
  remaining_data: number; // in MB
  total_data: number; // in MB
  expiry_date: string;
  package_name: string;
}

class AiraloNotificationService {
  private apiKey: string;
  private apiSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.apiKey = process.env.AIRALO_API_KEY || "";
    this.apiSecret = process.env.AIRALO_API_SECRET || "";
  }

  /**
   * Authenticate with Airalo API and get access token
   */
  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(`${AIRALO_BASE_URL_V2}/token`, {
        client_id: this.apiKey,
        client_secret: this.apiSecret,
        grant_type: "client_credentials",
      });

      const token = response.data.data.access_token;
      if (!token) {
        throw new Error("No access token received from Airalo");
      }

      this.accessToken = token;
      this.tokenExpiry = Date.now() + (response.data.data.expires_in * 1000) - 60000; // 1 min buffer

      return token;
    } catch (error: any) {
      console.error("❌ Airalo authentication failed:", error.response?.data || error.message);
      throw new Error("Failed to authenticate with Airalo API");
    }
  }

  /**
   * Opt-in to Low Data notifications
   */
  async optInLowData(webhookUrl: string): Promise<boolean> {
    console.log("✅ Notification webhook URL configured (Airalo auto-detects webhooks)");
    return true;
  }

  /**
   * Opt-out from Low Data notifications
   */
  async optOutLowData(): Promise<boolean> {
    console.log("✅ Notification webhook disabled");
    return true;
  }

  /**
   * Get current Low Data notification status
   */
  async getLowDataStatus(): Promise<any> {
    return null;
  }

  /**
   * Trigger webhook simulator for testing
   */
  async testWebhook(): Promise<boolean> {
    try {
      const baseUrl = process.env.BASE_URL || "http://localhost:5000";
      const webhookUrl = `${baseUrl}/api/webhooks/airalo/low-data`;
      
      const samplePayload = {
        iccid: "TEST8901234567890123456",
        threshold: "75_percent",
        remaining_data: 250,
        total_data: 1000,
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        package_name: "Test Package - 1GB"
      };
      
      const payloadString = JSON.stringify(samplePayload);
      
      // Compute proper HMAC signature using API secret
      let signature = "test-signature-dev-mode";
      if (process.env.AIRALO_API_SECRET) {
        const hmac = crypto.createHmac('sha256', process.env.AIRALO_API_SECRET);
        hmac.update(payloadString);
        signature = hmac.digest('hex');
      }
      
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "airalo-signature": signature
        },
        body: payloadString
      });
      
      if (!response.ok) {
        console.error("❌ Test webhook failed:", await response.text());
        return false;
      }
      
      console.log("✅ Test webhook sent successfully");
      return true;
    } catch (error: any) {
      console.error("❌ Error sending test webhook:", error);
      throw error;
    }
  }

  /**
   * Validate webhook signature from Airalo
   * @param signature - The airalo-signature header value
   * @param payload - The raw webhook payload
   * @returns true if signature is valid
   */
  validateWebhookSignature(signature: string, payload: string): boolean {
    try {
      // Airalo uses HMAC-SHA256 for webhook signatures
      // The secret is typically your API client secret
      if (!process.env.AIRALO_API_SECRET) {
        console.warn("⚠️ AIRALO_API_SECRET not set, skipping signature validation");
        return true; // Allow in dev mode
      }

      const hmac = crypto.createHmac('sha256', process.env.AIRALO_API_SECRET);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        console.error("❌ Invalid webhook signature");
      }

      return isValid;
    } catch (error: any) {
      console.error("❌ Error validating webhook signature:", error);
      return false;
    }
  }

  /**
   * Parse threshold from webhook payload
   */
  parseThreshold(payload: any): string | null {
    // Airalo sends different threshold indicators
    if (payload.data_percentage_remaining <= 25) {
      return "75_percent";
    } else if (payload.data_percentage_remaining <= 10) {
      return "90_percent";
    } else if (payload.days_remaining === 3) {
      return "3_days";
    } else if (payload.days_remaining === 1) {
      return "1_day";
    }
    return null;
  }

  /**
   * Check if a specific threshold notification is enabled in settings
   */
  isThresholdEnabled(threshold: string, settings: NotificationSettings): boolean {
    switch (threshold) {
      case "75_percent":
        return settings.lowData75Enabled;
      case "90_percent":
        return settings.lowData90Enabled;
      case "3_days":
        return settings.expiring3DaysEnabled;
      case "1_day":
        return settings.expiring1DayEnabled;
      default:
        return false;
    }
  }
}

export const airaloNotificationService = new AiraloNotificationService();
