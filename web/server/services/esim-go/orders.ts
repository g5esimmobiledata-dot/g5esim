"use strict";

import { makeEsimGoRequest, formatDataAmount } from "./api";
import type {
  ProviderOrderRequest,
  ProviderOrderResponse,
  ProviderOrderStatus,
  ProviderUsageData,
  ProviderTopupPackage,
  ProviderTopupRequest,
  ProviderTopupResponse,
  ProviderRefundRequest,
  ProviderRefundResponse,
  ProviderCancelRequest,
  ProviderCancelResponse,
} from "../../providers/provider-interface";
import type {
  EsimGoOrderResponse,
  EsimGoOrderDetailsResponse,
  EsimGoEsimResponse,
  EsimGoBundleResponse,
  EsimGoTopupResponse,
} from "./types";

export async function createEsimGoOrder(
  request: ProviderOrderRequest,
  apiKey: string
): Promise<ProviderOrderResponse> {
  try {
    console.log('Creating eSIM Go order with request:', request);
    const response = await makeEsimGoRequest<EsimGoOrderResponse>(
      '/orders',
      'POST',
      {
        type: 'transaction',
        assign: false,
        order: [
          {
            type: "bundle",
            item: request.packageId,
            quantity: request.quantity || 1,
            allowReassign: true,
            iccids: [''],
          }
        ],
      },
      apiKey
    );

    console.log('EsimGo create order response:', response);

    if (response.iccids && response.iccids.length > 0) {
      const esim = response.iccids[0];
      const qrCode = `LPA:1$${esim.smdpAddress}$${esim.matchingId}`;

      return {
        success: true,
        providerOrderId: response.reference,
        requestId: response.reference,
        status: 'completed',
        iccid: esim.iccid,
        qrCode,
        smdpAddress: esim.smdpAddress,
        activationCode: esim.matchingId,
      };
    }

    return {
      success: true,
      providerOrderId: response.reference,
      requestId: response.reference,
      status: 'processing',
      processingTime: 10,
    };
  } catch (error) {
    return {
      success: false,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getEsimGoOrderStatus(
  providerOrderId: string,
  apiKey: string
): Promise<ProviderOrderStatus> {
  try {
    const response = await makeEsimGoRequest<EsimGoOrderDetailsResponse>(
      `/orders/${providerOrderId}`,
      'GET',
      undefined,
      apiKey
    );

    const order = response.order;
    const status = order.status === 'completed' ? 'completed' :
      order.status === 'processing' || order.status === 'pending' ? 'processing' :
        order.status === 'failed' ? 'failed' : 'pending';

    const esim = order.esims[0];

    return {
      providerOrderId: order.id,
      status,
      iccid: esim?.iccid,
      qrCode: esim?.qr_code,
      smdpAddress: esim?.sm_dp_address,
      activationCode: esim?.activation_code,
    };
  } catch (error) {
    return {
      providerOrderId,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getEsimGoUsageData(
  iccid: string,
  apiKey: string
): Promise<ProviderUsageData> {
  try {
    const response = await makeEsimGoRequest<EsimGoEsimResponse>(
      `/esims/${iccid}`,
      'GET',
      undefined,
      apiKey
    );

    const esim = response.esim;
    const percentageUsed = esim.data.limit_in_bytes > 0
      ? (esim.data.used_in_bytes / esim.data.limit_in_bytes) * 100
      : 0;

    return {
      iccid: esim.iccid,
      dataUsed: esim.data.used_in_bytes,
      dataTotal: esim.data.limit_in_bytes,
      dataRemaining: esim.data.remaining_in_bytes,
      percentageUsed: Math.round(percentageUsed * 100) / 100,
      expiresAt: new Date(esim.validity.expires_at),
      status: esim.status === 'active' ? 'active' : 'inactive',
    };
  } catch (error) {
    throw new Error(`Failed to get usage data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getEsimGoTopupPackages(
  iccidOrPackageId: string,
  apiKey: string
): Promise<ProviderTopupPackage[]> {
  try {
    if (iccidOrPackageId.length > 15) {
      const response = await makeEsimGoRequest<EsimGoEsimResponse>(
        `/esims/${iccidOrPackageId}`,
        'GET',
        undefined,
        apiKey
      );

      if (response.esim.supported_topups) {
        return response.esim.supported_topups.map(topup => ({
          providerPackageId: topup.bundle_id,
          title: topup.name,
          dataAmount: formatDataAmount(topup.data_limit_in_bytes),
          validity: topup.validity.duration_in_days,
          wholesalePrice: topup.price.amount / 100,
          currency: topup.price.currency_code,
        }));
      }
      return [];
    } else {
      const response = await makeEsimGoRequest<EsimGoBundleResponse>(
        `/bundles/${iccidOrPackageId}`,
        'GET',
        undefined,
        apiKey
      );

      const topupPackages: ProviderTopupPackage[] = [];
      for (const topupId of response.bundle.supported_topups) {
        const topupBundle = await makeEsimGoRequest<EsimGoBundleResponse>(
          `/bundles/${topupId}`,
          'GET',
          undefined,
          apiKey
        );

        topupPackages.push({
          providerPackageId: topupBundle.bundle.id,
          title: topupBundle.bundle.name,
          dataAmount: formatDataAmount(topupBundle.bundle.data_limit_in_bytes),
          validity: topupBundle.bundle.validity.duration_in_days,
          wholesalePrice: topupBundle.bundle.price.amount / 100,
          currency: topupBundle.bundle.price.currency_code,
        });
      }

      return topupPackages;
    }
  } catch (error) {
    return [];
  }
}

export async function purchaseEsimGoTopup(
  request: ProviderTopupRequest,
  apiKey: string
): Promise<ProviderTopupResponse> {
  try {
    const response = await makeEsimGoRequest<EsimGoTopupResponse>(
      '/topups',
      'POST',
      {
        iccid: request.iccid,
        bundle_id: request.packageId,
      },
      apiKey
    );

    return {
      success: true,
      providerTopupId: response.topup.id,
      requestId: response.topup.id,
      status: response.topup.status === 'completed' ? 'completed' : 'processing',
    };
  } catch (error) {
    return {
      success: false,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function requestEsimGoRefund(
  request: ProviderRefundRequest,
  apiKey: string
): Promise<ProviderRefundResponse> {
  try {
    const esimResponse = await makeEsimGoRequest<EsimGoEsimResponse>(
      `/esims/${request.iccid}`,
      'GET',
      undefined,
      apiKey
    );

    const usageId = esimResponse.esim.current_usage?.id;
    if (!usageId) {
      return {
        success: false,
        approved: false,
        status: "rejected",
        errorMessage: "No active usage found for this eSIM - cannot refund",
      };
    }

    if (esimResponse.esim.status === 'active' && esimResponse.esim.data?.used_in_bytes > 0) {
      return {
        success: false,
        approved: false,
        status: "rejected",
        errorMessage: "eSIM has been activated and used - cannot refund",
      };
    }

    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
    const orderCreatedAt = request.orderCreatedAt ? new Date(request.orderCreatedAt) : null;
    if (orderCreatedAt) {
      const daysSinceOrder = Date.now() - orderCreatedAt.getTime();
      if (daysSinceOrder > SIXTY_DAYS_MS) {
        return {
          success: false,
          approved: false,
          status: "rejected",
          errorMessage: "Refund window expired - eSIM Go only allows refunds within 60 days of purchase",
        };
      }
    }

    const response = await makeEsimGoRequest<{ success: boolean; message?: string }>(
      '/inventory/refund',
      'POST',
      {
        usageId: usageId,
        quantity: 1,
      },
      apiKey
    );

    return {
      success: true,
      approved: true,
      status: "approved",
      message: response.message || "Refund processed successfully",
    };
  } catch (error) {
    return {
      success: false,
      approved: false,
      status: "rejected",
      errorMessage: error instanceof Error ? error.message : "Refund request failed",
    };
  }
}

export async function cancelEsimGoOrder(
  request: ProviderCancelRequest,
  apiKey: string
): Promise<ProviderCancelResponse> {
  return {
    success: false,
    status: "not_supported",
    errorMessage: "eSIM Go does not support order cancellation - use refund instead",
  };
}
