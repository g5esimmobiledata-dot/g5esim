import React, { useState, useEffect, useMemo } from "react";
import {
  Save,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Loader2,
  Info,
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
import { FaAndroid, FaAppStoreIos } from "react-icons/fa";

export function SocialMediaSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Local state
  const [website, setWebsite] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [youtube, setYoutube] = useState("");
  const [android, setAndroid] = useState("");
  const [ios, setIos] = useState("");

  // Fetch settings
  const { data: settingsResponse } = useQuery({
    queryKey: ["/api/admin/settings"],
  });

  // console.log("nsd sdfds", settingsResponse)
  // Convert array → object
  const settings = useMemo(() => {
    if (!settingsResponse) return {};
    return settingsResponse.reduce(
      (acc: Record<string, string>, s: any) => {
        acc[s.key] = s.value;
        return acc;
      },
      {}
    );
  }, [settingsResponse]);

  // console.log("sdfafasasdas", settings)

  // Load values
  useEffect(() => {
    if (!settings) return;

    setWebsite(settings.website_url || "");
    setFacebook(settings.social_facebook || "");
    setInstagram(settings.social_instagram || "");
    setTwitter(settings.social_twitter || "");
    setLinkedin(settings.social_linkedin || "");
    setYoutube(settings.social_youtube || "");
    setAndroid(settings.social_android || "");
    setIos(settings.social_ios || "");
  }, [settings]);

  // Mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({
      key,
      value,
      category,
    }: {
      key: string;
      value: string;
      category: string;
    }) =>
      apiRequest("PUT", `/api/admin/settings/${key}`, {
        value,
        category,
      }),
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
    onError: (err: any) => {
      toast({
        title: t("admin.settings.error", "Error"),
        description:
          err.message ||
          t(
            "admin.settings.failedToUpdateSettings",
            "Failed to update settings"
          ),
        variant: "destructive",
      });
    },
  });

  const save = async (key: string, value: string) =>
    updateSettingMutation.mutateAsync({
      key,
      value,
      category: "social",
    });

  const handleSave = async () => {
    await save("website_url", website);
    await save("social_facebook", facebook);
    await save("social_instagram", instagram);
    await save("social_twitter", twitter);
    await save("social_linkedin", linkedin);
    await save("social_youtube", youtube);
    await save("social_android", android);
    await save("social_ios", ios);
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl">
        <CardHeader>
          {/* Changed to flex-col for mobile, flex-row for tablet+; added items-start for better text flow */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-[var(--primary-hex)] to-[var(--primary-second-hex)] flex items-center justify-center shadow-lg">
              <Globe className="h-6 w-6 text-black" />
            </div>
            <div>
              {/* Adjusted text sizes for better mobile hierarchy */}
              <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] bg-clip-text text-transparent">
                {t("adminPanel.admin.settings.social.title", "Social Media Links")}
              </CardTitle>
              <CardDescription className="text-base sm:text-lg text-[var(--primary-hex)]/70 leading-tight">
                {t(
                  "adminPanel.admin.settings.social.description",
                  "Manage website and social media profile links"
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          {/* Website */}
          <Field
            icon={<Globe />}
            label={t("adminPanel.admin.settings.social.website","Website URL")}
            value={website}
            onChange={setWebsite}
            placeholder="https://yourdomain.com"
          />

          <Field
            icon={<Facebook />}
           label={t("adminPanel.admin.settings.social.facebook","Facebook")}
            value={facebook}
            onChange={setFacebook}
            placeholder="https://facebook.com/yourpage"
          />

          <Field
            icon={<Instagram />}
            label={t("adminPanel.admin.settings.social.instagram","Instagram")}
            value={instagram}
            onChange={setInstagram}
            placeholder="https://instagram.com/yourprofile"
          />

          <Field
            icon={<Twitter />}
              label={t("adminPanel.admin.settings.social.twitter","Twitter / X")}
            value={twitter}
            onChange={setTwitter}
            placeholder="https://x.com/yourprofile"
          />

          <Field
            icon={<Linkedin />}
            label={t("adminPanel.admin.settings.social.linkedin","LinkedIn")}
            value={linkedin}
            onChange={setLinkedin}
            placeholder="https://linkedin.com/company/yourcompany"
          />

          <Field
            icon={<Youtube />}
             label={t("adminPanel.admin.settings.social.youtube","YouTube")}
            value={youtube}
            onChange={setYoutube}
            placeholder="https://youtube.com/@yourchannel"
          />

          <Field
            icon={<FaAndroid />}
            label={t("adminPanel.admin.settings.social.android","Android App")}
            value={android}
            onChange={setAndroid}
            placeholder="https://play.google.com/store/apps/details?id=com.yourapp"
          />

          <Field
            icon={<FaAppStoreIos />}
            label={t("adminPanel.admin.settings.social.ios","iOS App")}
            value={ios}
            onChange={setIos}
            placeholder="https://apps.apple.com/app/yourapp"
          />

          <Button
            onClick={handleSave}
            disabled={updateSettingMutation.isPending}
            className="gap-2 h-12 px-8 text-lg bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] shadow-lg"
          >
            {updateSettingMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                 {t("adminPanel.admin.settings.social.saving","Saving...")}
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {t("adminPanel.admin.settings.social.save","Save Social Links")}

              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-0 bg-gradient-to-br from-blue-50 to-transparent shadow-md">
        <CardContent className="pt-6 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <p className="text-sm text-blue-800">
            {t(
  "adminPanel.admin.settings.social.info",
  "These links may be shown in the footer, contact page, or mobile app."
 )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Reusable Field ---------- */

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-lg font-semibold flex items-center gap-2">
        <span className="text-[var(--primary-hex)]">{icon}</span>
        {label}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)]"
      />
    </div>
  );
}
