import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { voucherSchema, VoucherFormData } from "./types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RefreshCw, Save } from "lucide-react";

function generateVoucherCode() {
  let code = "";
  for (let i = 0; i < 16; i += 1) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return formatVoucherCode(code);
}

function formatVoucherCode(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1-");
}

export default function VoucherForm({
  initialData,
  onSubmit,
}: {
  initialData?: VoucherFormData;
  onSubmit: (data: any) => void;
}) {
  const form = useForm<VoucherFormData>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      code: "",
      type: "",
      value: "",
      minPurchaseAmount: "",
      maxUses: "",
      validFrom: "",
      validUntil: "",
      description: "",
      status: "active",
    },
  });

  // 🔥 FIX: Normalize edit data
  useEffect(() => {
    if (initialData) {
      form.reset(
        {
          ...initialData,
          maxUses:
            initialData.maxUses === null
              ? ""
              : String(initialData.maxUses),
          validFrom: initialData.validFrom?.slice(0, 10),
          validUntil: initialData.validUntil?.slice(0, 10),
        },
        {
          keepErrors: false,
          keepDirty: false,
        }
      );
    }
  }, [initialData]);

 const handleSave = (data: VoucherFormData) => {
  const payload = {
    ...data,
    minPurchaseAmount: data.minPurchaseAmount || "0",
    maxUses: data.maxUses === "" ? null : Number(data.maxUses),

    // ✅ SEND DATE OBJECTS (NOT STRING)
    validFrom: new Date(data.validFrom),
    validUntil: new Date(data.validUntil),

    description: data.description || null,
  };

  onSubmit(payload);
};


  return (
    <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
      <div>
        <Label>Voucher Code</Label>
        <div className="flex gap-2">
          <Input
            {...form.register("code")}
            disabled={Boolean(initialData?.id)}
            placeholder="0000-0000-0000-0000"
            inputMode="numeric"
            maxLength={19}
            onChange={(event) =>
              form.setValue("code", formatVoucherCode(event.target.value), {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          {!initialData?.id && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() =>
                form.setValue("code", generateVoucherCode(), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              title="Generate code"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div>
        <Label>Type</Label>
        <Select
          value={form.watch("type")}
          onValueChange={(value) => form.setValue("type", value as any, { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select voucher type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage">Percentage Discount</SelectItem>
            <SelectItem value="fixed">Fixed Discount</SelectItem>
            <SelectItem value="wallet_credit">Wallet Credit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Value</Label>
        <Input {...form.register("value")} />
      </div>

      <div>
        <Label>Min Purchase Amount</Label>
        <Input {...form.register("minPurchaseAmount")} />
      </div>

      <div>
        <Label>Max Uses</Label>
        <Input {...form.register("maxUses")} type="number" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Valid From</Label>
          <Input {...form.register("validFrom")} type="date" />
        </div>
        <div>
          <Label>Valid Until</Label>
          <Input {...form.register("validUntil")} type="date" />
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Input {...form.register("description")} />
      </div>

      <div>
        <Label>Status</Label>
        <Select
          value={form.watch("status")}
          onValueChange={(v) =>
            form.setValue("status", v as any, { shouldValidate: true })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full">
        <Save className="h-4 w-4 mr-2" />
        Save Voucher
      </Button>
    </form>
  );
}
