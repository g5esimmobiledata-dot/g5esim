// import React, { useState, useEffect, useMemo } from "react";
// import {
//   Save,
//   Loader2,
//   Shield,
// } from "lucide-react";

// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";

// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";
// import { Switch } from "@/components/ui/switch";

// import { useToast } from "@/hooks/use-toast";
// import { useQuery, useMutation } from "@tanstack/react-query";
// import { apiRequest, queryClient } from "@/lib/queryClient";

// export function ReCaptchaSettings() {
//   const { toast } = useToast();

//   /* ---------------- STATE ---------------- */
//   const [siteKey, setSiteKey] = useState("");
//   const [secretKey, setSecretKey] = useState("");
//   const [enabled, setEnabled] = useState(false);

//   /* ---------------- FETCH SETTINGS ---------------- */
//   const { data: settingsResponse } = useQuery({
//     queryKey: ["/api/admin/settings"],
//   });

//   /* ---------------- ARRAY → OBJECT ---------------- */
//   const settings = useMemo(() => {
//     if (!settingsResponse) return {};

//     return settingsResponse.reduce(
//       (acc: Record<string, string>, setting: any) => {
//         acc[setting.key] = setting.value;
//         return acc;
//       },
//       {}
//     );
//   }, [settingsResponse]);

//   /* ---------------- LOAD INTO STATE ---------------- */
//   useEffect(() => {
//     if (settings) {
//       setSiteKey(settings.recaptcha_site_key || "");
//       setSecretKey(settings.recaptcha_secret_key || "");
//       setEnabled(settings.recaptcha_enabled === "true");
//     }
//   }, [settings]);

//   /* ---------------- MUTATION ---------------- */
//   const updateSettingMutation = useMutation({
//     mutationFn: async ({
//       key,
//       value,
//       category,
//     }: {
//       key: string;
//       value: string;
//       category: string;
//     }) => {
//       return await apiRequest("PUT", `/api/admin/settings/${key}`, {
//         value,
//         category,
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: ["/api/admin/settings"],
//       });

//       toast({
//         title: "Success",
//         description: "reCAPTCHA settings updated successfully",
//       });
//     },
//     onError: (error: any) => {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to update settings",
//         variant: "destructive",
//       });
//     },
//   });

//   const saveSetting = async (key: string, value: string) => {
//     await updateSettingMutation.mutateAsync({
//       key,
//       value,
//       category: "security",
//     });
//   };

//   /* ---------------- SAVE HANDLER ---------------- */
//   const handleSave = async () => {
//     await saveSetting("recaptcha_site_key", siteKey);
//     await saveSetting("recaptcha_secret_key", secretKey);
//     await saveSetting("recaptcha_enabled", String(enabled));
//   };

//   /* ---------------- UI ---------------- */
//   return (
//     <div className="space-y-6">

//       {/* Config Card */}
//       <Card className="border-0 shadow-xl">
//         <CardHeader>
//           <CardTitle className="text-2xl font-bold">
//             reCAPTCHA Configuration
//           </CardTitle>
//           <CardDescription>
//             Configure Google reCAPTCHA credentials for bot protection.
//           </CardDescription>
//         </CardHeader>

//         <CardContent className="space-y-6">

//           {/* Enable Toggle */}
//           <div className="flex items-center justify-between">
//             <div>
//               <Label>Enable reCAPTCHA</Label>
//               <p className="text-xs text-muted-foreground">
//                 Protect login & signup from bots
//               </p>
//             </div>

//             <Switch
//               checked={enabled}
//               onCheckedChange={setEnabled}
//             />
//           </div>

//           {/* Site Key */}
//           <Field
//             label="Site Key"
//             value={siteKey}
//             onChange={setSiteKey}
//             placeholder="6LcXXXXXXXXXXXX"
//           />

//           {/* Secret Key */}
//           <Field
//             label="Secret Key"
//             value={secretKey}
//             onChange={setSecretKey}
//             placeholder="6LcXXXXXXXXXXXX"
//             type="password"
//           />

//           {/* Save Button */}
//           <Button
//             onClick={handleSave}
//             disabled={updateSettingMutation.isPending}
//             className="gap-2"
//           >
//             {updateSettingMutation.isPending ? (
//               <>
//                 <Loader2 className="h-4 w-4 animate-spin" />
//                 Saving...
//               </>
//             ) : (
//               <>
//                 <Save className="h-4 w-4" />
//                 Save reCAPTCHA Settings
//               </>
//             )}
//           </Button>
//         </CardContent>
//       </Card>

//       {/* Security Note */}
//       <Card className="border-l-4 border-amber-500 bg-amber-50">
//         <CardContent className="pt-6 flex gap-4">
//           <Shield className="h-6 w-6 text-amber-600" />
//           <p className="text-sm text-amber-800">
//             reCAPTCHA secret keys are securely stored and used only
//             for server-side verification.
//           </p>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

