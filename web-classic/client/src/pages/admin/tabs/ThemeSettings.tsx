// components/admin/tabs/ThemeSettings.tsx - Fixed Import and API Integration
import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  Palette,
  Loader2,
  RefreshCw,
  Download,
  Sparkles,
  Eye,
  Check,
  Type,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/TranslationContext';
import { useTheme, availableFonts } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ChromePicker } from 'react-color';

export function ThemeSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [showPickers, setShowPickers] = useState({
    primary: false,
    primarySecond: false,
    primaryLight: false,
    primaryDark: false,
  });

  const { colors, fonts, updateColor, updateFont } = useTheme();

  /* ---------------- Fetch Settings ---------------- */
  const { data: settingsResponse } = useQuery({
    queryKey: ['/api/admin/settings'],
  });

  /* ---------------- Normalize Settings ---------------- */
  const settings = useMemo(() => {
    if (!settingsResponse) return {};
    return settingsResponse.reduce((acc: Record<string, string>, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
  }, [settingsResponse]);

  /* ---------------- Load From API ---------------- */
  useEffect(() => {
    if (!settings || Object.keys(settings).length === 0) return;

    updateColor('primary', settings.theme_primary || colors.primary);
    updateColor('primarySecond', settings.theme_primary_second || colors.primarySecond);
    updateColor('primaryLight', settings.theme_primary_light || colors.primaryLight);
    updateColor('primaryDark', settings.theme_primary_dark || colors.primaryDark);
    if (settings.theme_primary) updateColor('primary', settings.theme_primary);
    if (settings.theme_primary_second) updateColor('primarySecond', settings.theme_primary_second);
    if (settings.theme_primary_light) updateColor('primaryLight', settings.theme_primary_light);
    if (settings.theme_primary_dark) updateColor('primaryDark', settings.theme_primary_dark);

    updateFont('primary', settings.theme_font_primary || fonts.primary);
    updateFont('secondary', settings.theme_font_secondary || fonts.secondary);
    if (settings.theme_font_heading) updateFont('heading', settings.theme_font_heading);
    if (settings.theme_font_body) updateFont('body', settings.theme_font_body);
  }, [settings]);

  /* ---------------- Save Mutation ---------------- */
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return apiRequest('PUT', `/api/admin/settings/${key}`, {
        value,
        category: 'theme',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/settings'] });
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /* ---------------- Load From API ---------------- */
  const handleLoadFromAPI = async () => {
    setIsLoading(true);
    try {
      if (!settings || Object.keys(settings).length === 0) return;

      updateColor('primary', settings.theme_primary);
      updateColor('primarySecond', settings.theme_primary_second);
      updateColor('primaryLight', settings.theme_primary_light);
      updateColor('primaryDark', settings.theme_primary_dark);

      updateFont('heading', settings.theme_font_heading);
      updateFont('body', settings.theme_font_body);

      toast({
        title: 'Success',
        description: 'Theme loaded from server',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load theme',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------------- Reset ---------------- */
  const handleReset = () => {
    updateColor('primary', '#14b8a6');
    updateColor('primarySecond', '#0d9488');
    updateColor('primaryLight', '#2dd4bf');
    updateColor('primaryDark', '#0f766e');

    updateFont('heading', 'Inter');
    updateFont('body', 'Inter');

    toast({
      title: 'Reset Complete',
      description: 'Theme reset to defaults',
    });
  };

  const colorKeys = [
{
 key:"primary",
 label:t("adminPanel.admin.settings.theme.primaryColor","Primary Color"),
 description:t(
   "adminPanel.admin.settings.theme.primaryColorDesc",
   "Main brand color used throughout the application"
 ),
 icon:"🎨"
},
{
 key:"primarySecond",
 label:t("adminPanel.admin.settings.theme.secondaryColor","Secondary Color"),
 description:t(
   "adminPanel.admin.settings.theme.secondaryColorDesc",
   "Complementary color for gradients and accents"
 ),
 icon:"✨"
},
{
 key:"primaryLight",
 label:t("adminPanel.admin.settings.theme.lightVariant","Light Variant"),
 description:t(
   "adminPanel.admin.settings.theme.lightVariantDesc",
   "Lighter shade for backgrounds and hover states"
 ),
 icon:"☀️"
},
{
 key:"primaryDark",
 label:t("adminPanel.admin.settings.theme.darkVariant","Dark Variant"),
 description:t(
   "adminPanel.admin.settings.theme.darkVariantDesc",
   "Darker shade for text and borders"
 ),
 icon:"🌙"
}
]

  const handleSaveToAPI = async () => {
    setIsSaving(true);
    try {
      await updateSettingMutation.mutateAsync({
        key: 'theme_primary',
        value: colors.primary,
      });
      await updateSettingMutation.mutateAsync({
        key: 'theme_primary_second',
        value: colors.primarySecond,
      });
      await updateSettingMutation.mutateAsync({
        key: 'theme_primary_light',
        value: colors.primaryLight,
      });
      await updateSettingMutation.mutateAsync({
        key: 'theme_primary_dark',
        value: colors.primaryDark,
      });

      await updateSettingMutation.mutateAsync({
        key: 'theme_font_heading',
        value: fonts.heading,
      });
      await updateSettingMutation.mutateAsync({
        key: 'theme_font_body',
        value: fonts.body,
      });

      toast({
        title: 'Success',
        description: 'Theme saved successfully',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save theme',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      <Card className="border shadow-xl bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent border-[var(--primary-hex)]/20">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            {/* Icon Container: Slightly smaller on mobile to save vertical space */}
            <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-gradient-to-br from-[var(--primary-hex)] to-[var(--primary-second-hex)] flex items-center justify-center shadow-lg">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
            </div>

            <div className="space-y-1">
              {/* Title: Scaled text-lg for mobile to keep the preview focus on the content */}
              <CardTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] bg-clip-text text-transparent">
               {t("adminPanel.admin.settings.theme.livePreview","Live Preview")}
              </CardTitle>

              {/* Description: text-xs/sm to avoid pushing the actual preview too far down the screen */}
              <CardDescription className="text-xs sm:text-sm md:text-base text-[var(--primary-hex)]/70">
               {t("adminPanel.admin.settings.theme.previewDescription",
"See how your color scheme looks across different components")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-4 sm:px-6">
          {/* Preview Buttons */}
          {/* Added flex-col for mobile, sm:flex-row for desktop */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start gap-3">
            <button
              className="w-full sm:w-auto h-12 px-6 rounded-lg font-semibold shadow-lg hover:shadow-glow transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primarySecond})`,
                color: 'black',
              }}
            >
              Primary Button
            </button>
            <button
              className="w-full sm:w-auto h-12 px-6 rounded-lg font-semibold border-2 hover:shadow-md transition-all duration-300"
              style={{
                borderColor: colors.primary,
                color: colors.primary,
              }}
            >
              Outline Button
            </button>
            <Badge
              className="h-8 px-4 text-sm font-semibold shadow-md inline-flex"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primarySecond})`,
                color: 'black',
              }}
            >
              <Check className="h-3 w-3 mr-1" />
              Active Badge
            </Badge>
          </div>

          {/* Typography Preview */}
          <div className="p-4 sm:p-6 bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent border border-[var(--primary-hex)]/20 rounded-xl">
            {/* Responsive text size: text-2xl on mobile, text-3xl on desktop */}
            <h1 style={{ fontFamily: fonts.heading }} className="text-2xl sm:text-3xl font-bold mb-2 break-words">
              Heading Preview
            </h1>
            <p style={{ fontFamily: fonts.body }} className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Body text preview with current font selection
            </p>
          </div>
        </CardContent>

      </Card>

      {/* Color Customization Card */}
      <Card className="border-0 shadow-xl hover:shadow-[0_25px_50px_-12px_color-mix(in_srgb,var(--primary-hex)_30%,transparent)] transition-all duration-500 overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          {/* Stack icon and text on very small screens, row on sm+ */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-[var(--primary-hex)] to-[var(--primary-second-hex)] flex items-center justify-center shadow-lg">
              <Palette className="h-6 w-6 text-black" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] bg-clip-text text-transparent leading-tight">
                {t("adminPanel.admin.settings.theme.colorTitle","Color Customization")}
              </CardTitle>
              <CardDescription className="text-sm sm:text-lg text-[var(--primary-hex)]/70">
                {t("adminPanel.admin.settings.theme.colorDescription",
"Customize your platform's color scheme")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-8 space-y-6 sm:space-y-8">
          {/* Color Pickers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {colorKeys.map(({ key, label, description, icon }) => (
              <Card
                key={key}
                className="bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent border border-[var(--primary-hex)]/20 hover:border-[var(--primary-hex)]/40 transition-all duration-300"
              >
                <CardContent className="pt-6 p-4 sm:p-6 space-y-4">
                  {/* Header of Item: Label & Picker */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-2xl sm:text-3xl shrink-0">{icon}</div>
                      <div className="truncate">
                        <Label className="text-base sm:text-lg font-bold text-foreground block truncate">{label}</Label>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-1">{description}</p>
                      </div>
                    </div>

                    <Popover
                      open={showPickers[key]}
                      onOpenChange={(open) => setShowPickers((prev) => ({ ...prev, [key]: open }))}
                    >
                      <PopoverTrigger asChild>
                        <button
                          className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl border-2 border-[var(--primary-hex)]/30 shadow-lg transition-all active:scale-95 cursor-pointer relative"
                          style={{ backgroundColor: colors[key] }}
                        >
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center rounded-xl">
                            <Palette className="h-4 w-4 text-white/80" />
                          </div>
                        </button>
                      </PopoverTrigger>
                      {/* Ensure the picker doesn't go off-screen on mobile */}
                      <PopoverContent side="bottom" align="end" className="w-[250px] sm:w-auto p-0 border-0 shadow-2xl">
                        <ChromePicker
                          width="100%"
                          color={colors[key]}
                          onChange={(color) => updateColor(key, color.hex)}
                          disableAlpha
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`input-${key}`} className="text-xs sm:text-sm font-semibold">
                      Hex Code
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`input-${key}`}
                        value={colors[key]}
                        onChange={(e) => updateColor(key, e.target.value)}
                        className="font-mono uppercase ring-2 ring-[var(--primary-hex)]/10 focus:ring-[var(--primary-hex)] h-10 text-sm"
                        maxLength={7}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => setShowPickers((prev) => ({ ...prev, [key]: !prev[key] }))}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Color Preview Bar */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Preview</Label>
                    <div
                      className="h-2.5 rounded-full shadow-inner"
                      style={{
                        background: `linear-gradient(90deg, ${colors[key]} 0%, ${colors[key]}dd 100%)`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>


      {/* Font Selection Card */}
      <Card className="border-0 shadow-xl hover:shadow-[0_25px_50px_-12px_color-mix(in_srgb,var(--primary-hex)_30%,transparent)] transition-all duration-500">
        <CardHeader className="p-5 sm:p-6"> {/* Reduced padding for mobile */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Icon size adjusted for mobile flow */}
            <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-gradient-to-br from-[var(--primary-hex)] to-[var(--primary-second-hex)] flex items-center justify-center shadow-lg">
              <Type className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] bg-clip-text text-transparent">
               {t("adminPanel.admin.settings.theme.typographyTitle","Typography Settings")}
              </CardTitle>
              <CardDescription className="text-base sm:text-lg text-[var(--primary-hex)]/70">
                {t("adminPanel.admin.settings.theme.typographyDescription",
"Choose fonts for headings and body text")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-8 pt-0 sm:pt-0 space-y-8"> {/* Responsive padding */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-6">

            {/* Heading Font Section */}
            <div className="space-y-4">
              <Label className="text-base sm:text-lg font-semibold">Heading Font</Label>
              <Select value={fonts.heading} onValueChange={(value) => updateFont('heading', value)}>
                <SelectTrigger className="h-11 sm:h-12 ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableFonts.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm sm:text-base" style={{ fontFamily: font.value }}>{font.label}</span>
                        <Badge variant="outline" className="text-[10px] sm:text-xs bg-[var(--primary-light-hex)]/20">
                          {font.category}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Preview box: Adjusted text sizes for narrow viewports */}
              <div className="p-4 sm:p-6 bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent border border-[var(--primary-hex)]/20 rounded-xl">
                <h1 style={{ fontFamily: fonts.heading }} className="text-2xl sm:text-3xl font-bold mb-2 break-words">
                  Sample Heading
                </h1>
                <h2 style={{ fontFamily: fonts.heading }} className="text-xl sm:text-2xl font-semibold mb-2">
                  Subheading
                </h2>
                <h3 style={{ fontFamily: fonts.heading }} className="text-lg sm:text-xl font-medium">
                  Smaller Heading
                </h3>
              </div>
            </div>

            {/* Body Font Section */}
            <div className="space-y-4">
              <Label className="text-base sm:text-lg font-semibold">Body Font</Label>
              <Select value={fonts.body} onValueChange={(value) => updateFont('body', value)}>
                <SelectTrigger className="h-11 sm:h-12 ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableFonts.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm sm:text-base" style={{ fontFamily: font.value }}>{font.label}</span>
                        <Badge variant="outline" className="text-[10px] sm:text-xs bg-[var(--primary-light-hex)]/20">
                          {font.category}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="p-4 sm:p-6 bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent border border-[var(--primary-hex)]/20 rounded-xl">
                <p style={{ fontFamily: fonts.body }} className="text-sm sm:text-base mb-3 leading-relaxed">
                  The quick brown fox jumps over the lazy dog. Sample paragraph text.
                </p>
                <p style={{ fontFamily: fonts.body }} className="text-xs sm:text-sm text-muted-foreground">
                  Caption and description example.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full">
        <Button
          onClick={handleSaveToAPI}
          disabled={isSaving}
          className="w-full sm:w-auto gap-2 h-12 px-4 sm:px-6 bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] hover:from-[var(--primary-dark-hex)] hover:to-[var(--primary-hex)] shadow-lg hover:shadow-glow transition-all duration-300"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
             {t("adminPanel.admin.settings.theme.saving","Saving...")}
            </>
          ) : (
            <>
              <Save className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">{t("adminPanel.admin.settings.theme.saveTheme","Save Theme")}</span>
              <span className="hidden xs:inline">(Colors + Fonts)</span>
            </>
          )}
        </Button>

        <Button
          onClick={handleLoadFromAPI}
          disabled={isLoading}
          variant="outline"
          className="w-full sm:w-auto gap-2 h-12 px-4 sm:px-6 border-[var(--primary-hex)] text-[var(--primary-hex)] hover:bg-[var(--primary-hex)] hover:text-black transition-all duration-300"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin dark:text-white" />
              {t("adminPanel.admin.settings.theme.loading","Loading...")}
            </>
          ) : (
            <>
              <Download className="h-5 w-5 shrink-0" />
              {t("adminPanel.admin.settings.theme.loadServer","Load from Server")}
            </>
          )}
        </Button>

        <Button
          onClick={handleReset}
          variant="outline"
          className="w-full sm:w-auto gap-2 h-12 px-4 sm:px-6 hover:bg-destructive hover:text-destructive-foreground transition-all duration-300"
        >
          <RefreshCw className="h-5 w-5 shrink-0" />
         {t("adminPanel.admin.settings.theme.reset","Reset to Defaults")}
        </Button>
      </div>


      {/* Info Card */}
      <Card className="border-0 bg-gradient-to-br from-blue-50 via-blue-100/50 to-transparent dark:from-blue-950/30 dark:via-blue-900/20 dark:to-transparent shadow-xl border-l-4 border-l-blue-500">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold mb-2 text-blue-900 dark:text-blue-100">
                {t("adminPanel.admin.settings.theme.tipsTitle","Theme Tips")}
              </h4>
             <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
  <li>{t("adminPanel.admin.settings.theme.tip1","Changes apply instantly across the entire platform")}</li>

  <li>{t("adminPanel.admin.settings.theme.tip2","Save to server to persist colors and fonts together")}</li>

  <li>{t("adminPanel.admin.settings.theme.tip3","Use contrasting colors for better accessibility")}</li>

  <li>{t("adminPanel.admin.settings.theme.tip4","Test font combinations in both light and dark modes")}</li>

  <li>{t("adminPanel.admin.settings.theme.tip5","Google Fonts load automatically when selected")}</li>
</ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
