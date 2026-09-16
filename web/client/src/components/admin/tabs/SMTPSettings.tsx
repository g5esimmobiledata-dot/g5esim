import React, { useState, useEffect, useMemo } from "react";
import {
  Save,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/contexts/TranslationContext";

import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";


export function SMTPSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Internal state management
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [allowSelfSigned, setAllowSelfSigned] = useState(false);

  // Fetch settings from API
  const { data: settingsResponse } = useQuery({
    queryKey: ["/api/admin/settings"],
  });

  // Transform settings array to object
  const settings = useMemo(() => {
    if (!settingsResponse) return {};

    return settingsResponse.reduce((acc: Record<string, string>, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
  }, [settingsResponse]);

  console.log('settings', settings);

  // Load settings into state
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setSmtpHost(settings.smtp_host || "");
      setSmtpPort(settings.smtp_port || "");
      setSmtpUser(settings.smtp_user || "");
      setSmtpPass(settings.smtp_pass || "");
      setSmtpFromEmail(settings.smtp_from_email || "");
      setAllowSelfSigned(settings.smtp_allow_self_signed === "true");
    }
  }, [settings]);

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({
      key,
      value,
      category,
    }: {
      key: string;
      value: string;
      category: string;
    }) => {
      return await apiRequest("PUT", `/api/admin/settings/${key}`, {
        value,
        category,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: t("adminPanel.admin.settings.error", "Error"),
        description:
          error.message ||
          t(
            "adminPanel.admin.settings.failedToUpdateSettings",
            "Failed to update settings"
          ),
        variant: "destructive",
      });
    },
  });

  // Save single setting
  const saveSetting = async (
    key: string,
    value: string,
    category: string = "smtp"
  ) => {
    await updateSettingMutation.mutateAsync({ key, value, category });
  };

  // Handle SMTP settings save
  const handleSaveSmtp = async () => {
    await Promise.all([
      saveSetting("smtp_host", smtpHost, "smtp"),
      saveSetting("smtp_port", smtpPort, "smtp"),
      saveSetting("smtp_user", smtpUser, "smtp"),
      saveSetting("smtp_pass", smtpPass, "smtp"),
      saveSetting("smtp_from_email", smtpFromEmail, "smtp"),
      saveSetting("smtp_allow_self_signed", String(allowSelfSigned), "smtp"),
    ]);
    toast({
      title: t("adminPanel.admin.settings.success", "Success"),
      description: t(
        "adminPanel.admin.settings.settingsUpdatedSuccess",
        "Settings updated successfully"
      ),
    });
  };

  return (
    <div className="space-y-6">
      {/* SMTP Configuration Card */}
      <Card className="border-0 shadow-xl hover:shadow-[0_25px_50px_-12px_color-mix(in_srgb,var(--primary-hex)_30%,transparent)] transition-all duration-500">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Icon Container: Slightly smaller on mobile */}
            <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-gradient-to-br from-[var(--primary-hex)] to-[var(--primary-second-hex)] flex items-center justify-center shadow-lg">
              <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
            </div>

            <div className="space-y-1">
              {/* Title: Adjusted text size for mobile (text-xl to text-2xl) */}
              <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] bg-clip-text text-transparent">
                {t("adminPanel.admin.settings.smtp.title", "Email Configuration")}
              </CardTitle>

              {/* Description: Reduced text size and line-height for small screens */}
              <CardDescription className="text-sm sm:text-base md:text-lg text-[var(--primary-hex)]/70 leading-relaxed">
                {t(
                  "adminPanel.admin.settings.smtp.description",
                  "Configure SMTP settings for sending emails (OTP codes, order confirmations, etc.)"
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* SMTP Host */}
            <div className="space-y-2 sm:y-3">
              <Label
                htmlFor="smtp-host"
                className="text-base sm:text-lg font-semibold flex items-center gap-2"
              >
                <div className="h-2 w-2 rounded-full bg-[var(--primary-hex)]"></div>
                {t("adminPanel.admin.settings.smtp.host", "SMTP Host")}
              </Label>
              <Input
                id="smtp-host"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder={t("adminPanel.admin.settings.smtp.hostPlaceholder", "smtp.gmail.com")}
                className="h-11 sm:h-12 ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)] transition-all duration-300"
                data-testid="input-smtp-host"
              />
            </div>

            {/* SMTP Port */}
            <div className="space-y-2 sm:y-3">
              <Label
                htmlFor="smtp-port"
                className="text-base sm:text-lg font-semibold flex items-center gap-2"
              >
                <div className="h-2 w-2 rounded-full bg-[var(--primary-hex)]"></div>
                {t("adminPanel.admin.settings.smtp.port", "SMTP Port")}
              </Label>
              <Input
                id="smtp-port"
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder={t("adminPanel.admin.settings.smtp.portPlaceholder", "587")}
                className="h-11 sm:h-12 ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)] transition-all duration-300"
                data-testid="input-smtp-port"
              />
            </div>
          </div>

          {/* SMTP Username */}
          <div className="space-y-2 sm:y-3">
            <Label
              htmlFor="smtp-user"
              className="text-base sm:text-lg font-semibold flex items-center gap-2"
            >
              <div className="h-2 w-2 rounded-full bg-[var(--primary-hex)]"></div>
              {t("adminPanel.admin.settings.smtp.username", "SMTP Username")}
            </Label>
            <Input
              id="smtp-user"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder={t("adminPanel.admin.settings.smtp.usernamePlaceholder", "your-email@gmail.com")}
              className="h-11 sm:h-12 ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)] transition-all duration-300"
              data-testid="input-smtp-user"
            />
          </div>

          {/* SMTP From Email */}
          <div className="space-y-2 sm:y-3">
            <Label
              htmlFor="smtp-from"
              className="text-base sm:text-lg font-semibold flex items-center gap-2"
            >
              <div className="h-2 w-2 rounded-full bg-[var(--primary-hex)]"></div>
              {t("adminPanel.admin.settings.smtp.fromEmail", "SMTP From Email")}
            </Label>
            <Input
              id="smtp-from"
              value={smtpFromEmail}
              onChange={(e) => setSmtpFromEmail(e.target.value)}
              placeholder={t("adminPanel.admin.settings.smtp.fromEmailPlaceholder", "noreply@yourdomain.com")}
              className="h-11 sm:h-12 ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)] transition-all duration-300"
              data-testid="input-smtp-from"
            />
            <p className="text-xs sm:text-sm font-medium px-3 py-2 bg-[var(--primary-light-hex)]/20 rounded-lg border border-[var(--primary-hex)]/20 flex items-start sm:items-center gap-2">
              <Info className="h-4 w-4 mt-0.5 sm:mt-0 text-[var(--primary-hex)] shrink-0" />
              <span>{t("adminPanel.admin.settings.smtp.fromEmailHelp", "This email will appear as the sender.")}</span>
            </p>
          </div>

          {/* SMTP Password */}
          <div className="space-y-2 sm:y-3">
            <Label
              htmlFor="smtp-pass"
              className="text-base sm:text-lg font-semibold flex items-center gap-2"
            >
              <div className="h-2 w-2 rounded-full bg-[var(--primary-hex)]"></div>
              {t("adminPanel.admin.settings.smtp.password", "SMTP Password")}
            </Label>
            <Input
              id="smtp-pass"
              type="password"
              value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)}
              placeholder={t("adminPanel.admin.settings.smtp.passwordPlaceholder", "Your app password")}
              className="h-11 sm:h-12 ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)] transition-all duration-300"
              data-testid="input-smtp-pass"
            />
            <p className="text-xs sm:text-sm font-medium px-3 py-2 bg-[var(--primary-light-hex)]/20 rounded-lg border border-[var(--primary-hex)]/20 flex items-start sm:items-center gap-2">
              <Shield className="h-4 w-4 mt-0.5 sm:mt-0 text-[var(--primary-hex)] shrink-0" />
              <span>{t("adminPanel.admin.settings.smtp.passwordHelp", "Use an App Password for Gmail.")}</span>
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-300/40 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
            <div>
              <Label className="text-base font-semibold text-amber-950 dark:text-amber-100">
                {t("adminPanel.admin.settings.smtp.allowSelfSigned", "Allow Self-Signed SMTP Certificate")}
              </Label>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                {t(
                  "adminPanel.admin.settings.smtp.allowSelfSignedHelp",
                  "Enable this only for trusted private mail servers that use a self-signed certificate chain."
                )}
              </p>
            </div>
            <Switch
              checked={allowSelfSigned}
              onCheckedChange={setAllowSelfSigned}
              data-testid="switch-smtp-allow-self-signed"
            />
          </div>

          {/* Full width button on mobile */}
          <Button
            onClick={handleSaveSmtp}
            disabled={updateSettingMutation.isPending}
            className="w-full sm:w-auto gap-2 h-11 sm:h-12 px-8 text-base sm:text-lg bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] hover:from-[var(--primary-dark-hex)] hover:to-[var(--primary-hex)] shadow-lg hover:shadow-glow transition-all duration-300"
            data-testid="button-save-smtp"
          >
            {updateSettingMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("adminPanel.admin.settings.smtp.saving", "Saving...")}
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {t("adminPanel.admin.settings.smtp.saveSmtpSettings", "Save SMTP Settings")}
              </>
            )}
          </Button>
        </CardContent>

      </Card>

      {/* Security Note Card */}
      <Card className="border-0 bg-gradient-to-br from-amber-50 via-amber-100/50 to-transparent dark:from-amber-950/30 dark:via-amber-900/20 dark:to-transparent shadow-xl border-l-4 border-l-amber-500">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-lg">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold mb-2 text-amber-900 dark:text-amber-100">
                {t("adminPanel.admin.settings.smtp.securityNote", "Security Note")}
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                {t(
                  "adminPanel.admin.settings.smtp.securityNoteDescription",
                  "SMTP credentials are stored securely. In development mode, emails are logged to console instead of being sent."
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Setup Guide Card */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent border border-[var(--primary-hex)]/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl font-bold text-[var(--primary-hex)] flex items-center gap-2">
            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            {t("adminPanel.admin.settings.smtp.quickSetupGuide", "Quick Setup Guide")}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-5">
          <div className="space-y-6">
            {/* Gmail Setup */}
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-[var(--primary-hex)] text-black flex items-center justify-center text-sm sm:text-base font-bold shadow-md flex-shrink-0">
                1
              </div>
              <div className="min-w-0"> {/* min-w-0 prevents flex children from overflowing */}
                <h5 className="font-semibold text-foreground mb-1">
                  Gmail Setup
                </h5>
                <div className="text-sm text-muted-foreground space-y-1.5">
                  <p className="flex flex-wrap gap-y-1">
                    <span>Host:</span>
                    <code className="mx-1 bg-muted px-1.5 py-0.5 rounded text-[12px] sm:text-sm">
                      smtp.gmail.com
                    </code>
                    <span className="hidden sm:inline">|</span>
                    <span>Port:</span>
                    <code className="ml-1 bg-muted px-1.5 py-0.5 rounded text-[12px] sm:text-sm">587</code>
                  </p>
                  <p className="leading-relaxed">
                    Enable 2FA and create an App Password:
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block sm:inline text-[var(--primary-hex)] hover:underline break-all mt-1 sm:mt-0 sm:ml-1"
                    >
                      myaccount.google.com/apppasswords
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Outlook/Office 365 */}
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-[var(--primary-hex)] text-black flex items-center justify-center text-sm sm:text-base font-bold shadow-md flex-shrink-0">
                2
              </div>
              <div className="min-w-0">
                <h5 className="font-semibold text-foreground mb-1">
                  Outlook/Office 365
                </h5>
                <div className="text-sm text-muted-foreground">
                  <p className="flex flex-wrap gap-y-1">
                    <span>Host:</span>
                    <code className="mx-1 bg-muted px-1.5 py-0.5 rounded text-[12px] sm:text-sm">
                      smtp-mail.outlook.com
                    </code>
                    <span className="hidden sm:inline">|</span>
                    <span>Port:</span>
                    <code className="ml-1 bg-muted px-1.5 py-0.5 rounded text-[12px] sm:text-sm">587</code>
                  </p>
                  <p className="mt-1">Use your Outlook email and password</p>
                </div>
              </div>
            </div>

            {/* Custom SMTP */}
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-[var(--primary-hex)] text-black flex items-center justify-center text-sm sm:text-base font-bold shadow-md flex-shrink-0">
                3
              </div>
              <div className="min-w-0">
                <h5 className="font-semibold text-foreground mb-1">
                  Custom SMTP
                </h5>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Contact your email provider for SMTP server details (host, port, credentials).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
