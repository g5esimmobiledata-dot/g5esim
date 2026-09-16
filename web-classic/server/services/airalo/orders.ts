"use strict";

import { airaloAPI } from "./airalo-sdk";
import type {
  ProviderOrderRequest,
  ProviderOrderResponse,
  ProviderOrderStatus,
  ProviderTopupPackage,
  ProviderTopupRequest,
  ProviderTopupResponse,
  ProviderRefundRequest,
  ProviderRefundResponse,
  ProviderCancelRequest,
  ProviderCancelResponse,
} from "../../providers/provider-interface";
import { db } from "server/db";
import { orders } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function createAiraloOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse> {
  try {
    const useAsync = (request.quantity || 1) > 5;

    let response;
    if (useAsync) {
      response = await airaloAPI.submitOrderAsync(request.packageId, request.quantity || 1);
    } else if (request.customerEmail) {
      response = await airaloAPI.orderWithEmailSimShare(
        request.packageId,
        request.quantity || 1,
        {
          to_email: request.customerEmail,
          sharing_option: ["link", "pdf"],
        },
        request.customerRef,
      );
    } else {
      response = await airaloAPI.submitOrder(request.packageId, request.quantity || 1);
    }

    if (response.data && response.data.id) {
      const order = response.data;

      if (order.sims && order.sims.length > 0) {
        const sim = order.sims[0];

        return {
          success: true,
          providerOrderId: String(order.id),
          requestId: String(order.id),
          status: 'completed',
          iccid: sim.iccid,
          qrCode: sim.qrcode,
          smdpAddress: sim.lpa || '',
          activationCode: sim.matching_id || sim.manual_activation_code || '',
          providerEmailSent: Boolean(request.customerEmail && !useAsync),
        };
      }

      return {
        success: true,
        providerOrderId: String(order.id),
        requestId: String(order.id),
        status: 'processing',
        processingTime: useAsync ? 10 : 5,
      };
    }

    throw new Error('Order response did not contain order data');
  } catch (error) {
    return {
      success: false,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getAiraloOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus> {
  try {
    const orderDB = await db.query.orders.findFirst({
      where: eq(orders.providerOrderId, providerOrderId),
    });

    const response = await airaloAPI.getSimDetails(orderDB?.iccid);

    console.log("response", JSON.stringify(response, null, 2));
    const order = response?.data;


    if (order) {
      return {
        providerOrderId: String(order.id),
        status: order.iccid ? "completed" : "processing",
        iccid: order.iccid,
        qrCode: order.qrcode,
        qrCodeUrl: order.qrcode_url,
        directAppleUrl: order.direct_apple_installation_url,
        apnValue: order.apn_value,
        apnType: order.apn_type,
        isRoaming: order.is_roaming,
        smdpAddress: order.lpa || "",
        activationCode: order.matching_id || "",
      };
    }

    return {
      providerOrderId,
      status: "failed",
      errorMessage: "Order not found",
    };
  } catch (error) {
    return {
      providerOrderId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}



export async function getAiraloEsim(providerOrderId: string): Promise<ProviderOrderStatus> {
  try {
    const response = await airaloAPI.getSimDetails(providerOrderId);

    if (response.data) {
      const order = response.data;
      const status = order.sims && order.sims.length > 0 ? 'completed' : 'processing';
      const sim = order.sims?.[0];

      return {
        providerOrderId: String(order.id),
        status,
        iccid: sim?.iccid,
        qrCode: sim?.qrcode,
        smdpAddress: sim?.lpa || '',
        activationCode: sim?.matching_id || sim?.manual_activation_code || '',
      };
    }

    return {
      providerOrderId,
      status: 'failed',
      errorMessage: 'Order not found',
    };
  } catch (error) {
    return {
      providerOrderId,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// export async function getAiraloTopupPackages(iccidOrPackageId: string): Promise<ProviderTopupPackage[]> {
//   try {
//     const isIccid = /^\d{19,20}$/.test(iccidOrPackageId);

//     if (isIccid) {
//       const simResponse = await airaloAPI.getSimDetails(iccidOrPackageId);

//       if (simResponse.data && simResponse.data.package && simResponse.data.package.topup_packages) {
//         return simResponse.data.package.topup_packages.map((pkg: any) => ({
//           providerPackageId: String(pkg.id),
//           title: pkg.title,
//           dataAmount: pkg.data,
//           validity: pkg.validity,
//           wholesalePrice: parseFloat(pkg.price),
//           currency: pkg.currency_code,
//         }));
//       }
//     } else {
//       const packageResponse = await airaloAPI.getPackage(iccidOrPackageId);

//       if (packageResponse.data && packageResponse.data.topup_packages) {
//         return packageResponse.data.topup_packages.map((pkg: any) => ({
//           providerPackageId: String(pkg.id),
//           title: pkg.title,
//           dataAmount: pkg.data,
//           validity: pkg.validity,
//           wholesalePrice: parseFloat(pkg.price),
//           currency: pkg.currency_code,
//         }));
//       }
//     }

//     return [];
//   } catch (error) {
//     return [];
//   }
// }


export async function getAiraloTopupPackages(iccidOrPackageId: string): Promise<ProviderTopupPackage[]> {
  try {
    const isIccid = /^\d{19,20}$/.test(iccidOrPackageId);
    let packagesArray: any[] = [];

    if (isIccid) {
      const simResponse = await airaloAPI.getTopupPackages(iccidOrPackageId);
      console.log("simResponse", JSON.stringify(simResponse, null, 2));

      if (Array.isArray(simResponse.data)) {
        packagesArray = simResponse.data;
      } else if (simResponse.data && simResponse.data.topup_packages) {
        packagesArray = simResponse.data.topup_packages;
      }
    } else {
      const packageResponse = await airaloAPI.getPackage(iccidOrPackageId);
      if (packageResponse.data && packageResponse.data.topup_packages) {
        packagesArray = packageResponse.data.topup_packages;
      } else if (Array.isArray(packageResponse.data)) {
        packagesArray = packageResponse.data;
      }
    }

    return packagesArray.map((pkg: any) => ({
      providerPackageId: String(pkg.id),
      title: pkg.title,
      dataAmount: pkg.data,
      validity: pkg.day || pkg.validity,
      wholesalePrice: pkg.net_price !== undefined ? parseFloat(pkg.net_price) : parseFloat(pkg.price),
      currency: pkg.currency_code || 'USD',
    }));
  } catch (error) {
    console.error("Error getting Airalo topup packages:", error);
    return [];
  }
}

export async function purchaseAiraloTopup(request: ProviderTopupRequest): Promise<ProviderTopupResponse> {
  try {
    const response = await airaloAPI.submitTopup(request.iccid, request.packageId);

    if (response.data && response.data.id) {
      return {
        success: true,
        providerTopupId: String(response.data.id),
        requestId: String(response.data.id),
        status: 'completed',
      };
    }

    throw new Error('Topup response did not contain order data');
  } catch (error) {
    return {
      success: false,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function requestAiraloRefund(request: ProviderRefundRequest): Promise<ProviderRefundResponse> {
  try {
    console.log("request", JSON.stringify(request, null, 2));
    const airaloReason = request.reason === "SERVICE_ISSUES" ? "SERVICE_DEGRADATION" : "OTHERS";

    const response = await airaloAPI.requestRefund({
      iccids: [request.iccid],
      reason: airaloReason,
      notes: request.notes || (airaloReason === "OTHERS" ? "Customer requested refund" : undefined),
      email: request.email,
    });

    console.log("response", JSON.stringify(response, null, 2));

    if (response.meta && response.meta.message) {
      const isApproved = response.meta.message.toLowerCase().includes("success") ||
        response.meta.message.toLowerCase().includes("approved");

      return {
        success: true,
        approved: isApproved,
        refundId: response.data?.refund_id,
        status: isApproved ? "approved" : "pending",
        message: response.meta.message,
      };
    }

    return {
      success: true,
      approved: false,
      status: "pending",
      message: "Refund request submitted for review",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refund request failed";
    const normalized = message.toLowerCase();

    return {
      success: false,
      approved: false,
      status: "rejected",
      errorMessage: normalized.includes("resource not found")
        ? "Airalo did not accept an automated refund for this eSIM. The SIM exists, but this order appears to be ineligible for refund via the Partner API. Please contact your Airalo account manager or process this refund manually."
        : message,
    };
  }
}

export async function cancelAiraloFutureOrders(requestIds: string[]): Promise<ProviderCancelResponse> {
  try {
    console.log("requestIds", JSON.stringify(requestIds, null, 2));
    const response = await airaloAPI.cancelFutureOrders(requestIds);

    if (response.meta && response.meta.message) {
      return {
        success: true,
        status: "cancelled",
        message: response.meta.message,
      };
    }

    return {
      success: true,
      status: "cancelled",
      message: "Future Orders cancelled successfully",
    };
  } catch (error) {
    return {
      success: false,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Cancel request failed",
    };
  }
}
