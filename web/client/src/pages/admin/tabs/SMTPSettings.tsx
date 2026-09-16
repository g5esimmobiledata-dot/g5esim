// components/admin/tabs/SMTPSettings.tsx - Complete SMTP Configuration Component
import React, { useState, useEffect } from "react";
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

  // Fetch settings from API
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
  });

  // Load settings into state
  useEffect(() => {
    if (settings) {
      setSmtpHost(settings.smtp_host || "");
      setSmtpPort(settings.smtp_port || "");
      setSmtpUser(settings.smtp_user || "");
      setSmtpPass(settings.smtp_pass || "");
      setSmtpFromEmail(settings.smtp_from_email || "");
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
      toast({
        title: t("admin.settings.success", "Success"),
        description: t(
          "admin.settings.settingsUpdatedSuccess",
          "Settings updated successfully"
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("admin.settings.error", "Error"),
        description:
          error.message ||
          t(
            "admin.settings.failedToUpdateSettings",
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
    await saveSetting("smtp_host", smtpHost, "smtp");
    await saveSetting("smtp_port", smtpPort, "smtp");
    await saveSetting("smtp_user", smtpUser, "smtp");
    await saveSetting("smtp_pass", smtpPass, "smtp");
    await saveSetting("smtp_from_email", smtpFromEmail, "smtp");
  };

  return (
    <div className="space-y-6">
      {/* SMTP Configuration Card */}
      <Card className="border-0 shadow-xl hover:shadow-[0_25px_50px_-12px_color-mix(in_srgb,var(--primary-hex)_30%,transparent)] transition-all duration-500">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[var(--primary-hex)] to-[var(--primary-second-hex)] flex items-center justify-center shadow-lg">
              <Mail className="h-6 w-6 text-black" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] bg-clip-text text-transparent">
                {t("admin.settings.smtp.title", "Email Configuration")}
              </CardTitle>
              <CardDescription className="text-lg text-[var(--primary-hex)]/70">
                {t(
                  "admin.settings.smtp.description",
                  "Configure SMTP settings for sending emails (OTP codes, order confirmations, etc.)"
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SMTP Host */}
            <div className="space-y-3">
              <Label
                htmlFor="smtp-host"
                className="text-lg font-semibold flex items-center gap-2"
              >
                <div className="h-2 w-2 rounded-full bg-[var(--primary-hex)]"></div>
                {t("admin.settings.smtp.host", "SMTP Host")}
              </Label>
              <Input
                id="smtp-host"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder={t(
                  "admin.settings.smtp.hostPlaceholder",
                  "smtp.gmail.com"
                )}
                className="h-12 ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)] transition-all duration-300"
                data-testid="input-smtp-host"
              />
            </div>

            {/* SMTP Port */}
            <div className="space-y-3">
              <Label
                htmlFor="smtp-port"
                className="text-lg font-semibold flex items-center gap-2"
              >
                <div className="h-2 w-2 rounded-full bg-[var(--primary-hex)]"></div>
                {t("admin.settings.smtp.port", "SMTP Port")}
              </Label>
              <Input
                id="smtp-port"
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder={t("admin.settings.smtp.portPlaceholder", "587")}
                className="h-12 ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)] transition-all duration-300"
                data-testid="input-smtp-port"
              />
            </div>
          </div>

          {/* SMTP Username */}
          <div className="space-y-3">
            <Label
              htmlFor="smtp-user"
              className="text-lg font-semibold flex items-center gap-2"
            >
              <div className="h-2 w-2 rounded-full bg-[var(--primary-hex)]"></div>
              {t("admin.settings.smtp.username", "SMTP Username")}
            </Label>
            <Input
              id="smtp-user"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder={t(
                "admin.settings.smtp.usernamePlaceholder",
                "your-email@gmail.com"
              )}
              className="h-12 ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)] transition-all duration-300"
              data-testid="input-smtp-user"
            />
          </div>

          {/* SMTP From Email */}
          <div className="space-y-3">
            <Label
              htmlFor="smtp-from"
              className="text-lg font-semibold flex items-center gap-2"
            >
              <div className="h-2 w-2 rounded-full bg-[var(--primary-hex)]"></div>
              {t("admin.settings.smtp.fromEmail", "SMTP From Email")}
            </Label>
            <Input
              id="smtp-from"
              value={smtpFromEmail}
              onChange={(e) => setSmtpFromEmail(e.target.value)}
              placeholder={t(
                "admin.settings.smtp.fromEmailPlaceholder",
                "noreply@yourdomain.com"
              )}
              className="h-12 ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)] transition-all duration-300"
              data-testid="input-smtp-from"
            />
            <p className="text-sm font-medium px-3 py-2 bg-[var(--primary-light-hex)]/20 rounded-lg border border-[var(--primary-hex)]/20 flex items-center gap-2">
              <Info className="h-4 w-4 text-[var(--primary-hex)]" />
              {t(
                "admin.settings.smtp.fromEmailHelp",
                "This email will appear as the sender when sending OTP or notifications."
              )}
            </p>
          </div>

          {/* SMTP Password */}
          <div className="space-y-3">
            <Label
              htmlFor="smtp-pass"
              className="text-lg font-semibold flex items-center gap-2"
            >
              <div className="h-2 w-2 rounded-full bg-[var(--primary-hex)]"></div>
              {t("admin.settings.smtp.password", "SMTP Password")}
            </Label>
            <Input
              id="smtp-pass"
              type="password"
              value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)}
              placeholder={t(
                "admin.settings.smtp.passwordPlaceholder",
                "Your app password"
              )}
              className="h-12 ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)] transition-all duration-300"
              data-testid="input-smtp-pass"
            />
            <p className="text-sm font-medium px-3 py-2 bg-[var(--primary-light-hex)]/20 rounded-lg border border-[var(--primary-hex)]/20 flex items-center gap-2">
              <Shield className="h-4 w-4 text-[var(--primary-hex)]" />
              {t(
                "admin.settings.smtp.passwordHelp",
                "For Gmail, use an App Password. For other providers, use your SMTP password."
              )}
            </p>
          </div>

          <Button
            onClick={handleSaveSmtp}
            disabled={updateSettingMutation.isPending}
            className="gap-2 h-12 px-8 text-lg bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] hover:from-[var(--primary-dark-hex)] hover:to-[var(--primary-hex)] shadow-lg hover:shadow-glow transition-all duration-300"
            data-testid="button-save-smtp"
          >
            {updateSettingMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("admin.settings.smtp.saving", "Saving...")}
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {t(
                  "admin.settings.smtp.saveSmtpSettings",
                  "Save SMTP Settings"
                )}
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
                {t("admin.settings.smtp.securityNote", "Security Note")}
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                {t(
                  "admin.settings.smtp.securityNoteDescription",
                  "SMTP credentials are stored securely. In development mode, emails are logged to console instead of being sent."
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Setup Guide Card */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent border border-[var(--primary-hex)]/20">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-[var(--primary-hex)] flex items-center gap-2">
            <CheckCircle className="h-6 w-6" />
            {t("admin.settings.smtp.quickSetupGuide", "Quick Setup Guide")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-[var(--primary-hex)] text-black flex items-center justify-center font-bold shadow-md flex-shrink-0">
                1
              </div>
              <div>
                <h5 className="font-semibold text-foreground mb-1">
                  Gmail Setup
                </h5>
                <p className="text-sm text-muted-foreground">
                  Host:{" "}
                  <code className="bg-muted px-2 py-0.5 rounded">
                    smtp.gmail.com
                  </code>{" "}
                  | Port:{" "}
                  <code className="bg-muted px-2 py-0.5 rounded">587</code>
                  <br />
                  Enable 2FA and create an App Password at{" "}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--primary-hex)] hover:underline"
                  >
                    myaccount.google.com/apppasswords
                  </a>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-[var(--primary-hex)] text-black flex items-center justify-center font-bold shadow-md flex-shrink-0">
                2
              </div>
              <div>
                <h5 className="font-semibold text-foreground mb-1">
                  Outlook/Office 365
                </h5>
                <p className="text-sm text-muted-foreground">
                  Host:{" "}
                  <code className="bg-muted px-2 py-0.5 rounded">
                    smtp-mail.outlook.com
                  </code>{" "}
                  | Port:{" "}
                  <code className="bg-muted px-2 py-0.5 rounded">587</code>
                  <br />
                  Use your Outlook email and password
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-[var(--primary-hex)] text-black flex items-center justify-center font-bold shadow-md flex-shrink-0">
                3
              </div>
              <div>
                <h5 className="font-semibold text-foreground mb-1">
                  Custom SMTP
                </h5>
                <p className="text-sm text-muted-foreground">
                  Contact your email provider for SMTP server details (host,
                  port, credentials)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
