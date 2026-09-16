import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, KeyRound, RefreshCw, Save, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type SudoAfricaConfig = {
  enabled: boolean;
  mode: "sandbox" | "live";
  apiBaseUrl: string;
  apiKey: string;
  endpoints: Record<string, string>;
  hasApiKey?: boolean;
};

const SUDO_ENDPOINT_SAMPLES: Record<string, Record<string, any>> = {
  "customers.create": { type: "individual", name: "Test Customer", emailAddress: "customer@example.com" },
  "customers.list": { limit: 20 },
  "cards.create": { customerId: "cus_example", type: "virtual", currency: "USD", brand: "Mastercard" },
  "cards.list": { limit: 20 },
  "cards.details": { cardId: "card_example" },
  "cards.update": { cardId: "card_example", status: "active", spendingControls: { allowedCategories: [], blockedCategories: [] } },
  "cards.token": { cardId: "card_example" },
  "cards.transactions": { cardId: "card_example", limit: 20 },
  "cards.authorizations": { cardId: "card_example", limit: 20 },
};

function beautifyEndpoint(endpoint: string) {
  return endpoint
    .replace("customers.", "Customers ")
    .replace("cards.", "Cards ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

function SudoResultBox({ result }: { result: any }) {
  if (!result) return null;
  if (result.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
        <p className="font-semibold">{result.action || "Sudo Africa action"} failed</p>
        <p className="mt-1">{result.error}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{result.action || "Sudo Africa Response"}</h3>
      <pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

export default function AdminSudoAfricaCards() {
  const { toast } = useToast();
  const [draft, setDraft] = useState<SudoAfricaConfig | null>(null);
  const [endpoint, setEndpoint] = useState("cards.list");
  const [payloadText, setPayloadText] = useState(JSON.stringify(SUDO_ENDPOINT_SAMPLES["cards.list"], null, 2));
  const [result, setResult] = useState<any>(null);

  const settingsQuery = useQuery({
    queryKey: ["/api/admin/sudoafrica/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/sudoafrica/settings");
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load Sudo Africa settings");
      return json.data as { config: SudoAfricaConfig; defaults: SudoAfricaConfig };
    },
  });

  const statusQuery = useQuery({
    queryKey: ["/api/admin/sudoafrica/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/sudoafrica/status");
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load Sudo Africa status");
      return json.data;
    },
  });

  useEffect(() => {
    if (settingsQuery.data?.config) setDraft(settingsQuery.data.config);
  }, [settingsQuery.data?.config]);

  const defaults = settingsQuery.data?.defaults;
  const endpointOptions = useMemo(() => Object.keys(SUDO_ENDPOINT_SAMPLES), []);
  const connected = Boolean(statusQuery.data?.connected);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("Sudo Africa settings are not loaded");
      const res = await apiRequest("PUT", "/api/admin/sudoafrica/settings", draft);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to save Sudo Africa settings");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sudoafrica/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sudoafrica/status"] });
      toast({ title: "Sudo Africa saved", description: "Sudo Africa cards settings were updated." });
    },
    onError: (error: any) => {
      toast({ title: "Save Sudo Africa failed", description: error.message || "Failed to save Sudo Africa settings", variant: "destructive" });
    },
  });

  const actionMutation = useMutation({
    mutationFn: async () => {
      let payload = {};
      try {
        payload = payloadText.trim() ? JSON.parse(payloadText) : {};
      } catch {
        throw new Error("Sudo Africa payload must be valid JSON");
      }
      const res = await apiRequest("POST", "/api/admin/sudoafrica/call", { endpoint, payload: cleanPayload(payload) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Sudo Africa API call failed");
      return json.data;
    },
    onSuccess: (data) => {
      setResult({ action: `Sudo Africa ${beautifyEndpoint(endpoint)}`, data });
      toast({ title: "Sudo Africa API success", description: `${beautifyEndpoint(endpoint)} completed.` });
    },
    onError: (error: any) => {
      setResult({ action: `Sudo Africa ${beautifyEndpoint(endpoint)}`, error: error.message || "Sudo Africa API call failed" });
      toast({ title: "Sudo Africa API failed", description: error.message || "Request failed", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Sudo Africa Cards</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Dedicated Sudo Africa card issuing integration, separate from PagoCards.
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
              <Server className="h-4 w-4 text-emerald-500" />
              API Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={connected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"}>
              {connected ? "Configured" : "Not Ready"}
            </Badge>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{statusQuery.data?.apiBaseUrl || "https://api.sandbox.sudo.africa"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <KeyRound className="h-4 w-4 text-emerald-500" />
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-950 dark:text-white">{statusQuery.data?.hasApiKey ? "Saved" : "Missing"}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Bearer token</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <CreditCard className="h-4 w-4 text-emerald-500" />
              Provider Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-950 dark:text-white">{statusQuery.data?.mode || "sandbox"}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sudo Africa environment</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sudo Africa API Settings</CardTitle>
          <CardDescription>Save the Sudo Africa Bearer token and endpoint paths for this provider only.</CardDescription>
        </CardHeader>
        <CardContent>
          {!draft ? (
            <p className="py-6 text-sm text-slate-500">Loading Sudo Africa settings...</p>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft({ ...draft, enabled })} />
                  <span className="text-sm font-medium">{draft.enabled ? "Enabled" : "Disabled"}</span>
                </div>
                <div>
                  <Label>Mode</Label>
                  <Select value={draft.mode} onValueChange={(mode: "sandbox" | "live") => setDraft({ ...draft, mode })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>API Base URL</Label>
                  <Input value={draft.apiBaseUrl} onChange={(event) => setDraft({ ...draft, apiBaseUrl: event.target.value })} />
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-2">
                    <Badge className={connected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"}>
                      {connected ? "Configured" : "Not Ready"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Field
                label="API Key Bearer Token"
                type="password"
                value={draft.apiKey}
                onChange={(apiKey) => setDraft({ ...draft, apiKey })}
                placeholder={draft.hasApiKey ? "Saved key hidden" : "Sudo Africa API key"}
              />

              <div>
                <Label>Sudo Africa Endpoint Paths</Label>
                <div className="mt-2 grid gap-3 md:grid-cols-3">
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
                {saveMutation.isPending ? "Saving..." : "Save Sudo Africa Settings"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sudo Africa API Console</CardTitle>
          <CardDescription>Create and manage Sudo Africa customers/cards using the configured Bearer token.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Action</Label>
              <Select
                value={endpoint}
                onValueChange={(nextEndpoint) => {
                  setEndpoint(nextEndpoint);
                  setPayloadText(JSON.stringify(SUDO_ENDPOINT_SAMPLES[nextEndpoint] || {}, null, 2));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {endpointOptions.map((option) => (
                    <SelectItem key={option} value={option}>{beautifyEndpoint(option)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Connection</Label>
              <div className="mt-2">
                <Badge className={connected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"}>
                  {connected ? `${statusQuery.data?.mode || "sandbox"} ready` : "Save API key first"}
                </Badge>
              </div>
            </div>
          </div>
          <div>
            <Label>JSON Payload</Label>
            <Textarea className="min-h-40 font-mono text-xs" value={payloadText} onChange={(event) => setPayloadText(event.target.value)} />
          </div>
          <Button onClick={() => actionMutation.mutate()} disabled={actionMutation.isPending || !connected}>
            {actionMutation.isPending ? "Calling Sudo Africa..." : `Call ${beautifyEndpoint(endpoint)}`}
          </Button>
          {actionMutation.isPending ? (
            <p className="text-sm text-slate-500">Calling Sudo Africa API...</p>
          ) : (
            <SudoResultBox result={result} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
