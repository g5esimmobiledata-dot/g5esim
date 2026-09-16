"use strict";

import {
  createMayaEsim,
  getMayaEsim,
  deleteMayaEsim,
} from "./api-client";
import type {
  ProviderOrderRequest,
  ProviderOrderResponse,
  ProviderOrderStatus,
  ProviderRefundRequest,
  ProviderRefundResponse,
  ProviderCancelRequest,
  ProviderCancelResponse,
} from "../../providers/provider-interface";
import type {
  MayaCreateEsimResponse,
  MayaGetEsimResponse,
  MayaDeleteEsimResponse,
} from "./types";

export async function createMayaOrder(
  request: ProviderOrderRequest,
  apiKey: string,
  apiSecret: string
): Promise<ProviderOrderResponse> {
  try {
    const response = await createMayaEsim(
      request.packageId,
      apiKey,
      apiSecret,
      request.customerRef
    ) as MayaCreateEsimResponse;

    if (!response.esim) {
      return {
        success: false,
        status: "failed",
        errorMessage: response.message || "Failed to create eSIM",
      };
    }

    const esim = response.esim;
    const qrCode = esim.smdp_address && esim.matching_id
      ? `LPA:1$${esim.smdp_address}$${esim.matching_id}`
      : undefined;

    // eSIM is "completed" (ready to assign) if we have QR code/ICCID, even if Maya status is "pending"
    // "pending" in Maya means awaiting user installation, but the eSIM is fully provisioned
    const isProvisioned = !!(esim.iccid && (qrCode || esim.qr_code_url));

    return {
      success: true,
      providerOrderId: esim.id,
      requestId: response.request_id,
      status: isProvisioned || esim.status === "active" ? "completed" : "pending",
      iccid: esim.iccid,
      qrCode,
      qrCodeUrl: esim.qr_code_url,
      smdpAddress: esim.smdp_address,
      activationCode: esim.activation_code || esim.matching_id,
    };
  } catch (error) {
    console.error("[Maya] Create order failed:", error);
    return {
      success: false,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// export async function getMayaOrderStatus(
//   providerOrderId: string,
//   apiKey: string,
//   apiSecret: string
// ): Promise<ProviderOrderStatus> {
//   try {
//     const response = await getMayaEsim(
//       providerOrderId,
//       apiKey,
//       apiSecret
//     ) as MayaGetEsimResponse;

//     if (!response.esim) {
//       return {
//         providerOrderId,
//         status: "failed",
//         errorMessage: "eSIM not found",
//       };
//     }

//     const esim = response.esim;

//     const qrCode = esim.smdp_address && esim.matching_id 
//       ? `LPA:1$${esim.smdp_address}$${esim.matching_id}`
//       : undefined;

//     // eSIM is "completed" (ready to assign) if we have QR code/ICCID, even if Maya status is "pending"
//     // Maya "pending" = provisioned but awaiting user installation (which is fine for assignment)
//     // Maya "active" = user has installed/activated the eSIM
//     const isProvisioned = !!(esim.iccid && (qrCode || esim.qr_code_url));

//     let status: "completed" | "processing" | "pending" | "failed" | "cancelled";
//     if (isProvisioned || esim.status === "active") {
//       status = "completed";
//     } else if (esim.status === "suspended" || esim.status === "deleted") {
//       status = "cancelled";
//     } else {
//       // Still waiting for provisioning
//       status = "pending";
//     }

//     return {
//       providerOrderId: esim.id,
//       status,
//       iccid: esim.iccid,
//       qrCode,
//       qrCodeUrl: esim.qr_code_url,
//       smdpAddress: esim.smdp_address,
//       activationCode: esim.activation_code || esim.matching_id,
//     };
//   } catch (error) {
//     console.error("[Maya] Get order status failed:", error);
//     return {
//       providerOrderId,
//       status: "failed",
//       errorMessage: error instanceof Error ? error.message : "Unknown error",
//     };
//   }
// }



export async function getMayaOrderStatus(
  providerOrderId: string,
  apiKey: string,
  apiSecret: string
): Promise<ProviderOrderStatus> {
  try {
    const response = await getMayaEsim(
      providerOrderId,
      apiKey,
      apiSecret
    ) as MayaGetEsimResponse;

    console.log("[Maya] Get order status response:", response);

    if (!response.esim) {
      return {
        providerOrderId,
        status: "failed",
        errorMessage: "eSIM not found",
      };
    }

    const esim = response.esim;

    // Maya already provides full LPA string
    const qrCode = esim.activation_code || undefined;

    // Provisioned if ICCID exists
    const isProvisioned = Boolean(esim.iccid);

    let status: "completed" | "processing" | "pending" | "failed" | "cancelled";

    /**
     * Maya status meaning:
     * - service_status = active → provisioned
     * - state = DISABLED → not yet installed by user (still OK)
     * - network_status = ENABLED → ready to use
     */
    if (isProvisioned && esim.service_status === "active") {
      status = "completed";
    } else {
      status = "pending";
    }

    return {
      providerOrderId: esim.uid, // ✅ correct field
      status,
      iccid: esim.iccid,
      qrCode,
      smdpAddress: esim.smdp_address,
      activationCode: esim.manual_code,
      esimStatus: esim.network_status,
      apnValues: esim.apn
    };

  } catch (error) {
    console.error("[Maya] Get order status failed:", error);
    return {
      providerOrderId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}



export async function requestMayaRefund(
  request: ProviderRefundRequest,
  apiKey: string,
  apiSecret: string
): Promise<ProviderRefundResponse> {
  try {
    if (!request.iccid) {
      return {
        success: false,
        approved: false,
        status: "rejected",
        errorMessage: "ICCID (eSIM ID) is required for Maya refund",
      };
    }

    const esimResponse = await getMayaEsim(
      request.iccid,
      apiKey,
      apiSecret
    ) as MayaGetEsimResponse;

    if (esimResponse.esim?.status === "active" && esimResponse.esim.activated_at) {
      return {
        success: false,
        approved: false,
        status: "rejected",
        errorMessage: "eSIM has been activated - cannot refund activated eSIMs",
      };
    }

    const deleteResponse = await deleteMayaEsim(
      request.iccid,
      apiKey,
      apiSecret
    ) as MayaDeleteEsimResponse;

    return {
      success: true,
      approved: true,
      status: "approved",
      message: deleteResponse.message || `eSIM deleted and refund of ${deleteResponse.refund_amount || 0} processed`,
    };
  } catch (error) {
    console.error("[Maya] Refund request failed:", error);
    return {
      success: false,
      approved: false,
      status: "rejected",
      errorMessage: error instanceof Error ? error.message : "Refund request failed",
    };
  }
}

export async function cancelMayaOrder(
  request: ProviderCancelRequest,
  apiKey: string,
  apiSecret: string
): Promise<ProviderCancelResponse> {
  try {
    // Maya API requires ICCID for eSIM operations - prefer it over other identifiers
    const esimId = request.iccid || request.providerOrderId || request.requestId;

    if (!esimId) {
      return {
        success: false,
        status: "not_supported",
        errorMessage: "ICCID, provider order ID, or request ID is required for Maya cancellation",
      };
    }

    const esimResponse = await getMayaEsim(
      esimId,
      apiKey,
      apiSecret
    ) as MayaGetEsimResponse;

    if (esimResponse.esim?.status === "active") {
      return {
        success: false,
        status: "not_supported",
        errorMessage: "Cannot cancel an activated eSIM - use refund instead",
      };
    }

    const deleteResponse = await deleteMayaEsim(
      esimId,
      apiKey,
      apiSecret
    ) as MayaDeleteEsimResponse;

    return {
      success: true,
      status: "cancelled",
      message: deleteResponse.message || "Order cancelled successfully",
    };
  } catch (error) {
    console.error("[Maya] Cancel order failed:", error);
    return {
      success: false,
      status: "not_supported",
      errorMessage: error instanceof Error ? error.message : "Cancellation failed",
    };
  }
}
