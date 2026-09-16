import * as z from "zod";

function formatVoucherCode(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 16);
  return digits ? digits.replace(/(\d{4})(?=\d)/g, "$1-") : undefined;
}

export const voucherSchema = z.object({
  id: z.string().optional(),
  code: z.preprocess(
    formatVoucherCode,
    z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{4}$/, "Voucher code must be exactly 16 digits formatted as 0000-0000-0000-0000").optional(),
  ),
  type: z.string().min(1),
  value: z.string().min(1),
  minPurchaseAmount: z.string().optional(),
  maxUses: z.union([z.string(), z.number(), z.null()]).optional(),
  validFrom: z
    .string()
    .min(1, "Valid From date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
  validUntil: z
    .string()
    .min(1, "Valid Until date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
  description: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]),
});

export type VoucherFormData = z.infer<typeof voucherSchema>;


export interface Voucher {
  id: string;
  code: string;
  type: string;
  value: string;
  minPurchaseAmount: string;
  maxUses: number | null;
  currentUses: number;
  validFrom: string;
  validUntil: string;
  description: string | null;
  createdByUser?: string | null;
  qrCode?: string | null;
  qrPayload?: string | null;
  status: "active" | "inactive";
}
