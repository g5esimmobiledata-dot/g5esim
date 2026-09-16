import { useEffect, useMemo, useState } from "react";
import { BellRing, Loader2, Mail, Save } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/TranslationContext";

function settingsArrayToObject(settingsResponse: unknown) {
  if (!Array.isArray(settingsResponse)) return {};
  return settingsResponse.reduce<Record<string, string>>((acc, setting: any) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
}

export function OneSignalSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [appId, setAppId] = useState("");
  const [restApiKey, setRestApiKey] = useState("");
  const [safariWebId, setSafariWebId] = useState("");
  const [promptEnabled, setPromptEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailFromName, setEmailFromName] = useState("");
  const [emailFromAddress, setEmailFromAddress] = useState("");
  const [emailReplyTo, setEmailReplyTo] = useState("");

  const { data: settingsResponse } = useQuery({
    queryKey: ["/api/admin/settings"],
  });

  const settings = useMemo(() => settingsArrayToObject(settingsResponse), [settingsResponse]);

  useEffect(() => {
    setEnabled(settings.onesignal_enabled === "true");
    setAppId(settings.onesignal_app_id || "");
    setRestApiKey(settings.onesignal_rest_api_key || "");
    setSafariWebId(settings.onesignal_safari_web_id || "");
    setPromptEnabled(settings.onesignal_prompt_enabled !== "false");
    setEmailEnabled(settings.onesignal_email_enabled === "true");
    setEmailFromName(settings.onesignal_email_from_name || "");
    setEmailFromAddress(settings.onesignal_email_from_address || "");
    setEmailReplyTo(settings.onesignal_email_reply_to || "");
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return apiRequest("PUT", `/api/admin/settings/${key}`, {
        value,
        category: "onesignal",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("adminPanel.admin.settings.error", "Error"),
        description: error.message || t("adminPanel.admin.settings.failedToUpdateSettings", "Failed to update settings"),
        variant: "destructive",
      });
    },
  });

  const saveSetting = (key: string, value: string) =>
    updateSettingMutation.mutateAsync({ key, value });

  const handleSave = async () => {
    await Promise.all([
      saveSetting("onesignal_enabled", String(enabled)),
      saveSetting("onesignal_app_id", appId),
      saveSetting("onesignal_rest_api_key", restApiKey),
      saveSetting("onesignal_safari_web_id", safariWebId),
      saveSetting("onesignal_prompt_enabled", String(promptEnabled)),
      saveSetting("onesignal_email_enabled", String(emailEnabled)),
      saveSetting("onesignal_email_from_name", emailFromName),
      saveSetting("onesignal_email_from_address", emailFromAddress),
      saveSetting("onesignal_email_reply_to", emailReplyTo),
    ]);

    queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    queryClient.invalidateQueries({ queryKey: ["/api/onesignal/config"] });
    toast({
      title: t("adminPanel.admin.settings.success", "Success"),
      description: t("adminPanel.admin.settings.onesignal.saved", "OneSignal settings saved successfully"),
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-400 shadow-lg">
              <BellRing className="h-6 w-6 text-slate-950" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">
                {t("adminPanel.admin.settings.onesignal.title", "OneSignal")}
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                {t("adminPanel.admin.settings.onesignal.description", "PWA push and email delivery")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <ToggleRow
              label={t("adminPanel.admin.settings.onesignal.enabled", "Enable OneSignal")}
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <ToggleRow
              label={t("adminPanel.admin.settings.onesignal.promptEnabled", "Show push prompt")}
              checked={promptEnabled}
              onCheckedChange={setPromptEnabled}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field
              label={t("adminPanel.admin.settings.onesignal.appId", "App ID")}
              value={appId}
              onChange={setAppId}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
            <Field
              label={t("adminPanel.admin.settings.onesignal.restApiKey", "App API Key")}
              value={restApiKey}
              onChange={setRestApiKey}
              placeholder="os_v2_app_..."
              type="password"
            />
            <Field
              label={t("adminPanel.admin.settings.onesignal.safariWebId", "Safari Web ID")}
              value={safariWebId}
              onChange={setSafariWebId}
              placeholder="web.onesignal.auto..."
            />
            <Field
              label={t("adminPanel.admin.settings.onesignal.workerPath", "Service worker path")}
              value="/push/onesignal/OneSignalSDKWorker.js"
              readOnly
            />
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-4 flex items-center gap-3">
              <Mail className="h-5 w-5 text-cyan-600" />
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                {t("adminPanel.admin.settings.onesignal.email", "OneSignal Email")}
              </h3>
            </div>
            <div className="mb-6">
              <ToggleRow
                label={t("adminPanel.admin.settings.onesignal.emailEnabled", "Enable OneSignal email")}
                checked={emailEnabled}
                onCheckedChange={setEmailEnabled}
              />
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <Field
                label={t("adminPanel.admin.settings.onesignal.fromName", "From name")}
                value={emailFromName}
                onChange={setEmailFromName}
                placeholder="G5 eSIM"
              />
              <Field
                label={t("adminPanel.admin.settings.onesignal.fromEmail", "From email")}
                value={emailFromAddress}
                onChange={setEmailFromAddress}
                placeholder="no-reply@example.com"
              />
              <Field
                label={t("adminPanel.admin.settings.onesignal.replyTo", "Reply-to email")}
                value={emailReplyTo}
                onChange={setEmailReplyTo}
                placeholder="support@example.com"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={updateSettingMutation.isPending} className="gap-2">
            {updateSettingMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("adminPanel.admin.settings.onesignal.saving", "Saving...")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t("adminPanel.admin.settings.onesignal.save", "Save OneSignal Settings")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-800">
      <Label className="text-sm font-medium">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
