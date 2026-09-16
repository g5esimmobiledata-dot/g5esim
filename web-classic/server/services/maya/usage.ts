"use strict";

import { getMayaEsim, getMayaEsimPlans } from "./api-client";
import type { ProviderUsageData } from "../../providers/provider-interface";
import type { MayaGetEsimResponse, MayaGetPlansResponse } from "./types";


const BYTES_IN_MB_DECIMAL = 1_000_000;
const BYTES_IN_MIB = 1024 * 1024;

const bytesToDecimalMB = (bytes = 0) =>
  Math.round((bytes / BYTES_IN_MB_DECIMAL) * 100000) / 100000;

function getAdjustedUsage(totalBytes: number, remainingBytes: number, usedBytes: number) {
  // Common sizes in MB the user expects
  const standardSizes = [500, 1024, 2048, 3072, 5120, 10240, 15360, 20480, 51200, 102400];
  const rawMb = totalBytes / 1_000_000;

  let snappedTotalMb = Math.round(rawMb);
  for (const size of standardSizes) {
    if (Math.abs(rawMb - size) <= 50 || Math.abs(rawMb - (size / 1024) * 1000) <= 50) {
      snappedTotalMb = size;
      break;
    }
  }

  // Handle case where total is 0
  if (totalBytes === 0) {
    return { dataTotalMb: 0, dataRemainingMb: 0, dataUsedMb: 0 };
  }

  // Calculate ratio
  const ratio = snappedTotalMb / totalBytes;

  const dataTotalMb = snappedTotalMb;
  const dataRemainingMb = Math.round(remainingBytes * ratio);
  let dataUsedMb = Math.round(usedBytes * ratio);

  // Ensure they sum up perfectly
  if (dataRemainingMb + dataUsedMb !== dataTotalMb) {
    dataUsedMb = dataTotalMb - dataRemainingMb;
  }

  return { dataTotalMb, dataRemainingMb, dataUsedMb };
}



export async function getMayaUsageData(
  iccidOrEsimId: string,
  apiKey: string,
  apiSecret: string
): Promise<ProviderUsageData> {
  try {
    const esimResponse = await getMayaEsim(
      iccidOrEsimId,
      apiKey,
      apiSecret
    ) as MayaGetEsimResponse;

    if (!esimResponse.esim) {
      throw new Error("eSIM not found");
    }

    const esim = esimResponse.esim;

    const plansResponse = await getMayaEsimPlans(
      iccidOrEsimId,
      apiKey,
      apiSecret
    ) as MayaGetPlansResponse;

    let totalBytes = 0;
    let remainingBytes = 0;
    let usedBytes = 0;
    let expiresAt: Date | undefined;
    let activatedAt: Date | undefined;

    console.log("[Maya] Plans response:", plansResponse);

    if (plansResponse.plans?.length) {
      const activePlans = plansResponse.plans.filter(
        (p: any) => p.network_status === "ACTIVE" || p.network_status === "NOT_ACTIVE"
      );

      for (const plan of activePlans) {
        const quota = plan.data_quota_bytes || 0;
        const remaining = plan.data_bytes_remaining || 0;
        const used = quota - remaining;

        totalBytes += quota;
        remainingBytes += remaining;
        usedBytes += used;

        if (plan.end_time && plan.end_time !== "0000-00-00 00:00:00") {
          const expiry = new Date(plan.end_time);
          if (!expiresAt || expiry < expiresAt) {
            expiresAt = expiry;
          }
        }

        if (plan.date_activated && plan.date_activated !== "0000-00-00 00:00:00") {
          const activated = new Date(plan.date_activated);
          if (!activatedAt || activated < activatedAt) {
            activatedAt = activated;
          }
        }
      }
    }

    // 🔁 Adjust and snap bytes to standard MB sizes
    const { dataTotalMb, dataRemainingMb, dataUsedMb } = getAdjustedUsage(
      totalBytes,
      remainingBytes,
      usedBytes
    );

    const percentageUsed =
      dataTotalMb > 0
        ? Math.round((dataUsedMb / dataTotalMb) * 10000) / 100
        : 0;

    let status: "active" | "inactive" | "expired" = "inactive";

    const hasActivePlan = plansResponse.plans?.some(
      (p: any) => p.network_status === "ACTIVE"
    );

    if (hasActivePlan) {
      status = "active";
    } else {
      status = "inactive";
    }


    // console.log({
    //   iccid: esim.iccid,
    //   dataUsed: dataUsedMb,        // ✅ MB
    //   dataTotal: dataTotalMb,      // ✅ MB
    //   dataRemaining: dataRemainingMb, // ✅ MB
    //   percentageUsed,
    //   activatedAt: activatedAt ?? new Date(esim.date_assigned),
    //   expiresAt,
    //   status,
    // })

    return {
      iccid: esim.iccid,
      dataUsed: dataUsedMb,        // ✅ MB
      dataTotal: dataTotalMb,      // ✅ MB
      dataRemaining: dataRemainingMb, // ✅ MB
      percentageUsed,
      activatedAt: activatedAt ?? new Date(esim.date_assigned),
      expiresAt,
      status,
    };

  } catch (error) {
    console.error("[Maya] Get usage data failed:", error);
    throw new Error(
      `Failed to get usage data: ${error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}


