import React, { useState, useEffect, useMemo } from "react";
import {
  Save,
  Loader2,
  Shield,
  AlertCircle,
  CheckCircle,
  Flame,
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

export function FirebaseSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // 🔹 State (Shared)
  const [projectId, setProjectId] = useState("");

  // 🔹 State (Client)
  const [apiKey, setApiKey] = useState("");
  const [authDomain, setAuthDomain] = useState("");
  const [storageBucket, setStorageBucket] = useState("");
  const [messagingSenderId, setMessagingSenderId] = useState("");
  const [appId, setAppId] = useState("");
  const [measurementId, setMeasurementId] = useState("");

  // 🔹 State (Admin SDK)
  const [clientEmail, setClientEmail] = useState("");
  const [privateKey, setPrivateKey] = useState("");

  // 🔹 Fetch settings
  const { data: settingsResponse } = useQuery({
    queryKey: ["/api/admin/settings"],
  });

  // 🔹 Convert array → object
  const settings = useMemo(() => {
    if (!settingsResponse) return {};

    return settingsResponse.reduce(
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
      setApiKey(settings.firebase_api_key || "");
      setAuthDomain(settings.firebase_auth_domain || "");
      setProjectId(settings.firebase_project_id || "");
      setStorageBucket(settings.firebase_storage_bucket || "");
      setMessagingSenderId(settings.firebase_messaging_sender_id || "");
      setAppId(settings.firebase_app_id || "");
      setMeasurementId(settings.firebase_measurement_id || "");
      setClientEmail(settings.firebase_client_email || "");
      setPrivateKey(settings.firebase_private_key || "");
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
        description: "Firebase settings updated successfully",
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
      category: "firebase",
    });
  };

  const handleSaveFirebase = async () => {
    await saveSetting("firebase_api_key", apiKey);
    await saveSetting("firebase_auth_domain", authDomain);
    await saveSetting("firebase_project_id", projectId);
    await saveSetting("firebase_storage_bucket", storageBucket);
    await saveSetting(
      "firebase_messaging_sender_id",
      messagingSenderId
    );
    await saveSetting("firebase_app_id", appId);
    await saveSetting("firebase_measurement_id", measurementId);
    await saveSetting("firebase_client_email", clientEmail);
    await saveSetting("firebase_private_key", privateKey);
  };

  return (
    <div className="space-y-6">
      {/* Firebase Config Card */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Firebase Icon Container */}
            <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-gradient-to-br from-[var(--primary-hex)] to-[var(--primary-second-hex)] flex items-center justify-center shadow-lg">
              <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
            </div>

            <div className="space-y-1">
              {/* Title with responsive text sizing */}
              <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] bg-clip-text text-transparent">
                {t("adminPanel.admin.settings.firebase.title", "Firebase Configuration")}
              </CardTitle>

              {/* Description with responsive text sizing */}
              <CardDescription className="text-sm sm:text-base md:text-lg text-[var(--primary-hex)]/70">
                {t(
                  "adminPanel.admin.settings.firebase.description",
                  "Configure Firebase credentials for Authentication, FCM, and Storage."
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>


        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <h3 className="font-semibold text-lg border-b pb-2">{t("adminPanel.admin.settings.firebase.clientSettings", "Client App Settings")}</h3>
              {/* API Key */}
              <Field
                label={t("adminPanel.admin.settings.firebase.apiKey", "Firebase API Key")}
                value={apiKey}
                onChange={setApiKey}
                placeholder="AIzaSyXXXX"
              />

              <Field
                label={t("adminPanel.admin.settings.firebase.authDomain", "Auth Domain")}
                value={authDomain}
                onChange={setAuthDomain}
                placeholder="project.firebaseapp.com"
              />

              <Field
                label={t("adminPanel.admin.settings.firebase.projectId","Project ID")}
                value={projectId}
                onChange={setProjectId}
                placeholder="my-project-id"
              />

              <Field
                label={t("adminPanel.admin.settings.firebase.storageBucket","Storage Bucket")}
                value={storageBucket}
                onChange={setStorageBucket}
                placeholder="project.appspot.com"
              />

              <Field
                label={t("adminPanel.admin.settings.firebase.messagingSenderId","Messaging Sender ID")}
                value={messagingSenderId}
                onChange={setMessagingSenderId}
                placeholder="123456789"
              />

              <Field
                label={t("adminPanel.admin.settings.firebase.appId","App ID")}
                value={appId}
                onChange={setAppId}
                placeholder="1:123:web:abc"
              />

              <Field
                label={t("adminPanel.admin.settings.firebase.measurementId","Measurement ID")}
                value={measurementId}
                onChange={setMeasurementId}
                placeholder="G-XXXX"
              />
            </div>

            <div className="space-y-6">
              <h3 className="font-semibold text-lg border-b pb-2">{t("adminPanel.admin.settings.firebase.adminSettings", "Admin SDK (Server) Settings")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("adminPanel.admin.settings.firebase.adminDescription", " Required for Google Login verification and Push Notifications.Get these from your service account JSON file.")}
               
              </p>

              <Field
                label={t("adminPanel.admin.settings.firebase.clientEmail","Client Email")}
                value={clientEmail}
                onChange={setClientEmail}
                placeholder="firebase-adminsdk-xxxxx@project.iam.gserviceaccount.com"
              />

              <div className="space-y-2">
                <Label>{t("adminPanel.admin.settings.firebase.privateKey", "Private Key")}</Label>
                <Textarea
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                  className="font-mono text-xs h-64"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            {/* Save Button */}
            <Button
              onClick={handleSaveFirebase}
              disabled={updateSettingMutation.isPending}
              className="gap-2"
            >
              {updateSettingMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("adminPanel.admin.settings.firebase.saving", "Saving...")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t("adminPanel.admin.settings.firebase.save", "Save Firebase Settings")}
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
            {t("adminPanel.admin.settings.firebase.securityNote", "Firebase credentials are securely stored and used for authentication and push notifications.")}
            
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// 🔹 Reusable Field Component
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
