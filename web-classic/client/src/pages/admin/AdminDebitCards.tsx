import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, Gift, KeyRound, RefreshCw, Save, Server, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type PagoCardsConfig = {
  enabled: boolean;
  mode: "test" | "live";
  apiBaseUrl: string;
  publicKey: string;
  secretKey: string;
  endpoints: Record<string, string>;
  hasPublicKey?: boolean;
  hasSecretKey?: boolean;
};

type ActionPayload = {
  label: string;
  endpoint: string;
  payload: Record<string, any>;
};

const REQUIRED_FIELDS: Record<string, string[]> = {
  "mastercard.create": ["firstname", "lastname", "email"],
  "mastercard.createAddon": ["firstname", "lastname", "email", "cardid"],
  "mastercard.listByUser": ["email"],
  "mastercard.details": ["cardid", "email"],
  "mastercard.check3ds": ["cardid", "email"],
  "mastercard.approve3ds": ["cardid", "email", "eventId"],
  "mastercard.walletOtp": ["cardid", "email"],
  "mastercard.block": ["cardid", "email"],
  "mastercard.fund": ["cardid", "email", "amount"],
  "mastercard.unblock": ["cardid", "email"],
  "mastercard.spendControl": ["cardid", "email", "amount"],
  "mastercard.deleteSpendControl": ["cardid", "email"],
  "visa.create": ["first_name", "last_name", "email"],
  "visa.fund": ["cardid", "email", "amount"],
  "visa.listByUser": ["email"],
  "visa.details": ["cardid", "email"],
  "visa.block": ["cardid", "email"],
  "visa.unblock": ["cardid", "email"],
  "giftcards.catalogBySku": ["sku"],
  "giftcards.availability": ["sku", "item_count", "price"],
  "giftcards.purchase": ["sku", "quantity", "amount"],
  "giftcards.order": ["referenceCode"],
};

const ENDPOINT_SAMPLES: Record<string, Record<string, any>> = {
  "mastercard.create": { firstname: "Pago", lastname: "Cards", email: "pago@pagocards.com", initialload: 10 },
  "mastercard.createAddon": { firstname: "Pago", lastname: "Cards", email: "pago@pagocards.com", cardid: "primary-card-id" },
  "mastercard.listByUser": { email: "pago@pagocards.com" },
  "mastercard.details": { cardid: "crd-example", email: "pago@pagocards.com" },
  "mastercard.check3ds": { cardid: "crd-example", email: "pago@pagocards.com" },
  "mastercard.approve3ds": { cardid: "crd-example", email: "pago@pagocards.com", eventId: "" },
  "mastercard.walletOtp": { cardid: "crd-example", email: "pago@pagocards.com" },
  "mastercard.block": { cardid: "crd-example", email: "pago@pagocards.com" },
  "mastercard.fund": { cardid: "crd-example", email: "pago@pagocards.com", amount: 25 },
  "mastercard.unblock": { cardid: "crd-example", email: "pago@pagocards.com" },
  "mastercard.spendControl": { cardid: "crd-example", email: "pago@pagocards.com", amount: 25 },
  "mastercard.deleteSpendControl": { cardid: "crd-example", email: "pago@pagocards.com" },
  "visa.create": { first_name: "Mint", last_name: "Narongsak", email: "mn@pagocards.com" },
  "visa.fund": { cardid: "visa-card-id", email: "mn@pagocards.com", amount: 25 },
  "visa.listByUser": { email: "mn@pagocards.com" },
  "visa.details": { cardid: "visa-card-id", email: "mn@pagocards.com" },
  "visa.block": { cardid: "visa-card-id", email: "mn@pagocards.com" },
  "visa.unblock": { cardid: "visa-card-id", email: "mn@pagocards.com" },
  "giftcards.catalog": {},
  "giftcards.catalogBySku": { sku: 4402 },
  "giftcards.availability": { sku: 4402, item_count: 1, price: "10.00" },
  "giftcards.exchangeRates": {},
  "giftcards.purchase": { sku: "1000", quantity: 1, amount: 25 },
  "giftcards.categories": {},
  "giftcards.countries": {},
  "giftcards.order": { referenceCode: "150019c0-6459-452e-b9d3-8f0272649867" },
  "giftcards.orderHistory": { limit: 20, page: 1 },
};

const API_SECTIONS = [
  {
    title: "MasterCards",
    endpoints: [
      "mastercard.create",
      "mastercard.createAddon",
      "mastercard.listByUser",
      "mastercard.details",
      "mastercard.check3ds",
      "mastercard.approve3ds",
      "mastercard.walletOtp",
      "mastercard.block",
      "mastercard.fund",
      "mastercard.unblock",
      "mastercard.spendControl",
      "mastercard.deleteSpendControl",
    ],
  },
  {
    title: "VisaCard",
    endpoints: ["visa.create", "visa.fund", "visa.listByUser", "visa.details", "visa.block", "visa.unblock"],
  },
  {
    title: "Giftcards",
    endpoints: [
      "giftcards.catalog",
      "giftcards.catalogBySku",
      "giftcards.availability",
      "giftcards.exchangeRates",
      "giftcards.purchase",
      "giftcards.categories",
      "giftcards.countries",
      "giftcards.order",
      "giftcards.orderHistory",
    ],
  },
];