// /* ---------------- REUSABLE FIELD ---------------- */
// function Field({
//   label,
//   value,
//   onChange,
//   placeholder,
//   type = "text",
// }: any) {
//   return (
//     <div className="space-y-2">
//       <Label>{label}</Label>
//       <Input
//         type={type}
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         placeholder={placeholder}
//       />
//     </div>
//   );
// }






import React, { useState, useEffect, useMemo } from "react";
import {
  Save,
  Loader2,
  Shield,
  Pencil,
  Eye,
  EyeOff,
  ShieldCheck,
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

import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/contexts/TranslationContext";

export function ReCaptchaSettings() {
  const { toast } = useToast();
  const { t } = useTranslation();

  /* ---------------- STATE ---------------- */
  const [siteKey, setSiteKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  /* ---------------- FETCH SETTINGS ---------------- */
  const { data: settingsResponse } = useQuery({
    queryKey: ["/api/admin/settings"],
  });

  /* ---------------- ARRAY → OBJECT ---------------- */
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

  /* ---------------- LOAD INTO STATE ---------------- */
  useEffect(() => {
    if (settings) {
      setSiteKey(settings.recaptcha_site_key || "");
      setSecretKey(settings.recaptcha_secret_key || "");
      setEnabled(settings.recaptcha_enabled === "true");
    }
  }, [settings]);

  /* ---------------- MUTATION ---------------- */
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
        description: "reCAPTCHA settings updated successfully",
      });

      setIsEditing(false);
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
      category: "security",
    });
  };

  /* ---------------- SAVE HANDLER ---------------- */
  const handleSave = async () => {
    await saveSetting("recaptcha_site_key", siteKey);
    await saveSetting("recaptcha_secret_key", secretKey);
    await saveSetting("recaptcha_enabled", String(enabled));
  };

  /* ---------------- CANCEL HANDLER ---------------- */
  const handleCancel = () => {
    setIsEditing(false);
    setShowSecret(false);

    setSiteKey(settings.recaptcha_site_key || "");
    setSecretKey(settings.recaptcha_secret_key || "");
    setEnabled(settings.recaptcha_enabled === "true");
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Icon Container - Matching the SMTP style */}
            <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-gradient-to-br from-[var(--primary-hex)] to-[var(--primary-second-hex)] flex items-center justify-center shadow-lg">
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
            </div>

            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] bg-clip-text text-transparent">
                {t("adminPanel.admin.settings.recaptcha.title", "reCAPTCHA Configuration")}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base md:text-lg text-[var(--primary-hex)]/70">
                {t(
                  "adminPanel.admin.settings.recaptcha.description",
                  "Configure Google reCAPTCHA credentials for bot protection."
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>


        <CardContent className="space-y-6">

          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("adminPanel.admin.settings.recaptcha.enable", "Enable reCAPTCHA")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("adminPanel.admin.settings.recaptcha.enableDescription", "Protect login & signup from bots")}
              </p>
            </div>

            <Switch
              className="
             bg-gray-200 
             dark:bg-gray-700
             data-[state=checked]:bg-blue-600 
             dark:data-[state=checked]:bg-blue-500
  "

              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={!isEditing}
            />
          </div>

          {/* Site Key */}
          <div className="space-y-2">
            <Label>{t("adminPanel.admin.settings.recaptcha.siteKey", "Site Key")}</Label>
            <Input
              value={siteKey}
              onChange={(e) => setSiteKey(e.target.value)}
              placeholder="6LcXXXXXXXXXXXX"
              disabled={!isEditing}
            />
          </div>

          {/* Secret Key with Show/Hide */}
          <div className="space-y-2">
            <Label>{t("adminPanel.admin.settings.recaptcha.secretKey", "Secret Key")}</Label>
            <div className="relative">
              <Input
                type={showSecret ? "text" : "password"}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="6LcXXXXXXXXXXXX"
                disabled={!isEditing}
                className="pr-10"
              />

              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                disabled={!isEditing}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                {t("adminPanel.admin.settings.recaptcha.edit", "Edit Settings")}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  disabled={updateSettingMutation.isPending}
                  className="gap-2"
                >
                  {updateSettingMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("adminPanel.admin.settings.recaptcha.saving", "Saving...")}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {t("adminPanel.admin.settings.recaptcha.save", "Save Changes")}
                    </>
                  )}
                </Button>

                <Button variant="ghost" onClick={handleCancel}>
                  {t("adminPanel.admin.settings.recaptcha.cancel", "Cancel")}
                </Button>
              </>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Security Note */}
      <Card className="border-l-4 border-amber-500 bg-amber-50">
        <CardContent className="pt-6 flex gap-4">
          <Shield className="h-6 w-6 text-amber-600" />
          <p className="text-sm text-amber-800">
            {t("adminPanel.admin.settings.recaptcha.securityNote", "reCAPTCHA secret keys are securely stored and used only for server-side verification.")}

          </p>
        </CardContent>
      </Card>
    </div>
  );
}