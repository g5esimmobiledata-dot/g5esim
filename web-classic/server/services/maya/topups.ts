"use strict";

import { getMayaProducts, getMayaEsim, changeMayaEsim, getMayaEsimPlans } from "./api-client";
import { formatDataAmount } from "./types";
import type {
  ProviderTopupPackage,
  ProviderTopupRequest,
  ProviderTopupResponse,
} from "../../providers/provider-interface";
import type { MayaProductsResponse, MayaGetEsimResponse, MayaChangeEsimResponse, MayaGetPlansResponse } from "./types";

export async function getMayaTopupPackages(
  iccidOrProductUid: string,
  apiKey: string,
  apiSecret: string
): Promise<ProviderTopupPackage[]> {
  try {
    const esimResponse = await getMayaEsim(
      iccidOrProductUid,
      apiKey,
      apiSecret
    ) as MayaGetEsimResponse;
    
    if (!esimResponse.esim) {
      console.warn("[Maya] eSIM not found, attempting to get products for country");
      return [];
    }
    
    const esim = esimResponse.esim;
    
    const plansResponse = await getMayaEsimPlans(
      iccidOrProductUid,
      apiKey,
      apiSecret
    ) as MayaGetPlansResponse;
    
    if (!plansResponse.plans || plansResponse.plans.length === 0) {
      return [];
    }
    
    const activePlan = plansResponse.plans.find(p => p.status === "active");
    if (!activePlan) {
      return [];
    }
    
    const productsResponse = await getMayaProducts(
      apiKey,
      apiSecret
    ) as MayaProductsResponse;
    
    if (!productsResponse.products) {
      return [];
    }
    
    const topupPackages: ProviderTopupPackage[] = productsResponse.products.map(product => ({
      providerPackageId: product.uid,
      title: product.name,
      dataAmount: formatDataAmount(product.data_quota_mb),
      validity: product.validity_days,
      wholesalePrice: parseFloat(product.wholesale_price_usd) || 0,
      currency: "USD",
    }));
    
    return topupPackages;
  } catch (error) {
    console.error("[Maya] Get topup packages failed:", error);
    return [];
  }
}

export async function purchaseMayaTopup(
  request: ProviderTopupRequest,
  apiKey: string,
  apiSecret: string
): Promise<ProviderTopupResponse> {
  try {
    if (!request.iccid) {
      return {
        success: false,
        status: "failed",
        errorMessage: "ICCID is required for Maya topup",
      };
    }
    
    const response = await changeMayaEsim(
      request.iccid,
      "add_package",
      apiKey,
      apiSecret,
      request.packageId
    ) as MayaChangeEsimResponse;
    
    if (response.result !== 1 && response.result !== 0) {
      return {
        success: false,
        status: "failed",
        errorMessage: response.message || "Failed to add package to eSIM",
      };
    }
    
    const newPlan = response.esim?.plans?.find(p => 
      p.product_uid === request.packageId && p.status === "active"
    );
    
    return {
      success: true,
      providerTopupId: newPlan?.id || response.request_id,
      requestId: response.request_id,
      status: "completed",
    };
  } catch (error) {
    console.error("[Maya] Purchase topup failed:", error);
    return {
      success: false,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function suspendMayaEsim(
  esimId: string,
  apiKey: string,
  apiSecret: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await changeMayaEsim(
      esimId,
      "suspend",
      apiKey,
      apiSecret
    ) as MayaChangeEsimResponse;
    
    return {
      success: true,
      message: response.message || "eSIM suspended successfully",
    };
  } catch (error) {
    console.error("[Maya] Suspend eSIM failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function reactivateMayaEsim(
  esimId: string,
  apiKey: string,
  apiSecret: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await changeMayaEsim(
      esimId,
      "reactivate",
      apiKey,
      apiSecret
    ) as MayaChangeEsimResponse;
    
    return {
      success: true,
      message: response.message || "eSIM reactivated successfully",
    };
  } catch (error) {
    console.error("[Maya] Reactivate eSIM failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
