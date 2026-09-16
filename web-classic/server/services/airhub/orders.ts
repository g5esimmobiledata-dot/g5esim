"use strict";

import type {
  ProviderOrderRequest,
  ProviderOrderResponse,
  ProviderOrderStatus,
  ProviderTopupPackage,
  ProviderTopupRequest,
  ProviderTopupResponse,
  ProviderUsageData,
} from "../../providers/provider-interface";
import { extractArray, firstNumber, firstString, formatDataAmount } from "./types";
import { makeAirhubRequest } from "./api";

function findObject(value: any): any {
  if (Array.isArray(value)) return value[0] || {};
  if (!value || typeof value !== "object") return {};
  for (const key of ["data", "result", "response", "order", "orders", "activationCodes", "activationcodes"]) {
    if (value[key]) return findObject(value[key]);
  }
  return value;
}

function qrFromActivation(smdp?: string, activation?: string, qr?: string) {
  if (qr) return qr;
  if (smdp && activation) return `LPA:1$${smdp}$${activation}`;
  return undefined;
}

export async function createAirhubOrder(
  request: ProviderOrderRequest,
  token: string,
  partnerCode: number
): Promise<ProviderOrderResponse> {
  try {
    const uniqueOrderId = request.transactionId || request.customerRef || `airhub-${Date.now()}`;
    const response = await makeAirhubRequest<any>(
      "/api/ESIM/PurhaseSim",
      "POST",
      {
        partnerCode,
        planCode: request.packageId,
        travelDate: "",
        unique_order_id: uniqueOrderId,
      },
      token
    );

    const data = findObject(response);
    const providerOrderId = firstString(data, ["orderId", "orderID", "orderid", "id", "OrderId"], uniqueOrderId);
    const iccid = firstString(data, ["iccid", "ICCID"]);
    const smdpAddress = firstString(data, ["smdpAddress", "smdp", "smdp_Address", "smdpaddress"]);
    const activationCode = firstString(data, ["activationCode", "activation_code", "matchingId", "ac"]);
    const qrCode = qrFromActivation(smdpAddress, activationCode, firstString(data, ["qrCode", "qrcode", "qr_code"]));

    return {
      success: true,
      providerOrderId,
      requestId: uniqueOrderId,
      iccid: iccid || undefined,
      smdpAddress: smdpAddress || undefined,
      activationCode: activationCode || undefined,
      qrCode,
      status: iccid || activationCode || qrCode ? "completed" : "processing",
      processingTime: iccid || activationCode || qrCode ? undefined : 10,
    };
  } catch (error) {
    return {
      success: false,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown Airhub order error",
    };
  }
}

export async function getAirhubOrderStatus(
  providerOrderId: string,
  token: string,
  partnerCode: number
): Promise<ProviderOrderStatus> {
  try {
    const response = await makeAirhubRequest<any>(
      "/api/ESIM/GetActivationCode",
      "POST",
      { partnerCode, orderid: [providerOrderId] },
      token
    );
    const data = findObject(response);
    const statusRaw = firstString(data, ["status", "orderStatus", "esimStatus"]).toLowerCase();
    const status =
      statusRaw.includes("fail") ? "failed" :
        statusRaw.includes("cancel") ? "cancelled" :
          statusRaw.includes("pending") || statusRaw.includes("process") ? "processing" :
            "completed";
    const smdpAddress = firstString(data, ["smdpAddress", "smdp", "smdp_Address", "smdpaddress"]);
    const activationCode = firstString(data, ["activationCode", "activation_code", "matchingId", "ac"]);

    return {
      providerOrderId,
      status,
      iccid: firstString(data, ["iccid", "ICCID"]) || undefined,
      smdpAddress: smdpAddress || undefined,
      activationCode: activationCode || undefined,
      qrCode: qrFromActivation(smdpAddress, activationCode, firstString(data, ["qrCode", "qrcode", "qr_code"])),
    };
  } catch (error) {
    return {
      providerOrderId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown Airhub status error",
    };
  }
}

export async function getAirhubUsageData(iccid: string): Promise<ProviderUsageData> {
  return {
    iccid,
    dataUsed: 0,
    dataTotal: 0,
    dataRemaining: 0,
    percentageUsed: 0,
    status: "inactive",
  };
}

export async function getAirhubTopupPackages(
  token: string,
  packageIdOrVendorId: string
): Promise<ProviderTopupPackage[]> {
  const response = await makeAirhubRequest<any>(
    `/api/TopupPlans/Get_topup_plans?flag=1&vendorid=${encodeURIComponent(packageIdOrVendorId)}`,
    "GET",
    undefined,
    token
  );
  return extractArray(response).map((plan) => {
    const data = formatDataAmount(plan);
    return {
      providerPackageId: firstString(plan, ["planid", "planId", "id", "planCode"]),
      title: firstString(plan, ["name", "title", "planName"], data.label),
      dataAmount: data.label,
      validity: firstNumber(plan, ["validity", "validityDays", "days"], 1),
      wholesalePrice: firstNumber(plan, ["price", "amount", "cost"], 0),
      currency: firstString(plan, ["currency"], "USD"),
    };
  }).filter((plan) => plan.providerPackageId && plan.wholesalePrice > 0);
}

export async function purchaseAirhubTopup(
  request: ProviderTopupRequest,
  token: string,
  partnerCode: number
): Promise<ProviderTopupResponse> {
  try {
    const response = await makeAirhubRequest<any>(
      "/api/TopupPlans/purchaseTopup_plan",
      "POST",
      {
        planid: request.packageId,
        partnercode: String(partnerCode),
        iccid: request.iccid,
        guid: "",
        cip: "",
      },
      token
    );
    const data = findObject(response);
    const id = firstString(data, ["topupId", "id", "orderId", "guid"], request.packageId);
    return { success: true, providerTopupId: id, requestId: id, status: "processing" };
  } catch (error) {
    return {
      success: false,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown Airhub topup error",
    };
  }
}
