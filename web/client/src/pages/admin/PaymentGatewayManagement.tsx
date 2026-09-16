import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/contexts/TranslationContext";

interface PaymentGateway {
  id: string;
  provider:
    | "stripe"
    | "razorpay"
    | "paypal"
    | "paystack"
    | "powertranz"
    | "nowpayments"
    | "cryptomus"
    | "ayamerchant";
  displayName: string;
  publicKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  isEnabled: boolean;
  createdAt: string;
  config: {
    mode?: "test" | "live" | string;
    [key: string]: any;
  };
  supportedCurrencies?: {
    currencyId: string;
  }[];
}

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isEnabled: boolean;
}

interface GatewayForm {
  provider: string;
  displayName: string;
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  isEnabled: boolean;
  config: Record<string, any>;
  supportedCurrencies: string[];
}

const PROVIDERS = [
  { value: "stripe", label: "Stripe" },
  { value: "razorpay", label: "Razorpay" },
  { value: "paypal", label: "PayPal" },
  { value: "paystack", label: "Paystack" },
  { value: "powertranz", label: "Powertranz" },
  { value: "nowpayments", label: "Crypto USDT (NOWPayments)" },
  { value: "cryptomus", label: "Crypto USDT (Cryptomus)" },
  { value: "ayamerchant", label: "AYAMERCHANT" },
];

const USDT_NETWORKS = [
  { value: "usdttrc20", label: "USDT TRC20" },
  { value: "usdterc20", label: "USDT ERC20" },
  { value: "usdtbsc", label: "USDT BEP20" },
  { value: "usdtmatic", label: "USDT Polygon" },
  { value: "usdtton", label: "USDT TON" },
];

const CRYPTOMUS_NETWORKS = [
  { value: "tron", label: "USDT TRC20" },
  { value: "eth", label: "USDT ERC20" },
  { value: "bsc", label: "USDT BEP20" },
  { value: "polygon", label: "USDT Polygon" },
  { value: "ton", label: "USDT TON" },
];

const lightPanelClass =
  "overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm";
const statCardClass =
  "rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm";
const darkFieldClass =
  "border-[#24445f] bg-[#071b35] text-white placeholder:text-slate-400 focus-visible:ring-teal-500 disabled:bg-slate-100 disabled:text-slate-500";
const darkSelectClass = `${darkFieldClass} [&>span]:text-white data-[placeholder]:text-slate-400`;
const selectContentClass = "border-slate-200 bg-white text-slate-900";
const selectItemClass = "focus:bg-teal-50 focus:text-slate-950";
const primaryButtonClass =
  "border-[#58cbbb] bg-[#58cbbb] text-slate-950 hover:bg-[#48bdae]";
const lightButtonClass =
  "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950";
const iconButtonClass = "text-slate-600 hover:bg-slate-100 hover:text-slate-950";
const labelClass = "text-sm font-medium text-slate-700";
const helperTextClass = "text-xs text-slate-500";

function defaultConfigForProvider(provider: string) {
  if (provider === "nowpayments") {
    return {
      mode: "live",
      payCurrency: "usdttrc20",
      creditOn: "finished",
      ipnCallbackUrl: "",
    };
  }

  if (provider === "cryptomus") {
    return {
      mode: "live",
      toCurrency: "USDT",
      network: "tron",
      callbackUrl: "",
    };
  }

  return { mode: "test" };
}

function createEmptyForm(): GatewayForm {
  return {
    provider: "",
    displayName: "",
    publicKey: "",
    secretKey: "",
    webhookSecret: "",
    isEnabled: true,
    config: defaultConfigForProvider(""),
    supportedCurrencies: [],
  };
}

function formFromGateway(gateway: PaymentGateway): GatewayForm {
  return {
    provider: gateway.provider,
    displayName: gateway.displayName,
    publicKey: gateway.publicKey || "",
    secretKey: gateway.secretKey || "",
    webhookSecret: gateway.webhookSecret || "",
    isEnabled: gateway.isEnabled,
    config: { ...defaultConfigForProvider(gateway.provider), ...(gateway.config || {}) },
    supportedCurrencies:
      gateway.supportedCurrencies?.map((currency: any) =>
        typeof currency === "string" ? currency : currency.currencyId,
      ) || [],
  };
}

function isGatewayComplete(gateway: PaymentGateway) {
  const publicKey = String(gateway.publicKey || "").trim();
  const secretKey = String(gateway.secretKey || "").trim();

  if (gateway.provider === "stripe" || gateway.provider === "paypal") {
    return Boolean(publicKey && secretKey);
  }

  if (gateway.provider === "nowpayments") {
    return Boolean(secretKey);
  }

  if (gateway.provider === "ayamerchant") {
    return Boolean(secretKey);
  }

  if (gateway.provider === "cryptomus") {
    return Boolean(publicKey && secretKey);
  }

  return true;
}

