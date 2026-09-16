"use strict";

import { makeEsimAccessRequest, formatDataAmount } from "./api";
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
  EsimAccessOrderResponse,
  EsimAccessQueryResponse,
  EsimAccessTopupListResponse,
  EsimAccessTopupResponse,
} from "./types";

export async function createEsimAccessOrder(
  request: ProviderOrderRequest,
  accessCode: string,
  secretKey: string
): Promise<ProviderOrderResponse> {
  try {
    const transactionId =
      request.transactionId ||
      request.customerRef ||
      `esim-access-${Date.now()}`;

    const response = await makeEsimAccessRequest<any>(
      "/api/v1/open/esim/order",
      "POST",
      {
        transactionId,
        packageInfoList: [
          {
            packageCode: request.packageId,
            count: request.quantity || 1,
          },
        ],
        packageCode: request.packageId,
        quantity: request.quantity || 1,
      },
      accessCode,
      secretKey
    );

    const orderNo = response?.obj?.orderNo;

    if (!orderNo) {
      throw new Error("Provider did not return orderNo");
    }

    // ===============================
    // STEP 2 – WAIT FOR ALLOCATION
    // ===============================

    const allocatedOrder = await waitForEsimAllocation(
      orderNo,
      accessCode,
      secretKey
    );

    console.log("Allocated order:", orderNo, allocatedOrder);

    return {
      success: true,
      providerOrderId: orderNo,
      requestId: orderNo,
      status: allocatedOrder.status === 'cancelled' ? 'failed' : allocatedOrder.status,
      processingTime: 5,

      iccid: allocatedOrder.iccid,
      qrCode: allocatedOrder.qrCode,
      smdpAddress: allocatedOrder.smdpAddress,
      activationCode: allocatedOrder.activationCode,
    };
  } catch (error) {
    return {
      success: false,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ===============================
// POLLING LOGIC (MOST IMPORTANT PART)
// ===============================

async function waitForEsimAllocation(
  orderNo: string,
  accessCode: string,
  secretKey: string,
  maxRetries = 12,
  delayMs = 3000
): Promise<ProviderOrderStatus> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const status = await getEsimAccessOrderStatus(
      orderNo,
      accessCode,
      secretKey
    );

    if (
      status.iccid &&
      ["completed", "active", "ready"].includes(status.status)
    ) {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("eSIM allocation timeout");
}

export async function getEsimAccessOrderStatus(
  providerOrderId: string,
  accessCode: string,
  secretKey: string
): Promise<ProviderOrderStatus> {
  try {
    // console.log('Checking status for order:', providerOrderId);
    const response = await makeEsimAccessRequest<EsimAccessQueryResponse>(
      "/api/v1/open/esim/query",
      "POST",
      {
        orderNo: providerOrderId,
        pager: {
          pageNum: 1,
          pageSize: 10,
        },
      },
      accessCode,
      secretKey
    );

    console.log('Provider response for order', providerOrderId, ':', response);

    const obj = response.obj?.esimList?.[0] ?? response.obj;
    console.log('Order status:', obj);

    if (!obj) {
      return {
        providerOrderId,
        status: "failed",
        errorMessage: "Order not found in provider response",
      };
    }

    const rawStatus = typeof obj.status === "string" ? obj.status.toUpperCase() : "";
    const rawSmdpStatus = typeof obj.smdpStatus === "string" ? obj.smdpStatus.toUpperCase() : "";
    const rawEsimStatus = typeof obj.esimStatus === "string" ? obj.esimStatus.toUpperCase() : "";
    const status =
      rawStatus === "ALLOCATED" || rawStatus === "INSTALLED" || rawStatus === "ENABLED" || rawStatus === "IN_USE" ||
      rawSmdpStatus === "ALLOCATED" || rawSmdpStatus === "RELEASED" || rawSmdpStatus === "ENABLED" || rawSmdpStatus === "IN_USE" ||
      rawEsimStatus === "GOT_RESOURCE" || rawEsimStatus === "IN_USE"
        ? "completed"
        : rawStatus === "CANCEL" || rawStatus === "CANCELLED" || rawEsimStatus === "CANCEL"
          ? "cancelled"
          : rawStatus === "FAILED" || rawSmdpStatus === "FAILED"
            ? "failed"
            : rawStatus === "PENDING" || rawSmdpStatus === "PENDING"
              ? "processing"
              : "pending";

    const esimStatusMap: Record<string, string> = {
      PENDING: "pending",
      ALLOCATED: "ready",
      INSTALLED: "active",
      IN_USE: "active",
      ENABLED: "active",
      DISABLED: "inactive",
      CANCEL: "cancelled",
      CANCELLED: "cancelled",
      FAILED: "failed",
      USED_UP: "used_up",
      UNUSED_EXPIRED: "expired",
      USED_EXPIRED: "expired",
      SUSPENDED: "suspended",
      REVOKE: "revoked",
    };

    const esimStatus = esimStatusMap[rawEsimStatus || rawStatus] ?? "pending";
    const qrcode =
      typeof obj.qrcode === "string" && obj.qrcode
        ? obj.qrcode
        : typeof obj.ac === "string"
          ? obj.ac
          : "";
    const smdpAddress =
      typeof obj.smdpAddress === "string" && obj.smdpAddress
        ? obj.smdpAddress
        : qrcode.startsWith("LPA:")
          ? qrcode.split("$")[1] || ""
          : "";
    const activationCode =
      typeof obj.matchingId === "string" && obj.matchingId
        ? obj.matchingId
        : typeof obj.ac === "string" && obj.ac.startsWith("LPA:")
          ? obj.ac.split("$").slice(2).join("$")
        : qrcode.startsWith("LPA:")
          ? qrcode.split("$").slice(2).join("$")
          : "";


    return {
      providerOrderId: obj.orderNo || providerOrderId,
      status,
      iccid: obj.iccid,

      // eSIM install
      qrCode: qrcode,
      qrCodeUrl: typeof obj.qrCodeUrl === "string" ? obj.qrCodeUrl : undefined,
      activationCode,
      smdpAddress,
      esimStatus,

      // Plan info
      packageName: obj.packageCode,
      country: obj.ipExport,
      expiryDate: obj.expiryDate || obj.expiredTime,

      // Optional
      imsi: obj.imsi,
      apn: obj.apn,
    };

  } catch (error) {
    return {
      providerOrderId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}


export async function getEsimAccessUsageData(
  iccid: string,
  accessCode: string,
  secretKey: string
): Promise<ProviderUsageData> {
  try {
    const esimTranNoList = [iccid];

    const response = await makeEsimAccessRequest<EsimAccessQueryResponse>(
      '/api/v1/open/esim/usage/query',
      'POST',
      { esimTranNoList },
      accessCode,
      secretKey
    );

    const usage = response.obj?.esimUsageList?.[0];

    if (!usage) {
      throw new Error('No usage data returned from provider');
    }

    // Provider gives BYTES
    const BYTES_IN_MB = 1024 * 1024;

    const dataUsedMB = Math.round((usage.dataUsage ?? 0) / BYTES_IN_MB);
    const dataTotalMB = Math.round((usage.totalData ?? 0) / BYTES_IN_MB);
    const dataRemainingMB = Math.max(dataTotalMB - dataUsedMB, 0);

    const percentageUsed =
      dataTotalMB > 0 ? (dataUsedMB / dataTotalMB) * 100 : 0;

    return {
      iccid: usage.esimTranNo,
      dataUsed: dataUsedMB,       // MB
      dataTotal: dataTotalMB,     // MB
      dataRemaining: dataRemainingMB, // MB
      percentageUsed: Math.round(percentageUsed * 100) / 100,
      expiresAt: undefined, // not provided by API
      status: dataUsedMB < dataTotalMB ? 'active' : 'inactive',
    };
  } catch (error) {
    throw new Error(
      `Failed to get usage data: ${error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

export async function getEsimAccessTopupPackages(
  iccidOrPackageId: string,
  accessCode: string,
  secretKey: string
): Promise<ProviderTopupPackage[]> {
  try {
    let queryParams: { iccid?: string; packageCode?: string; slug?: string } = {};

    if (iccidOrPackageId.length > 15) {
      queryParams.iccid = iccidOrPackageId;
    } else {
      queryParams.slug = iccidOrPackageId;
    }

    const response = await makeEsimAccessRequest<EsimAccessTopupListResponse>(
      '/api/v1/open/package/list',
      'POST',
      { type: 'TOPUP', ...queryParams },
      accessCode,
      secretKey
    );

    // console.log('Provider response for topup packages:',   JSON.stringify(response.obj.packageList, null, 2));

    return response.obj.packageList.map(pkg => ({
      providerPackageId: pkg.packageCode,
      title: pkg.name,
      dataAmount: formatDataAmount(pkg.volume),
      validity: pkg.duration,
      wholesalePrice: pkg.price / 10000,
      currency: pkg.currencyCode,
    }));
  } catch (error) {
    return [];
  }
}

export async function purchaseEsimAccessTopup(
  request: ProviderTopupRequest,
  accessCode: string,
  secretKey: string
): Promise<ProviderTopupResponse> {
  try {
    const response = await makeEsimAccessRequest<EsimAccessTopupResponse>(
      '/api/v1/open/esim/topup',
      'POST',
      {
        iccid: request.iccid,
        packageCode: request.packageId,
        quantity: request.quantity || 1,
        transactionId: request.transactionId,
      },
      accessCode,
      secretKey
    );

    return {
      success: true,
      providerTopupId: response.obj.orderNo,
      requestId: response.obj.orderNo,
      status: 'completed',
    };
  } catch (error) {
    return {
      success: false,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function cancelEsimAccessEsim(
  iccid: string,
  accessCode: string,
  secretKey: string
): Promise<ProviderCancelResponse> {
  try {
    const response = await makeEsimAccessRequest<{ success: boolean; message?: string }>(
      '/api/v1/open/esim/cancel',
      'POST',
      {
        iccid,
        action: "cancel",
      },
      accessCode,
      secretKey
    );

    return {
      success: true,
      status: "cancelled",
      message: response.message || "eSIM cancelled successfully",
    };
  } catch (error) {
    return {
      success: false,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Cancel request failed",
    };
  }
}
