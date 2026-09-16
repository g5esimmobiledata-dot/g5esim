import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { SettingsResponse } from '@/types/types';
import { Save, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

export function HomepagePopupSettings() {
  const { toast } = useToast();
  const {t} = useTranslation()
  const [enabled, setEnabled] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [text, setText] = useState('');

  const { data: settingsResponse } = useQuery<SettingsResponse>({
    queryKey: ['/api/admin/settings'],
  });

  const settings = useMemo(() => {
    if (!settingsResponse) return {};
    return settingsResponse.reduce((acc: Record<string, string>, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
  }, [settingsResponse]);

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setEnabled(settings.homepage_popup_enabled === 'true');
      setImageUrl(settings.homepage_popup_image || null);
      setCode(settings.homepage_popup_code || '');
      setText(settings.homepage_popup_text || '');
    }
  }, [settings]);

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
      return await apiRequest('PUT', `/api/admin/settings/${key}`, { value, category });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({ title: 'Success', description: 'Settings updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings',
        variant: 'destructive',
      });
    },
  });

  const saveSetting = async (key: string, value: string, category: string = 'general') => {
    await updateSettingMutation.mutateAsync({ key, value, category });
  };

  const handleSave = async () => {
    try {
      await saveSetting('homepage_popup_enabled', enabled ? 'true' : 'false', 'general');
      await saveSetting('homepage_popup_code', code, 'general');
      await saveSetting('homepage_popup_text', text, 'general');
      if (imageUrl) {
        await saveSetting('homepage_popup_image', imageUrl, 'general');
      }
    } catch (e) {
      // error is handled in mutation
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiRequest('POST', '/api/upload', formData);
    if (!res.ok) throw new Error('Image upload failed');
    const data = await res.json();
    return data?.data?.fileUrl || data?.fileUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const path = await uploadImage(file);
      setImageUrl(path);
      toast({ title: 'Success', description: 'Image uploaded successfully' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' });
    }
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="space-y-2 p-4 sm:p-6">
        <CardTitle className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent leading-tight">
          {t('adminPanel.admin.settings.popup.title', 'Homepage Popup Settings')}
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          {t(
            'adminPanel.admin.settings.popup.description',
            'Manage the promotional popup shown on the homepage',
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 flex flex-col items-start w-full">
        <div className="flex items-center justify-between p-4 border rounded-xl w-full">
          <div>
            <Label className="text-lg font-bold">
              {' '}
              {t('adminPanel.admin.settings.popup.enable', 'Enable Popup')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {' '}
              {t(
                'adminPanel.admin.settings.popup.enableDescription',
                'Turn the homepage popup on or off',
              )}
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-4 p-6 border rounded-xl w-full">
          <Label className="text-lg font-bold flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {t('adminPanel.admin.settings.popup.image', 'Popup Image')}
          </Label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {imageUrl ? (
              <div className="h-32 w-48 rounded-xl border border-primary/20 flex items-center justify-center overflow-hidden bg-muted">
                <img src={imageUrl} alt="Popup" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="h-32 w-48 rounded-xl flex items-center justify-center border-2 border-dashed bg-muted">
                <span className="text-sm text-muted-foreground">
                  {t('adminPanel.admin.settings.popup.noImage', 'No image')}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="max-w-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  'adminPanel.admin.settings.popup.imageHelp',
                  'Recommended ratio 3:4. The image will be displayed on the homepage popup.',
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6 border rounded-xl w-full">
          <div className="flex flex-col space-y-2">
            <Label className="text-lg font-bold">
              {' '}
              {t('adminPanel.admin.settings.popup.text', 'Popup Text')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t(
                'adminPanel.admin.settings.popup.textDescription',
                'Optional text to display on the popup below the image.',
              )}
            </p>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t(
                'adminPanel.admin.settings.popup.textPlaceholder',
                'e.g. Get 20% off your next eSIM!',
              )}
              className="max-w-md"
            />
          </div>

          <div className="flex flex-col space-y-2 mt-4">
            <Label className="text-lg font-bold">
              {t('adminPanel.admin.settings.popup.code', 'Optional Promo Code')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {' '}
              {t(
                'adminPanel.admin.settings.popup.codeDescription',
                'A promo code users can copy from the popup. Leave empty if no code is attached.',
              )}
            </p>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('adminPanel.admin.settings.popup.codePlaceholder', 'e.g. SUMMER2024')}
              className="max-w-sm"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          className="w-full sm:w-auto"
          disabled={updateSettingMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {t('adminPanel.admin.settings.popup.save', 'Save Popup Settings')}
        </Button>
      </CardContent>
    </Card>
  );
}
