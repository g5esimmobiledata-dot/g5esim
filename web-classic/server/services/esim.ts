import { airaloAPI } from './airalo/airalo-sdk';
import { db } from '../db';
import { orders } from '@shared/schema';
import { and, eq, isNotNull } from 'drizzle-orm';
import QRCode from 'qrcode';

/**
 * Generate QR code data URL from an LPA string.
 */
async function generateQRCodeDataUrl(lpaString: string): Promise<string> {
  return QRCode.toDataURL(lpaString, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

/**
 * eSIM Management Service
 * Handles eSIM details, installation instructions, usage tracking, and brand management.
 */
export class ESimService {
  async getESimDetails(iccid: string) {
    try {
      const response = await airaloAPI.getSimDetails(iccid);
      return response.data || response;
    } catch (error: any) {
      console.error('Failed to fetch eSIM details:', error.message);
      throw new Error(`Failed to fetch eSIM details: ${error.message}`);
    }
  }

  async getESimsList(params?: {
    orderId?: string;
    iccid?: string;
    dateRange?: string;
    limit?: number;
    page?: number;
  }) {
    try {
      const airaloParams: any = {
        limit: params?.limit || 50,
        page: params?.page || 1,
        include: 'order,package',
      };

      if (params?.orderId) {
        airaloParams['filter[order_id]'] = params.orderId;
      }
      if (params?.iccid) {
        airaloParams['filter[iccid]'] = params.iccid;
      }
      if (params?.dateRange) {
        airaloParams['filter[created_at]'] = params.dateRange;
      }

      const response = await airaloAPI.getSimsList(airaloParams);
      return response.data || response;
    } catch (error: any) {
      console.error('Failed to fetch eSIMs list:', error.message);
      throw new Error(`Failed to fetch eSIMs list: ${error.message}`);
    }
  }

  /**
   * Get installation instructions for eSIM.
   * The mobile app can pass either the internal order/eSIM id or the ICCID.
   */
  async getInstallationInstructions(
    identifier: string,
    language: string = 'en',
    device?: string,
    model?: string,
  ) {
    try {
      const orderById = await db.query.orders.findFirst({
        where: eq(orders.id, identifier),
      });
      const order =
        orderById ||
        (await db.query.orders.findFirst({
          where: eq(orders.iccid, identifier),
        }));
      const resolvedIccid = order?.iccid || identifier;

      if (order && (order.qrCodeUrl || order.qrCode || order.lpaCode || order.activationCode)) {
        console.log(`Using cached QR code data for ${resolvedIccid}`);

        const lpaCode = order.lpaCode || order.activationCode || order.qrCode;
        let qrCodeValue = order.qrCodeUrl || order.qrCode;

        if (lpaCode && lpaCode.startsWith('LPA:')) {
          console.log(`Generating QR code image from LPA string for ${resolvedIccid}`);
          qrCodeValue = await generateQRCodeDataUrl(lpaCode);
        } else if (qrCodeValue && qrCodeValue.startsWith('LPA:')) {
          console.log(`Generating QR code image from QR LPA string for ${resolvedIccid}`);
          qrCodeValue = await generateQRCodeDataUrl(qrCodeValue);
        } else if (!qrCodeValue && lpaCode) {
          console.log(`Generating QR code image from activation code for ${resolvedIccid}`);
          qrCodeValue = await generateQRCodeDataUrl(lpaCode);
        }

        return {
          qr_code: qrCodeValue,
          qr_code_url: order.qrCodeUrl,
          manual_code: lpaCode,
          smdp_address: order.smdpAddress,
          activation_code: order.activationCode,
          apn_type: order.apnType,
          apn_value: order.apnValue,
          is_roaming: order.isRoaming,
          direct_apple_url: order.directAppleUrl,
          steps: [],
        };
      }

      if (order && !order.iccid) {
        throw new Error(
          'eSIM details not available yet. Provider fulfillment has not returned an ICCID or QR data.',
        );
      }

      console.log(`Fetching installation instructions from Airalo for ${resolvedIccid}`);
      const airaloParams: any = { language };
      if (device) airaloParams.device = device;
      if (model) airaloParams.model = model;

      const response = await airaloAPI.getInstallationInstructions(resolvedIccid, airaloParams);
      return response.data || response;
    } catch (error: any) {
      console.error(`Failed to fetch installation instructions for ${identifier}:`, error.message);
      throw new Error(`Failed to fetch installation instructions: ${error.message}`);
    }
  }

  /**
   * Get data usage for eSIM. Routes to the correct provider when providerId exists.
   */
  async getDataUsage(iccid: string, providerId?: string | null) {
    try {
      if (providerId) {
        const { providerFactory } = await import('../providers/provider-factory');
        const providerService = await providerFactory.getServiceById(providerId);
        const providerUsageData = await providerService.getUsageData(iccid);

        const dataRemainingGB =
          providerUsageData.dataRemaining != null
            ? (providerUsageData.dataRemaining / (1024 * 1024 * 1024)).toFixed(2)
            : null;
        const dataTotalGB =
          providerUsageData.dataTotal != null
            ? (providerUsageData.dataTotal / (1024 * 1024 * 1024)).toFixed(2)
            : null;
        const dataUsedGB =
          providerUsageData.dataUsed != null
            ? (providerUsageData.dataUsed / (1024 * 1024 * 1024)).toFixed(2)
            : null;

        return {
          used: dataUsedGB ? `${dataUsedGB}GB` : null,
          total: dataTotalGB ? `${dataTotalGB}GB` : null,
          remaining: dataRemainingGB ? `${dataRemainingGB}GB` : null,
          percentage: providerUsageData.percentageUsed ?? null,
          raw: providerUsageData.raw ?? providerUsageData,
        };
      }

      const response = await airaloAPI.getUsage(iccid);
      return response.data || response;
    } catch (error: any) {
      console.error(`Failed to fetch data usage for ${iccid}:`, error.message);
      throw new Error(`Failed to fetch data usage: ${error.message}`);
    }
  }

  async getSimInfo(iccid: string, language: string = 'en') {
    try {
      const response = await airaloAPI.getSimInfo(iccid, language);
      return response.data || response;
    } catch (error: any) {
      console.error(`Failed to fetch eSIM info for ${iccid}:`, error.message);
      throw new Error(`Failed to fetch eSIM info: ${error.message}`);
    }
  }

  async getBrandedQRCode(iccid: string, brandName?: string) {
    try {
      return await airaloAPI.getBrandedQRCode(iccid, {
        brand_settings_name: brandName,
        brand_name: brandName,
      });
    } catch (error: any) {
      const order = await db.query.orders.findFirst({
        where: eq(orders.iccid, iccid),
      });
      const lpaCode = order?.lpaCode || order?.qrCode;

      if (lpaCode) {
        console.warn(
          `Branded QR unavailable for ${iccid}; returning locally generated QR instead:`,
          error.message,
        );
        return {
          qr_code: await generateQRCodeDataUrl(lpaCode),
          qr_code_url: order?.qrCodeUrl,
        };
      }

      console.error(`Failed to fetch branded QR for ${iccid}:`, error.message);
      throw new Error(`Failed to fetch branded QR code: ${error.message}`);
    }
  }

  async updateBrandSettings(iccid: string, brandName: string) {
    try {
      return await airaloAPI.updateSimBrand(iccid, brandName);
    } catch (error: any) {
      console.error(`Failed to update brand for ${iccid}:`, error.message);
      throw new Error(`Failed to update brand settings: ${error.message}`);
    }
  }

  async syncAllActiveESimUsage() {
    const activeOrders = await db.query.orders.findMany({
      where: and(isNotNull(orders.iccid), eq(orders.status, 'completed')),
    });

    let synced = 0;
    let failed = 0;

    for (const order of activeOrders) {
      if (!order.iccid) continue;

      try {
        const usageData = await this.getDataUsage(order.iccid, order.providerId);
        await db
          .update(orders)
          .set({ usageData, updatedAt: new Date() })
          .where(eq(orders.id, order.id));
        synced += 1;
      } catch (error) {
        failed += 1;
        console.error(`Failed to sync usage for order ${order.id}:`, error);
      }
    }

    return { synced, failed, total: activeOrders.length };
  }
}

export const esimService = new ESimService();