function providerDisplayName(provider: string) {
  if (provider === "nowpayments") return "NOWPayments";
  if (provider === "cryptomus") return "Cryptomus";
  if (provider === "ayamerchant") return "AYAMERCHANT";
  return PROVIDERS.find((item) => item.value === provider)?.label || provider;
}

function modeBadgeClass(mode?: string) {
  return mode === "live"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-amber-50 text-amber-700";
}

function statusBadgeClass(gateway: PaymentGateway) {
  if (gateway.isEnabled && isGatewayComplete(gateway)) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (gateway.isEnabled) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default function PaymentGatewayManagement() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();

  const currentPath = location.split("?")[0];
  const isCreatePage = currentPath === "/admin/payment-gateway/create";
  const editGatewayId =
    currentPath.startsWith("/admin/payment-gateway/") && currentPath.endsWith("/edit")
      ? currentPath.split("/").slice(-2)[0]
      : "";
  const isFormPage = isCreatePage || Boolean(editGatewayId);

  const [editing, setEditing] = useState<PaymentGateway | null>(null);
  const [form, setForm] = useState<GatewayForm>(() => createEmptyForm());

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/payment-gateways"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/payment-gateways");
      return res.json();
    },
  });

  const gateways: PaymentGateway[] = data?.data || [];
  const routeGateway = editGatewayId
    ? gateways.find((gateway) => gateway.id === editGatewayId) || null
    : null;
  const activeEditing = routeGateway || editing;

  const { data: currencyRes, isLoading: currencyLoading } = useQuery({
    queryKey: ["/api/admin/currencies"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/currencies");
      return res.json();
    },
    enabled: isFormPage,
  });

  const currencyPayload = Array.isArray(currencyRes) ? currencyRes : currencyRes?.data || [];
  const currencies: Currency[] = currencyPayload.filter((currency: Currency) => currency.isEnabled);

  const resetForm = () => {
    setEditing(null);
    setForm(createEmptyForm());
    setLocation("/admin/payment-gateway");
  };

  const openEdit = (gateway: PaymentGateway) => {
    setEditing(gateway);
    setForm(formFromGateway(gateway));
    setLocation(`/admin/payment-gateway/${gateway.id}/edit`);
  };

  useEffect(() => {
    if (isCreatePage) {
      setEditing(null);
      setForm(createEmptyForm());
      return;
    }

    if (routeGateway) {
      setEditing(routeGateway);
      setForm(formFromGateway(routeGateway));
    }
  }, [isCreatePage, routeGateway?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const method = activeEditing ? "PUT" : "POST";
      const url = activeEditing
        ? `/api/admin/payment-gateways/${activeEditing.id}`
        : "/api/admin/payment-gateways";

      const payload = {
        ...form,
        supportedCurrencies: form.supportedCurrencies.map((id) => ({
          currencyId: id,
        })),
      };

      return apiRequest(method, url, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/payment-gateways"],
      });
      toast({ title: "Success", description: "Payment gateway saved" });
      resetForm();
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to save gateway",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("DELETE", `/api/admin/payment-gateways/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateways"] });
      toast({ title: "Deleted", description: "Gateway removed" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      apiRequest("PATCH", `/api/admin/payment-gateways/${id}/status`, {
        isEnabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateways"] });
    },
  });

  const toggleModeMutation = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: Record<string, any> }) =>
      apiRequest("PUT", `/api/admin/payment-gateways/${id}`, {
        config,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateways"] });
      toast({ title: "Success", description: "Gateway mode updated" });
    },
  });

  const handleSave = () => {
    if (!form.provider) {
      toast({
        title: "Validation Error",
        description: "Please select a provider",
        variant: "destructive",
      });
      return;
    }

    if (!form.displayName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a display name",
        variant: "destructive",
      });
      return;
    }

    if (form.provider === "nowpayments" && !form.secretKey.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter the NOWPayments API key",
        variant: "destructive",
      });
      return;
    }

    if (form.provider === "ayamerchant" && !form.secretKey.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter the AYAMERCHANT API key",
        variant: "destructive",
      });
      return;
    }

    if (form.provider === "cryptomus" && !form.publicKey.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter the Cryptomus merchant UUID",
        variant: "destructive",
      });
      return;
    }

    if (form.provider === "cryptomus" && !form.secretKey.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter the Cryptomus payment API key",
        variant: "destructive",
      });
      return;
    }

    if (form.supportedCurrencies.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one supported currency",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate();
  };

  const renderForm = () => (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2">
          <Label className={labelClass}>
            {t("adminPanel.admin.paymentGateways.provider", "Provider")}
          </Label>
          <Select
            value={form.provider}
            onValueChange={(value) =>
              setForm({ ...form, provider: value, config: defaultConfigForProvider(value) })
            }
            disabled={Boolean(activeEditing)}
          >
            <SelectTrigger className={darkSelectClass}>
              <SelectValue
                placeholder={t(
                  "adminPanel.admin.paymentGateways.selectProvider",
                  "Select provider",
                )}
              />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              {PROVIDERS.map((provider) => (
                <SelectItem className={selectItemClass} key={provider.value} value={provider.value}>
                  {provider.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>
            {t("adminPanel.admin.paymentGateways.displayName", "Display Name")}
          </Label>
          <Input
            className={darkFieldClass}
            value={form.displayName}
            onChange={(event) => setForm({ ...form, displayName: event.target.value })}
            placeholder={t(
              "adminPanel.admin.paymentGateways.displayNamePlaceholder",
              "Card / UPI / Wallet",
            )}
          />
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>
            {form.provider === "nowpayments"
              ? "Public Key (optional)"
              : form.provider === "cryptomus"
                ? "Cryptomus Merchant UUID"
                : form.provider === "ayamerchant"
                  ? "Public Key (not required)"
                  : t("adminPanel.admin.paymentGateways.publicKey", "Public Key")}
          </Label>
          <Input
            className={darkFieldClass}
            value={form.publicKey}
            onChange={(event) => setForm({ ...form, publicKey: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>
            {form.provider === "nowpayments"
              ? "NOWPayments API Key"
              : form.provider === "cryptomus"
                ? "Cryptomus Payment API Key"
                : form.provider === "ayamerchant"
                  ? "AYAMERCHANT API Key"
                  : t("adminPanel.admin.paymentGateways.secretKey", "Secret Key")}
          </Label>
          <Input
            className={darkFieldClass}
            type="password"
            value={form.secretKey}
            onChange={(event) => setForm({ ...form, secretKey: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>
            {form.provider === "nowpayments"
              ? "NOWPayments IPN Secret"
              : form.provider === "cryptomus"
                ? "Cryptomus Webhook Secret / Payment Key"
                : form.provider === "ayamerchant"
                  ? "Webhook Secret (optional)"
                  : t("adminPanel.admin.paymentGateways.webhookSecret", "Webhook Secret")}
          </Label>
          <Input
            className={darkFieldClass}
            type="password"
            value={form.webhookSecret}
            onChange={(event) => setForm({ ...form, webhookSecret: event.target.value })}
            placeholder="Optional"
          />
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>
            {t("adminPanel.admin.paymentGateways.mode", "Gateway Mode")}
          </Label>
          <Select
            value={form.config?.mode || "test"}
            onValueChange={(value) =>
              setForm({
                ...form,
                config: { ...form.config, mode: value },
              })
            }
          >
            <SelectTrigger className={darkSelectClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              <SelectItem className={selectItemClass} value="test">
                Test (Sandbox)
              </SelectItem>
              <SelectItem className={selectItemClass} value="live">
                Live (Production)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className={helperTextClass}>Set to Live when you are ready to accept real payments.</p>
        </div>

        {form.provider === "nowpayments" && (
          <>
            <div className="space-y-2">
              <Label className={labelClass}>USDT Network</Label>
              <Select
                value={form.config?.payCurrency || "usdttrc20"}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    config: { ...form.config, payCurrency: value },
                  })
                }
              >
                <SelectTrigger className={darkSelectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  {USDT_NETWORKS.map((network) => (
                    <SelectItem className={selectItemClass} key={network.value} value={network.value}>
                      {network.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>Credit Wallet After</Label>
              <Select
                value={form.config?.creditOn || "finished"}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    config: { ...form.config, creditOn: value },
                  })
                }
              >
                <SelectTrigger className={darkSelectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem className={selectItemClass} value="finished">
                    Payment Finished
                  </SelectItem>
                  <SelectItem className={selectItemClass} value="confirmed">
                    Blockchain Confirmed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label className={labelClass}>IPN Callback URL</Label>
              <Input
                className={darkFieldClass}
                value={form.config?.ipnCallbackUrl || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    config: { ...form.config, ipnCallbackUrl: event.target.value },
                  })
                }
                placeholder={`${window.location.origin}/api/wallet/crypto/nowpayments/ipn`}
              />
            </div>
          </>
        )}

        {form.provider === "cryptomus" && (
          <>
            <div className="space-y-2">
              <Label className={labelClass}>USDT Network</Label>
              <Select
                value={form.config?.network || "tron"}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    config: { ...form.config, network: value, toCurrency: "USDT" },
                  })
                }
              >
                <SelectTrigger className={darkSelectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  {CRYPTOMUS_NETWORKS.map((network) => (
                    <SelectItem className={selectItemClass} key={network.value} value={network.value}>
                      {network.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>Callback URL</Label>
              <Input
                className={darkFieldClass}
                value={form.config?.callbackUrl || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    config: { ...form.config, callbackUrl: event.target.value },
                  })
                }
                placeholder={`${window.location.origin}/api/wallet/crypto/cryptomus/webhook`}
              />
            </div>
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label className={labelClass}>
          {t("adminPanel.admin.paymentGateways.supportedCurrencies", "Supported Currencies")}
        </Label>
        {currencyLoading ? (
          <p className="mt-2 text-sm text-slate-500">
            {t("adminPanel.admin.paymentGateways.loadingCurrencies", "Loading currencies...")}
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {currencies.map((currency) => {
              const checked = form.supportedCurrencies.includes(currency.id);

              return (
                <Button
                  className={checked ? primaryButtonClass : lightButtonClass}
                  key={currency.id}
                  type="button"
                  size="sm"
                  variant={checked ? "default" : "outline"}
                  onClick={() => {
                    setForm((previous) => ({
                      ...previous,
                      supportedCurrencies: checked
                        ? previous.supportedCurrencies.filter((id) => id !== currency.id)
                        : [...previous.supportedCurrencies, currency.id],
                    }));
                  }}
                >
                  {currency.symbol} {currency.code}
                </Button>
              );
            })}
          </div>
        )}
        {form.supportedCurrencies.length === 0 && (
          <p className={helperTextClass}>
            {t("adminPanel.admin.paymentGateways.selectCurrency", "Select at least one currency")}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
        <Switch
          checked={form.isEnabled}
          onCheckedChange={(value) => setForm({ ...form, isEnabled: value })}
        />
        <span className="text-sm font-medium text-slate-800">
          {form.isEnabled
            ? t("adminPanel.admin.paymentGateways.enabled", "Enabled")
            : t("adminPanel.admin.paymentGateways.disabled", "Disabled")}
        </span>
      </div>
    </div>
  );

  if (isFormPage) {
    const formTitle = activeEditing
      ? t("adminPanel.admin.paymentGateways.editGateway", "Edit Gateway")
      : t("adminPanel.admin.paymentGateways.addGateway", "Add Gateway");

    if (editGatewayId && isLoading) {
      return (
        <div className="flex min-h-[420px] items-center justify-center p-6">
          <Loader2 className="h-7 w-7 animate-spin text-[#58cbbb]" />
        </div>
      );
    }

    if (editGatewayId && !activeEditing) {
      return (
        <div className="space-y-6 p-6">
          <Button className={lightButtonClass} variant="outline" onClick={resetForm}>
            <ArrowLeft className="h-4 w-4" />
            Back to Gateways
          </Button>
          <Card className={lightPanelClass}>
            <CardContent className="p-10 text-center">
              <CardTitle className="text-slate-950">Gateway Not Found</CardTitle>
              <CardDescription className="mt-2 text-slate-500">
                The selected payment gateway does not exist.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-[#58cbbb]" />
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {formTitle}
              </h1>
            </div>
            <p className="text-sm text-slate-300">
              Configure provider credentials, currencies, mode, and visibility.
            </p>
          </div>
          <Button className={lightButtonClass} variant="outline" onClick={resetForm}>
            <ArrowLeft className="h-4 w-4" />
            Back to Gateways
          </Button>
        </div>

        <Card className={`${lightPanelClass} mx-auto max-w-6xl`}>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-slate-950">{formTitle}</CardTitle>
            <CardDescription className="text-slate-500">
              Add a user-visible payment option and select the currencies it can accept.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {renderForm()}
            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <Button className={lightButtonClass} variant="outline" onClick={resetForm}>
                {t("adminPanel.admin.paymentGateways.cancel", "Cancel")}
              </Button>
              <Button
                className={primaryButtonClass}
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("adminPanel.admin.paymentGateways.save", "Save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const enabledCount = gateways.filter((gateway) => gateway.isEnabled).length;
  const readyCount = gateways.filter(
    (gateway) => gateway.isEnabled && isGatewayComplete(gateway),
  ).length;
  const liveCount = gateways.filter((gateway) => gateway.config?.mode === "live").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-[#58cbbb] sm:h-7 sm:w-7" />
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {t("adminPanel.admin.paymentGateways.title", "Payment Gateways")}
            </h1>
          </div>
          <p className="text-sm text-slate-300 sm:text-base">
            {t(
              "adminPanel.admin.paymentGateways.description",
              "Configure payment providers and options",
            )}
          </p>
        </div>

        <Button
          onClick={() => setLocation("/admin/payment-gateway/create")}
          className={`${primaryButtonClass} h-10 w-full gap-2 sm:w-auto`}
        >
          <Plus className="h-4 w-4" />
          {t("adminPanel.admin.paymentGateways.addGateway", "Add Gateway")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={statCardClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-teal-700">Total Gateways</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{gateways.length}</p>
            </div>
            <CreditCard className="h-4 w-4 text-slate-500" />
          </div>
        </div>
        <div className={statCardClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-teal-700">Enabled</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{enabledCount}</p>
            </div>
            <CreditCard className="h-4 w-4 text-teal-600" />
          </div>
        </div>
        <div className={statCardClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-teal-700">Ready</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{readyCount}</p>
            </div>
            <CreditCard className="h-4 w-4 text-teal-600" />
          </div>
        </div>
        <div className={statCardClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-teal-700">Live</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{liveCount}</p>
            </div>
            <CreditCard className="h-4 w-4 text-teal-600" />
          </div>
        </div>
      </div>

      <Card className={lightPanelClass}>
        <CardHeader>
          <CardTitle className="text-slate-950">
            {t("adminPanel.admin.paymentGateways.configuredGateways", "Configured Gateways")}
          </CardTitle>
          <CardDescription className="text-slate-500">
            {t(
              "adminPanel.admin.paymentGateways.configuredGatewaysDesc",
              "Each row represents one user-visible payment option",
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#58cbbb]" />
            </div>
          ) : gateways.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              {t("adminPanel.admin.paymentGateways.noGateways", "No payment gateways added")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-slate-700">
                      {t("adminPanel.admin.paymentGateways.provider", "Provider")}
                    </TableHead>
                    <TableHead className="text-slate-700">
                      {t("adminPanel.admin.paymentGateways.displayName", "Display Name")}
                    </TableHead>
                    <TableHead className="text-slate-700">
                      {t("adminPanel.admin.paymentGateways.mode", "Mode")}
                    </TableHead>
                    <TableHead className="text-slate-700">
                      {t("adminPanel.admin.paymentGateways.status", "Status")}
                    </TableHead>
                    <TableHead className="text-right text-slate-700">
                      {t("adminPanel.admin.paymentGateways.actions", "Actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gateways.map((gateway) => {
                    const mode = gateway.config?.mode === "live" ? "Live" : "Test";
                    const status =
                      gateway.isEnabled && isGatewayComplete(gateway)
                        ? "Ready"
                        : gateway.isEnabled
                          ? "Incomplete"
                          : "Disabled";

                    return (
                      <TableRow
                        className="border-slate-200 text-slate-900 hover:bg-slate-50"
                        key={gateway.id}
                      >
                        <TableCell className="font-medium text-slate-950">
                          {providerDisplayName(gateway.provider)}
                        </TableCell>
                        <TableCell className="text-slate-900">{gateway.displayName}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            className="h-auto p-0 hover:bg-transparent"
                            onClick={() => {
                              const currentMode = gateway.config?.mode || "test";
                              const newMode = currentMode === "live" ? "test" : "live";
                              toggleModeMutation.mutate({
                                id: gateway.id,
                                config: { ...(gateway.config || {}), mode: newMode },
                              });
                            }}
                          >
                            <span
                              className={`rounded-md px-2.5 py-1 text-xs font-medium ${modeBadgeClass(
                                gateway.config?.mode,
                              )}`}
                            >
                              {mode}
                            </span>
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={gateway.isEnabled}
                              onCheckedChange={(checked) =>
                                toggleMutation.mutate({
                                  id: gateway.id,
                                  isEnabled: checked,
                                })
                              }
                            />
                            <span
                              className={`rounded-md px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                                gateway,
                              )}`}
                            >
                              {status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="space-x-2 text-right">
                          <Button
                            className={iconButtonClass}
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(gateway)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            className="text-slate-600 hover:bg-red-50 hover:text-red-600"
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(gateway.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