function beautifyEndpoint(endpoint: string) {
  return endpoint
    .replace("mastercard.", "Mastercard ")
    .replace("visa.", "Visa ")
    .replace("giftcards.", "Gift Cards ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function sampleFor(endpoint: string) {
  return JSON.stringify(ENDPOINT_SAMPLES[endpoint] || {}, null, 2);
}

function cleanPayload(payload: Record<string, any>) {
  const numericFields = new Set(["amount", "initialload", "quantity", "item_count", "price", "limit", "page"]);
  return Object.fromEntries(
    Object.entries(payload)
      .map(([key, value]) => {
        const nextValue = typeof value === "string" ? value.trim() : value;
        return [key, numericFields.has(key) && nextValue !== "" ? Number(nextValue) : nextValue];
      })
      .filter(([, value]) => value !== "" && value !== undefined && value !== null),
  );
}

function parseEmailList(text: string) {
  return Array.from(
    new Set(
      text
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function missingFields(endpoint: string, payload: Record<string, any>) {
  const cleaned = cleanPayload(payload);
  return (REQUIRED_FIELDS[endpoint] || []).filter((field) => cleaned[field] === undefined || cleaned[field] === "");
}

function pickPayload(source: Record<string, any>, fields: string[]) {
  return Object.fromEntries(fields.map((field) => [field, source[field]]));
}

function friendlyFieldName(field: string) {
  return field
    .replace("first_name", "first name")
    .replace("last_name", "last name")
    .replace("cardid", "card ID")
    .replace("eventId", "3DS event ID")
    .replace("referenceCode", "reference code")
    .replace("item_count", "quantity");
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function extractCards(result: any) {
  return result?.data?.cards || result?.cards || result?.data?.data?.cards || result?.data?.data?.data?.cards || [];
}

function extractDetails(result: any) {
  return (
    result?.data?.data?.details ||
    result?.data?.data?.data?.details ||
    result?.data?.data?.data ||
    result?.data?.data ||
    result?.data?.secure?.data?.details ||
    result?.secure?.data?.details ||
    null
  );
}

function isCardListResult(result: any, cards: any) {
  const action = String(result?.action || "").toLowerCase();
  return (
    Array.isArray(cards) &&
    (cards.length > 0 ||
      action.includes("list") ||
      action.includes("sync") ||
      action.includes("provider cards") ||
      result?.data?.checkedEmails !== undefined)
  );
}

function ResultBox({
  result,
  onCardAction,
}: {
  result: any;
  onCardAction?: (action: "details" | "check3ds" | "approve3ds" | "walletOtp" | "spendControl" | "deleteSpendControl" | "block" | "unblock", card: any) => void;
}) {
  if (!result) return null;
  const cards = extractCards(result);
  if (isCardListResult(result, cards)) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{result.action || "Cards List"}</h3>
          <Badge variant="outline">{cards.length} card{cards.length === 1 ? "" : "s"}</Badge>
        </div>
        {result?.data?.checkedEmails !== undefined && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Checked {result.data.checkedEmails} customer email{result.data.checkedEmails === 1 ? "" : "s"} from PagoCards.
          </p>
        )}
        {result?.data?.note && <p className="text-sm text-amber-600 dark:text-amber-300">{result.data.note}</p>}
        {cards.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            No cards found for this customer email in PagoCards.
          </div>
        ) : (
          <div className="overflow-auto rounded-lg border">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Brand</th>
                  <th className="px-3 py-2">Card ID</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Last 4</th>
                  <th className="px-3 py-2">Balance</th>
                  {onCardAction && <th className="px-3 py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {cards.map((card: any, index: number) => (
                  <tr key={`${card.cardid || index}`} className="border-t">
                    <td className="px-3 py-2 capitalize">{card.brand || "-"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{card.cardid || card.card_id || "-"}</td>
                    <td className="px-3 py-2">{card.email || card.useremail || "-"}</td>
                    <td className="px-3 py-2">{card.name || card.nameoncard || "-"}</td>
                    <td className="px-3 py-2">{card.status || "-"}</td>
                    <td className="px-3 py-2">{card.lastfour || card.last_four_digit || "-"}</td>
                    <td className="px-3 py-2">{card.balance ?? "-"}</td>
                    {onCardAction && (
                      <td className="px-3 py-2">
                        <div className="flex min-w-[420px] flex-wrap gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => onCardAction("details", card)}>Details</Button>
                          <Button size="sm" variant="outline" onClick={() => onCardAction("check3ds", card)}>Check 3DS</Button>
                          <Button size="sm" variant="outline" onClick={() => onCardAction("approve3ds", card)}>Approve 3DS</Button>
                          <Button size="sm" variant="outline" onClick={() => onCardAction("walletOtp", card)}>Wallet OTP</Button>
                          <Button size="sm" variant="outline" onClick={() => onCardAction("spendControl", card)}>Spend Control</Button>
                          <Button size="sm" variant="outline" onClick={() => onCardAction("deleteSpendControl", card)}>Delete Spend</Button>
                          <Button size="sm" variant="destructive" onClick={() => onCardAction("block", card)}>Block</Button>
                          <Button size="sm" variant="outline" onClick={() => onCardAction("unblock", card)}>Unblock</Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <details>
          <summary className="cursor-pointer text-sm text-slate-500">Raw API response</summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  const details = extractDetails(result);
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const fields = [
      ["Card ID", details.cardid || details.card_id],
      ["Card Number", details.card_number || details.masked_pan],
      ["Name", details.nameoncard || details.name],
      ["Email", details.useremail || details.email],
      ["Brand", details.brand],
      ["Status", details.status || details.physicalstatus],
      ["Type", details.type],
      ["Expiry", [details.expiry_month || details.expirymonth, details.expiry_year || details.expiryyear].filter(Boolean).join("/")],
      ["CVV", details.cvv],
      ["Balance", details.balance ?? details.balance_amount],
      ["Country", details.country],
      ["Wallet ID", details.walletid || details.wallet_id],
    ].filter(([, value]) => value !== undefined && value !== null && value !== "");

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{result.action || "Card Details"}</h3>
        {(result?.data?.providerDetailsUnavailable || result?.data?.data?.providerDetailsUnavailable) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            PagoCards Details endpoint is unavailable for this card. Showing the matching List Cards record when available.
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-lg border bg-slate-50 p-3 dark:bg-slate-900/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-950 dark:text-white">{String(value)}</p>
            </div>
          ))}
        </div>
        <details>
          <summary className="cursor-pointer text-sm text-slate-500">Raw API response</summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  if (result?.data?.providerDetailsUnavailable) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{result.action || "Card Details"}</h3>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-semibold">Provider details are not available for this card.</p>
          <p className="mt-1">
            {result.data.message ||
              "PagoCards did not return a details record for this card. Try Sync Provider Cards with the card customer email first."}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-slate-50 p-3 dark:bg-slate-900/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Fallback Cards Found</p>
            <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{result.data.cards?.length || 0}</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-3 dark:bg-slate-900/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Provider Error</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-white">
              {result.data.originalError || "Details endpoint unavailable"}
            </p>
          </div>
        </div>
        <details>
          <summary className="cursor-pointer text-sm text-slate-500">Raw API response</summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
        <p className="font-semibold">{result.action || "PagoCards action"} failed</p>
        <p className="mt-1">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{result.action || "PagoCards Response"}</h3>
      <pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

function resultBelongsTo(result: any, group: "mastercard" | "visa" | "giftcards" | "console") {
  const action = String(result?.action || "").toLowerCase();
  if (!action) return false;
  if (group === "mastercard") return action.includes("mastercard");
  if (group === "visa") return action.includes("visa");
  if (group === "giftcards") return action.includes("gift card");
  if (group === "console") return Boolean(result?.fromConsole);
  return false;
}

export default function AdminDebitCards() {
  const { toast } = useToast();
  const [draft, setDraft] = useState<PagoCardsConfig | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState("mastercard.create");
  const [payloadText, setPayloadText] = useState(sampleFor("mastercard.create"));
  const [actionResult, setActionResult] = useState<any>(null);

  const [masterCreate, setMasterCreate] = useState({ firstname: "", lastname: "", email: "", initialload: "" });
  const [masterAddon, setMasterAddon] = useState({ firstname: "", lastname: "", email: "", cardid: "" });
  const [masterManage, setMasterManage] = useState({ email: "", cardid: "", amount: "", eventId: "" });
  const [masterPortalEmails, setMasterPortalEmails] = useState("");
  const [visaCreate, setVisaCreate] = useState({ first_name: "", last_name: "", email: "" });
  const [visaManage, setVisaManage] = useState({ email: "", cardid: "", amount: "" });
  const [giftLookup, setGiftLookup] = useState({ sku: "", item_count: "1", price: "", referenceCode: "", limit: "20", page: "1" });
  const [giftPurchase, setGiftPurchase] = useState({ sku: "", quantity: "1", amount: "" });
  const settingsQuery = useQuery({
    queryKey: ["/api/admin/pagocards/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/pagocards/settings");
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load PagoCards settings");
      return json.data as { config: PagoCardsConfig; defaults: PagoCardsConfig };
    },
  });

  const statusQuery = useQuery({
    queryKey: ["/api/admin/pagocards/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/pagocards/status");
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load PagoCards status");
      return json.data;
    },
  });

  const providerEmailsQuery = useQuery({
    queryKey: ["/api/admin/pagocards/provider-emails"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/pagocards/provider-emails");
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load PagoCards provider emails");
      return json.data as { emails: string[] };
    },
  });

  const cardRegistryQuery = useQuery({
    queryKey: ["/api/admin/pagocards/cards"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/pagocards/cards");
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load PagoCards cards");
      return json.data as { cards: any[] };
    },
  });

  useEffect(() => {
    if (settingsQuery.data?.config) setDraft(settingsQuery.data.config);
  }, [settingsQuery.data?.config]);

  useEffect(() => {
    if (providerEmailsQuery.data?.emails?.length && !masterPortalEmails.trim()) {
      setMasterPortalEmails(providerEmailsQuery.data.emails.join("\n"));
    }
  }, [providerEmailsQuery.data?.emails, masterPortalEmails]);

  const defaults = settingsQuery.data?.defaults;
  const endpointOptions = useMemo(() => API_SECTIONS.flatMap((section) => section.endpoints), []);
  const connected = Boolean(statusQuery.data?.connected);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("PagoCards settings are not loaded");
      const res = await apiRequest("PUT", "/api/admin/pagocards/settings", draft);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to save PagoCards settings");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pagocards/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pagocards/status"] });
      toast({ title: "PagoCards saved", description: "Debit card issuing settings were updated." });
    },
    onError: (error: any) => {
      toast({ title: "Save failed", description: error.message || "Failed to save PagoCards settings", variant: "destructive" });
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ endpoint, payload }: ActionPayload) => {
      const res = await apiRequest("POST", "/api/admin/pagocards/call", { endpoint, payload: cleanPayload(payload) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "PagoCards API call failed");
      return json.data;
    },
    onSuccess: (data, variables) => {
      setActionResult({ action: variables.label, data });
      toast({ title: "PagoCards API success", description: `${variables.label} completed.` });
    },
    onError: (error: any, variables) => {
      setActionResult({ action: variables.label, error: error.message || "PagoCards API call failed" });
      toast({ title: `${variables.label} failed`, description: error.message || "Request failed", variant: "destructive" });
    },
  });

  const rawMutation = useMutation({
    mutationFn: async () => {
      let payload = {};
      try {
        payload = payloadText.trim() ? JSON.parse(payloadText) : {};
      } catch {
        throw new Error("Payload must be valid JSON");
      }
      const res = await apiRequest("POST", "/api/admin/pagocards/call", { endpoint: selectedEndpoint, payload });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "PagoCards API call failed");
      return json.data;
    },
    onSuccess: (data) => {
      setActionResult({ action: beautifyEndpoint(selectedEndpoint), data, fromConsole: true });
      toast({ title: "PagoCards API success", description: `${beautifyEndpoint(selectedEndpoint)} completed.` });
    },
    onError: (error: any) => {
      setActionResult({ action: beautifyEndpoint(selectedEndpoint), error: error.message || "PagoCards API call failed", fromConsole: true });
      toast({ title: "PagoCards API failed", description: error.message || "Request failed", variant: "destructive" });
    },
  });

  const saveProviderEmailsMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      const res = await apiRequest("PUT", "/api/admin/pagocards/provider-emails", { emails });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to save provider emails");
      return json.data as { emails: string[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pagocards/provider-emails"] });
      setMasterPortalEmails(data.emails.join("\n"));
      toast({ title: "Provider emails saved", description: `${data.emails.length} PagoCards customer emails saved.` });
    },
    onError: (error: any) => {
      toast({ title: "Save provider emails failed", description: error.message || "Failed to save provider emails", variant: "destructive" });
    },
  });

  const syncProviderCardsMutation = useMutation({
    mutationFn: async (emails?: string[]) => {
      const res = await apiRequest("POST", "/api/admin/pagocards/sync-mastercard-cards", { emails });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to sync provider cards");
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pagocards/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pagocards/provider-emails"] });
      setActionResult({ action: "Sync Mastercard Provider Cards", data });
      toast({ title: "Provider cards synced", description: `${data.cards?.length || 0} Mastercard cards found.` });
    },
    onError: (error: any) => {
      setActionResult({ action: "Sync Mastercard Provider Cards", error: error.message || "Failed to sync provider cards" });
      toast({ title: "Sync Provider Cards failed", description: error.message || "Request failed", variant: "destructive" });
    },
  });

  const bulkCardsMutation = useMutation({
    mutationFn: async ({ label, endpoint, emails }: { label: string; endpoint: string; emails: string[] }) => {
      const results = await Promise.all(
        emails.map(async (email) => {
          const res = await apiRequest("POST", "/api/admin/pagocards/call", { endpoint, payload: { email } });
          const json = await res.json();
          if (!json.success) return { email, cards: [], error: json.message || "PagoCards API call failed" };
          return { email, cards: extractCards({ data: json.data }) };
        }),
      );
      return {
        cards: results.flatMap((row) => row.cards.map((card: any) => ({ ...card, email: card.email || card.useremail || row.email }))),
        checkedEmails: results.length,
        errors: results.filter((row) => row.error),
      };
    },
    onSuccess: (data, variables) => {
      setActionResult({ action: variables.label, data });
      toast({ title: "PagoCards API success", description: `${variables.label} completed.` });
    },
    onError: (error: any, variables) => {
      setActionResult({ action: variables.label, error: error.message || "PagoCards API call failed" });
      toast({ title: `${variables.label} failed`, description: error.message || "Request failed", variant: "destructive" });
    },
  });

  const runAction = (label: string, endpoint: string, payload: Record<string, any>) => {
    const missing = missingFields(endpoint, payload);
    if (missing.length > 0) {
      const description = `Please fill ${missing.map(friendlyFieldName).join(", ")}.`;
      setActionResult({ action: label, error: description });
      toast({ title: `${label} missing fields`, description, variant: "destructive" });
      return;
    }
    actionMutation.mutate({ label, endpoint, payload });
  };

  const runBulkCards = (label: string, endpoint: string, text: string) => {
    const emails = parseEmailList(text);
    if (emails.length === 0) {
      const description = "Please paste at least one customer email from PagoCards.";
      setActionResult({ action: label, error: description });
      toast({ title: `${label} missing fields`, description, variant: "destructive" });
      return;
    }
    bulkCardsMutation.mutate({ label, endpoint, emails });
  };

  const saveProviderEmails = () => {
    const emails = parseEmailList(masterPortalEmails || masterManage.email);
    if (!emails.length) {
      toast({ title: "Provider emails missing", description: "Please paste at least one PagoCards customer email.", variant: "destructive" });
      return;
    }
    saveProviderEmailsMutation.mutate(emails);
  };

  const syncSavedProviderCards = () => {
    const pastedEmails = parseEmailList(masterPortalEmails);
    syncProviderCardsMutation.mutate(pastedEmails.length ? pastedEmails : undefined);
  };

  const showSavedProviderCards = () => {
    const cards = cardRegistryQuery.data?.cards || [];
    setActionResult({
      action: "Saved Mastercard Provider Cards",
      data: { cards, checkedEmails: providerEmailsQuery.data?.emails?.length || 0 },
    });
  };

  const masterIdentityPayload = () => pickPayload(masterManage, ["cardid", "email"]);
  const masterAmountPayload = () => pickPayload(masterManage, ["cardid", "email", "amount"]);
  const master3dsPayload = () => pickPayload(masterManage, ["cardid", "email", "eventId"]);
  const cardIdentityPayload = (card: any) => ({
    cardid: card.cardid || card.card_id || card.id,
    email: card.email || card.useremail,
  });
  const runMasterCardRowAction = (
    action: "details" | "check3ds" | "approve3ds" | "walletOtp" | "spendControl" | "deleteSpendControl" | "block" | "unblock",
    card: any,
  ) => {
    const identity = cardIdentityPayload(card);
    setMasterManage((current) => ({ ...current, ...identity }));
    const actions = {
      details: {
        label: "Get Mastercard Details",
        endpoint: "mastercard.details",
        payload: identity,
      },
      check3ds: {
        label: "Check Mastercard 3DS",
        endpoint: "mastercard.check3ds",
        payload: identity,
      },
      approve3ds: {
        label: "Approve Mastercard 3DS",
        endpoint: "mastercard.approve3ds",
        payload: { ...identity, eventId: masterManage.eventId },
      },
      walletOtp: {
        label: "Mastercard Wallet OTP",
        endpoint: "mastercard.walletOtp",
        payload: identity,
      },
      spendControl: {
        label: "Set Mastercard Spend Control",
        endpoint: "mastercard.spendControl",
        payload: { ...identity, amount: masterManage.amount },
      },
      deleteSpendControl: {
        label: "Delete Mastercard Spend Control",
        endpoint: "mastercard.deleteSpendControl",
        payload: identity,
      },
      block: {
        label: "Block Mastercard",
        endpoint: "mastercard.block",
        payload: identity,
      },
      unblock: {
        label: "Unblock Mastercard",
        endpoint: "mastercard.unblock",
        payload: identity,
      },
    } as const;
    const selected = actions[action];
    runAction(selected.label, selected.endpoint, selected.payload);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Debit Cards</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              PagoCards issuing platform: create cards, fund cards, manage cards, and sell gift cards.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            settingsQuery.refetch();
            statusQuery.refetch();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Server className="h-4 w-4 text-cyan-500" />
              API Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={connected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"}>
              {connected ? "Configured" : "Not Ready"}
            </Badge>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{statusQuery.data?.apiBaseUrl || "https://pagocards.com"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <KeyRound className="h-4 w-4 text-cyan-500" />
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-950 dark:text-white">
              {statusQuery.data?.hasPublicKey && statusQuery.data?.hasSecretKey ? "Saved" : "Missing"}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">publickey and secretkey headers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <ShieldCheck className="h-4 w-4 text-cyan-500" />
              Live Functions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-950 dark:text-white">24</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Documented card and gift card actions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PagoCards API Settings</CardTitle>
          <CardDescription>Enable the issuing API and save the publickey / secretkey headers from PagoCards.</CardDescription>
        </CardHeader>
        <CardContent>
          {!draft ? (
            <p className="py-6 text-sm text-slate-500">Loading settings...</p>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft({ ...draft, enabled })} />
                  <span className="text-sm font-medium">{draft.enabled ? "Enabled" : "Disabled"}</span>
                </div>
                <div>
                  <Label>Mode</Label>
                  <Select value={draft.mode} onValueChange={(mode: "test" | "live") => setDraft({ ...draft, mode })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>API Base URL</Label>
                  <Input value={draft.apiBaseUrl} onChange={(event) => setDraft({ ...draft, apiBaseUrl: event.target.value })} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Public Key Header" value={draft.publicKey} onChange={(publicKey) => setDraft({ ...draft, publicKey })} placeholder={draft.hasPublicKey ? "Saved key hidden" : "publickey"} />
                <Field label="Secret Key Header" type="password" value={draft.secretKey} onChange={(secretKey) => setDraft({ ...draft, secretKey })} placeholder={draft.hasSecretKey ? "Saved key hidden" : "secretkey"} />
              </div>

              <div>
                <Label>Documented Endpoint Paths</Label>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  {Object.entries(defaults?.endpoints || draft.endpoints || {}).map(([key, fallback]) => (
                    <div key={key}>
                      <Label className="text-xs text-slate-500">{beautifyEndpoint(key)}</Label>
                      <Input
                        value={draft.endpoints?.[key] || ""}
                        placeholder={fallback}
                        onChange={(event) => setDraft({ ...draft, endpoints: { ...(draft.endpoints || {}), [key]: event.target.value } })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {saveMutation.isPending ? "Saving..." : "Save PagoCards Settings"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="mastercard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mastercard">Mastercard</TabsTrigger>
          <TabsTrigger value="visa">Visa</TabsTrigger>
          <TabsTrigger value="giftcards">Gift Cards</TabsTrigger>
          <TabsTrigger value="console">API Console</TabsTrigger>
        </TabsList>

        <TabsContent value="mastercard" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Create Mastercard</CardTitle>
                <CardDescription>Issue a real virtual Mastercard from PagoCards.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="First Name" value={masterCreate.firstname} onChange={(firstname) => setMasterCreate({ ...masterCreate, firstname })} />
                <Field label="Last Name" value={masterCreate.lastname} onChange={(lastname) => setMasterCreate({ ...masterCreate, lastname })} />
                <Field label="Email" value={masterCreate.email} onChange={(email) => setMasterCreate({ ...masterCreate, email })} />
                <Field label="Initial Load" type="number" value={masterCreate.initialload} onChange={(initialload) => setMasterCreate({ ...masterCreate, initialload })} />
                <Button disabled={!connected || actionMutation.isPending} onClick={() => runAction("Create Mastercard", "mastercard.create", masterCreate)}>Create Mastercard</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fund Mastercard</CardTitle>
                <CardDescription>Add funds to an existing Mastercard.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Card ID" value={masterManage.cardid} onChange={(cardid) => setMasterManage({ ...masterManage, cardid })} />
                <Field label="Email" value={masterManage.email} onChange={(email) => setMasterManage({ ...masterManage, email })} />
                <Field label="Amount" type="number" value={masterManage.amount} onChange={(amount) => setMasterManage({ ...masterManage, amount })} />
                <Button disabled={!connected || actionMutation.isPending} onClick={() => runAction("Fund Mastercard", "mastercard.fund", masterAmountPayload())}>Fund Card</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Create Addon</CardTitle>
                <CardDescription>Create an addon card linked to a primary Mastercard.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Primary Card ID" value={masterAddon.cardid} onChange={(cardid) => setMasterAddon({ ...masterAddon, cardid })} />
                <Field label="First Name" value={masterAddon.firstname} onChange={(firstname) => setMasterAddon({ ...masterAddon, firstname })} />
                <Field label="Last Name" value={masterAddon.lastname} onChange={(lastname) => setMasterAddon({ ...masterAddon, lastname })} />
                <Field label="Email" value={masterAddon.email} onChange={(email) => setMasterAddon({ ...masterAddon, email })} />
                <Button disabled={!connected || actionMutation.isPending} onClick={() => runAction("Create Mastercard Addon", "mastercard.createAddon", masterAddon)}>Create Addon</Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Mastercard Manage Options</CardTitle>
              <CardDescription>Use one card ID and email to run details, 3DS, wallet OTP, block and unblock actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Card ID" value={masterManage.cardid} onChange={(cardid) => setMasterManage({ ...masterManage, cardid })} />
                <Field label="Email" value={masterManage.email} onChange={(email) => setMasterManage({ ...masterManage, email })} />
                <Field label="Spend Limit Amount" type="number" value={masterManage.amount} onChange={(amount) => setMasterManage({ ...masterManage, amount })} />
                <Field label="3DS Event ID" value={masterManage.eventId} onChange={(eventId) => setMasterManage({ ...masterManage, eventId })} />
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <Label>Provider Portal Emails</Label>
                  <Badge variant="outline">{providerEmailsQuery.data?.emails?.length || 0} saved</Badge>
                </div>
                <Textarea
                  className="min-h-20"
                  value={masterPortalEmails}
                  placeholder="Paste PagoCards portal user emails, one per line or separated by comma"
                  onChange={(event) => setMasterPortalEmails(event.target.value)}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={saveProviderEmailsMutation.isPending} onClick={saveProviderEmails}>
                    Save Emails
                  </Button>
                  <Button size="sm" disabled={!connected || syncProviderCardsMutation.isPending} onClick={syncSavedProviderCards}>
                    Sync Full Mastercard List
                  </Button>
                  <Button size="sm" variant="outline" disabled={cardRegistryQuery.isLoading} onClick={showSavedProviderCards}>
                    Show Saved Cards ({cardRegistryQuery.data?.cards?.length || 0})
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("List Mastercard Cards", "mastercard.listByUser", masterManage.email ? { email: masterManage.email } : {})}>List Cards</Button>
                <Button
                  variant="outline"
                  disabled={!connected || syncProviderCardsMutation.isPending}
                  onClick={syncSavedProviderCards}
                >
                  Sync Provider Cards
                </Button>
                <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Get Mastercard Details", "mastercard.details", masterIdentityPayload())}>Details</Button>
                <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Check Mastercard 3DS", "mastercard.check3ds", masterIdentityPayload())}>Check 3DS</Button>
                <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Approve Mastercard 3DS", "mastercard.approve3ds", master3dsPayload())}>Approve 3DS</Button>
                <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Mastercard Wallet OTP", "mastercard.walletOtp", masterIdentityPayload())}>Wallet OTP</Button>
                <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Set Mastercard Spend Control", "mastercard.spendControl", masterAmountPayload())}>Spend Control</Button>
                <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Delete Mastercard Spend Control", "mastercard.deleteSpendControl", masterIdentityPayload())}>Delete Spend Control</Button>
                <Button variant="destructive" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Block Mastercard", "mastercard.block", masterIdentityPayload())}>Block</Button>
                <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Unblock Mastercard", "mastercard.unblock", masterIdentityPayload())}>Unblock</Button>
              </div>
              {(actionMutation.isPending || bulkCardsMutation.isPending || syncProviderCardsMutation.isPending) && resultBelongsTo(actionResult, "mastercard") ? (
                <p className="text-sm text-slate-500">Calling PagoCards Mastercard API...</p>
              ) : resultBelongsTo(actionResult, "mastercard") ? (
                <ResultBox result={actionResult} onCardAction={runMasterCardRowAction} />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visa" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Create Visa Card</CardTitle>
                <CardDescription>Issue a real Visa virtual card from PagoCards.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="First Name" value={visaCreate.first_name} onChange={(first_name) => setVisaCreate({ ...visaCreate, first_name })} />
                <Field label="Last Name" value={visaCreate.last_name} onChange={(last_name) => setVisaCreate({ ...visaCreate, last_name })} />
                <Field label="Email" value={visaCreate.email} onChange={(email) => setVisaCreate({ ...visaCreate, email })} />
                <Button disabled={!connected || actionMutation.isPending} onClick={() => runAction("Create Visa Card", "visa.create", visaCreate)}>Create Visa</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visa Manage Options</CardTitle>
                <CardDescription>PagoCards documents Visa create, list, details, block and unblock.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Card ID" value={visaManage.cardid} onChange={(cardid) => setVisaManage({ ...visaManage, cardid })} />
                <Field label="Email" value={visaManage.email} onChange={(email) => setVisaManage({ ...visaManage, email })} />
                <Field label="Amount" type="number" value={visaManage.amount} onChange={(amount) => setVisaManage({ ...visaManage, amount })} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Fund Visa Card", "visa.fund", visaManage)}>Fund Visa</Button>
                  <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("List Visa Cards", "visa.listByUser", visaManage.email ? { email: visaManage.email } : {})}>List Cards</Button>
                  <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Get Visa Details", "visa.details", visaManage)}>Details</Button>
                  <Button variant="destructive" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Block Visa", "visa.block", visaManage)}>Block</Button>
                  <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Unblock Visa", "visa.unblock", visaManage)}>Unblock</Button>
                </div>
                {actionMutation.isPending && resultBelongsTo(actionResult, "visa") ? (
                  <p className="text-sm text-slate-500">Calling PagoCards Visa API...</p>
                ) : resultBelongsTo(actionResult, "visa") ? (
                  <ResultBox result={actionResult} />
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="giftcards" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Gift Card Catalog</CardTitle>
                <CardDescription>Browse catalog data, categories, countries, rates, SKU details and availability.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="SKU" value={giftLookup.sku} onChange={(sku) => setGiftLookup({ ...giftLookup, sku })} />
                  <Field label="Quantity" type="number" value={giftLookup.item_count} onChange={(item_count) => setGiftLookup({ ...giftLookup, item_count })} />
                  <Field label="Price" type="number" value={giftLookup.price} onChange={(price) => setGiftLookup({ ...giftLookup, price })} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Get Gift Card Catalog", "giftcards.catalog", {})}>Catalog</Button>
                  <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Get Gift Card By SKU", "giftcards.catalogBySku", { sku: giftLookup.sku })}>SKU Details</Button>
                  <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Check Gift Card Availability", "giftcards.availability", giftLookup)}>Check Availability</Button>
                  <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Get Gift Card Exchange Rates", "giftcards.exchangeRates", {})}>Exchange Rates</Button>
                  <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Get Gift Card Categories", "giftcards.categories", {})}>Categories</Button>
                  <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Get Gift Card Countries", "giftcards.countries", {})}>Countries</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Purchase Gift Card</CardTitle>
                <CardDescription>Create a real gift card order through PagoCards.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="SKU" value={giftPurchase.sku} onChange={(sku) => setGiftPurchase({ ...giftPurchase, sku })} />
                <Field label="Quantity" type="number" value={giftPurchase.quantity} onChange={(quantity) => setGiftPurchase({ ...giftPurchase, quantity })} />
                <Field label="Amount" type="number" value={giftPurchase.amount} onChange={(amount) => setGiftPurchase({ ...giftPurchase, amount })} />
                <Button disabled={!connected || actionMutation.isPending} onClick={() => runAction("Purchase Gift Card", "giftcards.purchase", giftPurchase)}>Purchase Gift Card</Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Gift Card Orders</CardTitle>
              <CardDescription>Look up one order by reference code or fetch order history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Reference Code" value={giftLookup.referenceCode} onChange={(referenceCode) => setGiftLookup({ ...giftLookup, referenceCode })} />
                <Field label="Limit" type="number" value={giftLookup.limit} onChange={(limit) => setGiftLookup({ ...giftLookup, limit })} />
                <Field label="Page" type="number" value={giftLookup.page} onChange={(page) => setGiftLookup({ ...giftLookup, page })} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Get Gift Card Order", "giftcards.order", { referenceCode: giftLookup.referenceCode })}>Find Order</Button>
                <Button variant="outline" disabled={!connected || actionMutation.isPending} onClick={() => runAction("Get Gift Card Order History", "giftcards.orderHistory", { limit: giftLookup.limit, page: giftLookup.page })}>Order History</Button>
              </div>
              {actionMutation.isPending && resultBelongsTo(actionResult, "giftcards") ? (
                <p className="text-sm text-slate-500">Calling PagoCards Gift Card API...</p>
              ) : resultBelongsTo(actionResult, "giftcards") ? (
                <ResultBox result={actionResult} />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="console" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Test Console</CardTitle>
              <CardDescription>Advanced fallback for any documented PagoCards endpoint payload.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Endpoint</Label>
                <Select
                  value={selectedEndpoint}
                  onValueChange={(endpoint) => {
                    setSelectedEndpoint(endpoint);
                    setPayloadText(sampleFor(endpoint));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {endpointOptions.map((endpoint) => (
                      <SelectItem key={endpoint} value={endpoint}>{beautifyEndpoint(endpoint)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>JSON Payload</Label>
                <Textarea className="min-h-32 font-mono text-xs" value={payloadText} onChange={(event) => setPayloadText(event.target.value)} />
              </div>
              <Button onClick={() => rawMutation.mutate()} disabled={rawMutation.isPending || !connected}>
                {rawMutation.isPending ? "Calling API..." : `Call ${beautifyEndpoint(selectedEndpoint)}`}
              </Button>
              {rawMutation.isPending ? (
                <p className="text-sm text-slate-500">Calling PagoCards...</p>
              ) : resultBelongsTo(actionResult, "console") ? (
                <ResultBox result={actionResult} />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
