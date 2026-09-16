import { useState, useEffect, useMemo } from 'react';
import {
    Save,
    Globe,
    Search,
    Image as ImageIcon,
    Twitter,
    Layout,
    Tag,
    Loader2,
    CheckCircle,
    AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/TranslationContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { SettingsResponse } from '@/types/types';

export function SEOSettings() {
    const { t } = useTranslation();
    const { toast } = useToast();

    // Internal state management
    const [defaultTitle, setDefaultTitle] = useState('');
    const [titleSuffix, setTitleSuffix] = useState('');
    const [defaultDescription, setDefaultDescription] = useState('');
    const [defaultKeywords, setDefaultKeywords] = useState('');
    const [ogImage, setOgImage] = useState<string | null>(null);
    const [twitterHandle, setTwitterHandle] = useState('');
    const [googleVerification, setGoogleVerification] = useState('');
    const [bingVerification, setBingVerification] = useState('');

    // Fetch settings from API
    const { data: settingsResponse } = useQuery<SettingsResponse>({
        queryKey: ['/api/admin/settings'],
    });

    // Transform settings array to object
    const settings = useMemo(() => {
        if (!settingsResponse) return {};
        return settingsResponse.reduce((acc: Record<string, string>, setting: any) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});
    }, [settingsResponse]);

    // Load settings into state
    useEffect(() => {
        if (settings && Object.keys(settings).length > 0) {
            setDefaultTitle(settings.seo_default_title || '');
            setTitleSuffix(settings.seo_title_suffix || '');
            setDefaultDescription(settings.seo_default_description || '');
            setDefaultKeywords(settings.seo_default_keywords || '');
            setOgImage(settings.seo_og_image || null);
            setTwitterHandle(settings.seo_twitter_handle || '');
            setGoogleVerification(settings.seo_google_verification || '');
            setBingVerification(settings.seo_bing_verification || '');
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
            return await apiRequest('PUT', `/api/admin/settings/${key}`, {
                value,
                category,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
            queryClient.invalidateQueries({ queryKey: ['/api/public/settings'] });
            toast({
                title: t('adminPanel.admin.settings.success', 'Success'),
                description: t('adminPanel.admin.settings.settingsUpdatedSuccess', 'SEO settings updated successfully'),
            });
        },
        onError: (error: any) => {
            toast({
                title: t('adminPanel.admin.settings.error', 'Error'),
                description: error.message || 'Failed to update SEO settings',
                variant: 'destructive',
            });
        },
    });

    const saveSetting = async (key: string, value: string, category: string = 'seo') => {
        await updateSettingMutation.mutateAsync({ key, value, category });
    };

    const handleSaveSEO = async () => {
        await saveSetting('seo_default_title', defaultTitle, 'seo');
        await saveSetting('seo_title_suffix', titleSuffix, 'seo');
        await saveSetting('seo_default_description', defaultDescription, 'seo');
        await saveSetting('seo_default_keywords', defaultKeywords, 'seo');
        await saveSetting('seo_twitter_handle', twitterHandle, 'seo');
        await saveSetting('seo_google_verification', googleVerification, 'seo');
        await saveSetting('seo_bing_verification', bingVerification, 'seo');
        if (ogImage) {
            await saveSetting('seo_og_image', ogImage, 'seo');
        }
    };

    const uploadImage = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('image', file);
        const res = await apiRequest('POST', '/api/upload', formData);
        if (!res.ok) throw new Error('Image upload failed');
        const data = await res.json();
        return data?.data?.fileUrl;
    };

    const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const path = await uploadImage(file);
            setOgImage(path);
            toast({ title: 'Success', description: 'OG Image uploaded successfully' });
        } catch (err) {
            console.error(err);
            toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <Card className="border-0 shadow-xl overflow-hidden hover:shadow-[0_25px_50px_-12px_color-mix(in_srgb,var(--primary-hex)_30%,transparent)] transition-all duration-500">
                <CardHeader className="bg-gradient-to-r from-[var(--primary-hex)]/10 via-transparent to-transparent">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {/* Icon Container: Matching your brand style */}
                        <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-gradient-to-br from-[var(--primary-hex)] to-[var(--primary-second-hex)] flex items-center justify-center shadow-lg">
                            <Search className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
                        </div>

                        <div className="space-y-1">
                            {/* Title: Responsive sizing matching your other cards */}
                            <CardTitle className="text-xl sm:text-2xl md:text-2xl font-bold bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] bg-clip-text text-transparent">
                                {t('adminPanel.admin.settings.seo.title', 'SEO & Meta Management')}
                            </CardTitle>

                            {/* Description: Polished typography and opacity */}
                            <CardDescription className="text-sm sm:text-base md:text-lg text-[var(--primary-hex)]/70 leading-relaxed">
                                {t(
                                    'adminPanel.admin.settings.seo.description',
                                    'Configure global search engine optimization and social sharing defaults'
                                )}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8 space-y-8">
                    {/* Main SEO Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-lg font-semibold flex items-center gap-2">
                                    <Layout className="h-5 w-5 text-[var(--primary-hex)]" />
                                   {t("adminPanel.admin.settings.seo.defaultTitle","Default Meta Title")}
                                </Label>
                                <Input
                                    value={defaultTitle}
                                    onChange={(e) => setDefaultTitle(e.target.value)}
                                    placeholder="e.g., Best Travel eSIM | Stay Connected"
                                    className="h-14 ring-2 ring-[var(--primary-hex)]/10 focus:ring-[var(--primary-hex)]"
                                />
                                <p className="text-xs text-muted-foreground italic">{t("adminPanel.admin.settings.seo.titleHelp","Recommended: 50-60 characters")}</p>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-lg font-semibold flex items-center gap-2">
                                    <Tag className="h-5 w-5 text-[var(--primary-hex)]" />
                                    {t("adminPanel.admin.settings.seo.titleSuffix","Title Suffix")}
                                </Label>
                                <Input
                                    value={titleSuffix}
                                    onChange={(e) => setTitleSuffix(e.target.value)}
                                    placeholder="e.g., | eSIM Connect"
                                    className="h-12 ring-2 ring-[var(--primary-hex)]/10 focus:ring-[var(--primary-hex)]"
                                />
                                <p className="text-xs text-muted-foreground italic">{t("adminPanel.admin.settings.seo.titleSuffixHelp","Appended to the end of all page titles")}
</p>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-lg font-semibold flex items-center gap-2">
                                    <Tag className="h-5 w-5 text-[var(--primary-hex)]" />
                                    {t("adminPanel.admin.settings.seo.defaultKeywords","Default Keywords")}
                                </Label>
                                <Textarea
                                    value={defaultKeywords}
                                    onChange={(e) => setDefaultKeywords(e.target.value)}
                                    placeholder="eSIM, travel, international data, roaming"
                                    className="ring-2 ring-[var(--primary-hex)]/10 focus:ring-[var(--primary-hex)] min-h-[100px]"
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-md md:text-lg font-semibold flex items-center gap-2">
                                    <Search className="h-5 w-5 shrink-0 text-[var(--primary-hex)]" />
                                  {t("adminPanel.admin.settings.seo.defaultDescription","Default Meta Description")}
                                </Label>
                                <Textarea
                                    value={defaultDescription}
                                    onChange={(e) => setDefaultDescription(e.target.value)}
                                    placeholder="Get instant connectivity in 200+ destinations with our travel eSIMs..."
                                    className="ring-2 ring-[var(--primary-hex)]/10 focus:ring-[var(--primary-hex)] min-h-[148px]"
                                />
                                <p className="text-xs text-muted-foreground italic">{t("adminPanel.admin.settings.seo.descriptionHelp","Recommended: 150-160 characters")}</p>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-lg font-semibold flex items-center gap-2">
                                    <Twitter className="h-5 w-5 text-[#1DA1F2]" />
                                    {t("adminPanel.admin.settings.seo.twitterHandle","Twitter Handle")}
                                </Label>
                                <Input
                                    value={twitterHandle}
                                    onChange={(e) => setTwitterHandle(e.target.value)}
                                    placeholder="@yourbrand"
                                    className="h-12 ring-2 ring-[var(--primary-hex)]/10 focus:ring-[var(--primary-hex)]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-4" />

                    {/* Verification & Social Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="p-6 bg-gradient-to-br from-[var(--primary-hex)]/5 to-transparent border border-[var(--primary-hex)]/20 rounded-2xl space-y-4">
                                <Label className="text-md md:text-lg font-bold flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5 shrink-0 text-[var(--primary-hex)]" />
                                   {t("adminPanel.admin.settings.seo.ogImage","Default Sharing Image (OG Image)")}
                                </Label>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    {ogImage ? (
                                        <div className="h-32 w-full sm:w-56 rounded-xl overflow-hidden shadow-lg border-2 border-[var(--primary-hex)]/30 flex items-center justify-center bg-muted shrink-0">
                                            <img src={ogImage} alt="OG Preview" className="h-full w-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="h-32 w-full sm:w-56 rounded-xl border-2 border-dashed border-[var(--primary-hex)]/50 flex flex-col items-center justify-center text-muted-foreground bg-muted/30 shrink-0">
                                            <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                                            <span className="text-xs">{t("adminPanel.admin.settings.seo.ogImageSize","1200x630px recommended")}</span>
                                        </div>
                                    )}

                                    <div className="w-full flex-1">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleOgImageUpload}
                                            className="h-12 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:bg-[var(--primary-hex)] file:text-white cursor-pointer"
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <Label className="text-lg font-bold flex items-center gap-2">
                                    {t("adminPanel.admin.settings.seo.verification","Search Console Verification")}
                                </Label>

                                <div className="space-y-4 p-6 border rounded-2xl bg-muted/20">
                                    <div className="space-y-2">
                                        <Label className="text-sm">{t("adminPanel.admin.settings.seo.googleVerification","Google Verification Code")}</Label>
                                        <Input
                                            value={googleVerification}
                                            onChange={(e) => setGoogleVerification(e.target.value)}
                                            placeholder="e.g., google1234abcd5678"
                                            className="h-10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">{t("adminPanel.admin.settings.seo.bingVerification","Bing Verification Code")}</Label>
                                        <Input
                                            value={bingVerification}
                                            onChange={(e) => setBingVerification(e.target.value)}
                                            placeholder="e.g., bing-123-abc"
                                            className="h-10"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-4 mt-8 pt-6 border-t">
                        <Button
                            onClick={handleSaveSEO}
                            disabled={updateSettingMutation.isPending}

                            className="w-full sm:w-auto flex flex-row items-center justify-center gap-2 h-14 px-6 sm:px-10 text-base sm:text-lg bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] hover:from-[var(--primary-dark-hex)] hover:shadow-[0_0_20px_color-mix(in_srgb,var(--primary-hex)_50%,transparent)] transition-all duration-300"
                        >
                            {updateSettingMutation.isPending ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                                    <span className="whitespace-nowrap">{ t("adminPanel.admin.settings.seo.saving","Saving SEO Settings...")}</span>
                                </>
                            ) : (
                                <>
                                    <Save className="h-5 w-5 shrink-0" />
                                    <span className="whitespace-nowrap">{t("adminPanel.admin.settings.seo.save","Save SEO Configuration")}</span>
                                </>
                            )}
                        </Button>
                    </div>


                </CardContent>
            </Card>

            {/* SEO Preview Card (Simulated Google Result) */}
            <Card className="border-0 shadow-lg bg-[#f8f9fa] dark:bg-slate-900/50">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Search className="h-5 w-5" />
                      {t("adminPanel.admin.settings.seo.serpPreview","SERP Preview")}
                    </CardTitle>
                    <CardDescription>{t("adminPanel.admin.settings.seo.serpDescription","How your site might look in Google search results")}</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="max-w-xl space-y-1">
                        <div className="text-sm text-[#202124] dark:text-slate-400 mb-1 flex items-center gap-1">
                            {window.location.origin} <span className="text-xs opacity-50">▼</span>
                        </div>
                        <div className="text-xl text-[#1a0dab] dark:text-blue-400 hover:underline cursor-pointer font-medium mb-1">
                            {defaultTitle || t("adminPanel.admin.settings.seo.previewTitle","Global Connectivity's Site")} {titleSuffix || "| Platform Name"}
                        </div>
                        <div className="text-sm text-[#4d5156] dark:text-slate-300 leading-relaxed max-w-[600px]">
                            {defaultDescription || t(
 "adminPanel.admin.settings.seo.previewDescription",
 "This is a preview of your meta description. A well-written description can improve click-through rates from search engine results pages."
)}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
