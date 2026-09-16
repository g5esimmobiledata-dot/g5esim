import QRCode from "qrcode";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { voucherCodes } from "@shared/schema";

const VOUCHER_DIGITS = "0123456789";
const VOUCHER_SEQUENCE_LENGTH = 10;

export function formatVoucherCode(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1-");
}

export function normalizeVoucherCode(value: unknown) {
  return formatVoucherCode(String(value || ""));
}

export function generateVoucherCode() {
  let code = "";
  for (let i = 0; i < 16; i += 1) {
    code += VOUCHER_DIGITS[Math.floor(Math.random() * VOUCHER_DIGITS.length)];
  }
  return formatVoucherCode(code);
}

function formatVoucherSequence(prefix: "S" | "SN", value: number) {
  return `${prefix}-${Math.max(0, Math.trunc(value)).toString().padStart(VOUCHER_SEQUENCE_LENGTH, "0")}`;
}

export function formatVoucherSeriesCode(value: number) {
  return formatVoucherSequence("S", value);
}

export function formatVoucherSerialNumber(value: number) {
  return formatVoucherSequence("SN", value);
}

export async function getNextVoucherSeriesCode() {
  const [row] = await db
    .select({
      maxSequence: sql<string>`COALESCE(MAX(CASE WHEN ${voucherCodes.seriesCode} ~ '^S-[0-9]+$' THEN SUBSTRING(${voucherCodes.seriesCode} FROM 3)::bigint ELSE 0 END), 0)`,
    })
    .from(voucherCodes);

  return formatVoucherSeriesCode(Number(row?.maxSequence || 0) + 1);
}

export async function getNextVoucherSerialNumbers(quantity = 1) {
  const [row] = await db
    .select({
      maxSequence: sql<string>`COALESCE(MAX(CASE WHEN ${voucherCodes.serialNumber} ~ '^SN-[0-9]+$' THEN SUBSTRING(${voucherCodes.serialNumber} FROM 4)::bigint ELSE 0 END), 0)`,
    })
    .from(voucherCodes);

  const start = Number(row?.maxSequence || 0) + 1;
  return Array.from({ length: Math.max(1, quantity) }, (_, index) =>
    formatVoucherSerialNumber(start + index),
  );
}

export function buildVoucherRedeemUrl(code: string, baseUrlOverride?: string) {
  const baseUrl = (
    baseUrlOverride ||
    process.env.BASE_URL ||
    process.env.API_BASE_URL ||
    "http://localhost:5000"
  ).replace(/\/$/, "");
  return `${baseUrl}/redeem-voucher?code=${encodeURIComponent(code)}`;
}

export async function generateVoucherQrCode(code: string, baseUrlOverride?: string) {
  const payload = buildVoucherRedeemUrl(code, baseUrlOverride);
  const qrCode = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });

  return { payload, qrCode };
}

export function voucherQrNeedsRefresh(voucher: {
  type?: string | null;
  qrCode?: string | null;
  qrPayload?: string | null;
}) {
  return (
    String(voucher.type || "").toLowerCase() === "wallet_credit" &&
    (!voucher.qrCode || !voucher.qrPayload || !voucher.qrPayload.includes("/redeem-voucher"))
  );
}
