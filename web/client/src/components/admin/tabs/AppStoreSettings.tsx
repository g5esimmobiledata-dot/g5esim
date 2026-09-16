import React, { useState, useEffect, useMemo } from "react";
import {
  Save,
  Loader2,
  Shield,
  Smartphone
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
import { Textarea } from "@/components/ui/textarea";

import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/TranslationContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function AppStoreSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // 🔹 State (Apple)
  const [appleAppId, setAppleAppId] = useState("");
  const [appleBundleId, setAppleBundleId] = useState("");
  const [appleKeyId, setAppleKeyId] = useState("");
  const [appleIssuerId, setAppleIssuerId] = useState("");
  const [appleSharedSecret, setAppleSharedSecret] = useState("");
  const [applePrivateKey, setApplePrivateKey] = useState("");

  // 🔹 State (Google)
  const [androidPackageName, setAndroidPackageName] = useState("");
  const [googlePlayJson, setGooglePlayJson] = useState("");

  // 🔹 Fetch settings
  const { data: settingsResponse } = useQuery({
    queryKey: ["/api/admin/settings"],
  });

  // 🔹 Convert array → object
  const settings = useMemo(() => {
    if (!settingsResponse) return {};

    return (settingsResponse as any[]).reduce(
      (acc: Record<string, string>, setting: any) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {}
    );
  }, [settingsResponse]);

  // 🔹 Load into state
  useEffect(() => {
    if (settings) {
      setAppleAppId(settings.apple_app_id || "");
      setAppleBundleId(settings.apple_bundle_id || "");
      setAppleKeyId(settings.apple_key_id || "");
      setAppleIssuerId(settings.apple_issuer_id || "");
      setAppleSharedSecret(settings.apple_shared_secret || "");
      setApplePrivateKey(settings.apple_private_key || "");

      setAndroidPackageName(settings.android_package_name || "");
      setGooglePlayJson(settings.google_play_service_account_json || "");
    }
  }, [settings]);

  // 🔹 Mutation
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
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/settings"],
      });

      toast({
        title: "Success",
        description: "App Store settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const saveSetting = async (key: string, value: string) => {
    await updateSettingMutation.mutateAsync({
      key,
      value,
      category: "app_stores",
    });
  };

  const handleSaveSettings = async () => {
    await saveSetting("apple_app_id", appleAppId);
    await saveSetting("apple_bundle_id", appleBundleId);
    await saveSetting("apple_key_id", appleKeyId);
    await saveSetting("apple_issuer_id", appleIssuerId);
    await saveSetting("apple_shared_secret", appleSharedSecret);
    await saveSetting("apple_private_key", applePrivateKey);

    await saveSetting("android_package_name", androidPackageName);
    await saveSetting("google_play_service_account_json", googlePlayJson);
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
  
            <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-gradient-to-br from-[var(--primary-hex)] to-[var(--primary-second-hex)] flex items-center justify-center shadow-lg">
              <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
            </div>

            <div className="space-y-1">
          
              <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] bg-clip-text text-transparent">
                {t('adminPanel.admin.settings.apps.title', 'App Stores Configuration')}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base md:text-lg text-[var(--primary-hex)]/70 leading-relaxed">
                {t(
                  'adminPanel.admin.settings.apps.description',
                  'Configure credentials for Apple App Store and Google Play integration.'
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>



        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Apple Settings */}
            <div className="space-y-6">
              <h3 className="font-semibold text-lg border-b pb-2">{t("adminPanel.admin.settings.apps.appleSection", "Apple Store Settings")}
</h3>

              <Field
                label={t("adminPanel.admin.settings.apps.appId","App ID")}
                value={appleAppId}
                onChange={setAppleAppId}
                placeholder="e.g. 123456789"
              />

              <Field
                label={t("adminPanel.admin.settings.apps.bundleId","Bundle ID")}
                value={appleBundleId}
                onChange={setAppleBundleId}
                placeholder="e.g. com.example.app"
              />

              <Field
               label={t("adminPanel.admin.settings.apps.keyId","Key ID")}
                value={appleKeyId}
                onChange={setAppleKeyId}
                placeholder="e.g. ABCDEFG123"
              />

              <Field
                label={t("adminPanel.admin.settings.apps.issuerId","Issuer ID")}
                value={appleIssuerId}
                onChange={setAppleIssuerId}
                placeholder="e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />

              <Field
                label={t("adminPanel.admin.settings.apps.sharedSecret","Shared Secret")}
                value={appleSharedSecret}
                onChange={setAppleSharedSecret}
                placeholder="App-Specific Shared Secret"
              />

              <div className="space-y-2">
                <Label> {t("adminPanel.admin.settings.apps.privateKey","Private Key (.p8 contents)")}</Label>
                <Textarea
                  value={applePrivateKey}
                  onChange={(e) => setApplePrivateKey(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                  className="font-mono text-xs h-64"
                />
              </div>
            </div>

            {/* Google Play Settings */}
            <div className="space-y-6">
              <h3 className="font-semibold text-lg border-b pb-2">{t("adminPanel.admin.settings.apps.googleSection", "Google Play Settings")}</h3>

              <Field
                label={t("adminPanel.admin.settings.apps.packageName","Package Name")}
                value={androidPackageName}
                onChange={setAndroidPackageName}
                placeholder="e.g. com.example.app"
              />

              <div className="space-y-2">
                <Label> {t("adminPanel.admin.settings.apps.serviceAccountJson","Service Account JSON")}</Label>
                <Textarea
                  value={googlePlayJson}
                  onChange={(e) => setGooglePlayJson(e.target.value)}
                  placeholder='{ "type": "service_account", "project_id": "...", ... }'
                  className="font-mono text-xs h-96"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={handleSaveSettings}
              disabled={updateSettingMutation.isPending}
              className="gap-2"
            >
              {updateSettingMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                   {t("adminPanel.admin.settings.apps.saving","Saving...")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                {t("adminPanel.admin.settings.apps.save","Save App Stores Settings")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Note */}
      <Card className="border-l-4 border-amber-500 bg-amber-50">
        <CardContent className="pt-6 flex gap-4">
          <Shield className="h-6 w-6 text-amber-600" />
          <p className="text-sm text-amber-800">
            {t(
  "adminPanel.admin.settings.apps.securityNote",
  "These credentials grant access to your Google Play Console and App Store Connect accounts. Keep them secure and do not share them."
 )}
          </p>
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
}: any) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
