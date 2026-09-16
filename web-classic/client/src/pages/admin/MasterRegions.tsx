import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Globe, Search, Package, Edit2, Check, X, Image, RefreshCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useTranslation } from '@/contexts/TranslationContext';

interface Region {
  id: string;
  name: string;
  slug: string;
  airaloId: string | null;
  countries: string[] | null;
  image: string | null;
  bannerImage: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  packageCounts: {
    airalo: number;
    esimAccess: number;
    esimGo: number;
    total: number;
  };
}

const lightInputClass =
  'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500';
const lightOutlineButtonClass =
  'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';
const statCardClass = 'rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm';
const tableSwitchClass = [
  'h-7 w-14 border border-slate-300 bg-slate-200 shadow-inner',
  'data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500',
  'data-[state=unchecked]:border-slate-300 data-[state=unchecked]:bg-slate-200',
  '[&>span]:h-6 [&>span]:w-6 [&>span]:bg-white [&>span]:shadow-md [&>span]:data-[state=checked]:translate-x-7',
].join(' ');

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hashText(value: string) {
  return value.split('').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function regionCode(region: Pick<Region, 'name' | 'slug'>) {
  const source = region.name || region.slug || 'RG';
  const words = source.replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const code =
    words.length > 1
      ? words.slice(0, 2).map((word) => word[0]).join('')
      : (words[0] || 'RG').slice(0, 3);

  return code.toUpperCase();
}

function regionMediaDataUri(region: Pick<Region, 'name' | 'slug'>, type: 'icon' | 'banner') {
  const code = escapeSvgText(regionCode(region));
  const name = escapeSvgText(region.name || region.slug || 'Region');
  const hue = Math.abs(hashText(`${region.slug}-${region.name}`)) % 360;
  const hueAlt = (hue + 42) % 360;

  const svg =
    type === 'icon'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="hsl(${hue},70%,38%)"/>
              <stop offset="1" stop-color="hsl(${hueAlt},74%,48%)"/>
            </linearGradient>
          </defs>
          <rect width="160" height="160" rx="28" fill="url(#g)"/>
          <circle cx="119" cy="38" r="35" fill="rgba(255,255,255,.16)"/>
          <circle cx="80" cy="80" r="46" fill="none" stroke="rgba(255,255,255,.42)" stroke-width="8"/>
          <path d="M35 80h90M80 34c17 19 17 73 0 92M80 34c-17 19-17 73 0 92" fill="none" stroke="rgba(255,255,255,.42)" stroke-width="7" stroke-linecap="round"/>
          <text x="80" y="92" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="800" fill="white">${code}</text>
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="hsl(${hue},74%,32%)"/>
              <stop offset=".58" stop-color="hsl(${hueAlt},72%,43%)"/>
              <stop offset="1" stop-color="hsl(${(hue + 88) % 360},68%,34%)"/>
            </linearGradient>
          </defs>
          <rect width="640" height="240" rx="24" fill="url(#g)"/>
          <circle cx="550" cy="42" r="98" fill="rgba(255,255,255,.15)"/>
          <circle cx="92" cy="202" r="142" fill="rgba(255,255,255,.1)"/>
          <path d="M364 188c48-57 116-75 194-54" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="18" stroke-linecap="round"/>
          <circle cx="90" cy="96" r="48" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.38)" stroke-width="3"/>
          <path d="M42 96h96M90 48c18 21 18 75 0 96M90 48c-18 21-18 75 0 96" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="6" stroke-linecap="round"/>
          <text x="160" y="104" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="white">${name}</text>
          <text x="164" y="140" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2" fill="rgba(255,255,255,.78)">REGIONAL eSIM</text>
        </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function regionIconSrc(region: Region) {
  return region.image || regionMediaDataUri(region, 'icon');
}

function regionBannerSrc(region: Region) {
  return region.bannerImage || regionMediaDataUri(region, 'banner');
}

export default function MasterRegions() {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: regionsData, isLoading } = useQuery<{
    success: boolean;
    data: Region[];
  }>({
    queryKey: ['/api/admin/master-regions', { search: debouncedSearch }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      const res = await fetch(`/api/admin/master-regions?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch regions');
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('PATCH', `/api/admin/master-regions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Region updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/master-regions'] });
      setEditingRegion(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update region',
        variant: 'destructive',
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/master-regions/sync', {});
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Sync Complete',
        description: `Created ${data.data?.regionsCreated || 0} regions, updated ${data.data?.regionsUpdated || 0}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/master-regions'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync regions',
        variant: 'destructive',
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ id, file, type }: { id: string; file: File; type: 'image' | 'banner' }) => {
      const formData = new FormData();
      formData.append('image', file);

      const endpoint = type === 'banner'
        ? `/api/admin/master-regions/${id}/upload-banner`
        : `/api/admin/master-regions/${id}/upload-image`;

      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Upload failed');
      }

      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'File uploaded successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/master-regions'] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload file',
        variant: 'destructive',
      });
    },
  });

  const regions = regionsData?.data || [];
  const totalPackages = regions.reduce((sum, r) => sum + r.packageCounts.total, 0);

  const handleEditClick = (region: Region) => {
    setEditingRegion(region);
    setSelectedFile(null);
    setSelectedBannerFile(null);
    setPreviewUrl(regionIconSrc(region));
    setBannerPreviewUrl(regionBannerSrc(region));
  };

  const handleCloseDialog = () => {
    setEditingRegion(null);
    setSelectedFile(null);
    setSelectedBannerFile(null);
    setPreviewUrl(null);
    setBannerPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (bannerInputRef.current) {
      bannerInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'image') {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setSelectedBannerFile(file);
        setBannerPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const handleUploadFiles = () => {
    if (!editingRegion) return;

    if (selectedFile) {
      uploadMutation.mutate({ id: editingRegion.id, file: selectedFile, type: 'image' });
    }

    if (selectedBannerFile) {
      uploadMutation.mutate({ id: editingRegion.id, file: selectedBannerFile, type: 'banner' });
    }
  };

  const handleToggleActive = (region: Region) => {
    updateMutation.mutate({ id: region.id, data: { active: !region.active } });
  };

  return (
    <div className="space-y-6 p-6 text-slate-900 dark:text-slate-100 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            <Globe className="h-6 w-6 text-[#168b80]" />
            {t('adminPanel.admin.regions.title', 'Regions')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t(
              'adminPanel.admin.regions.description',
              'Manage multi-country regional packages',
            )}{' '}
          </p>
        </div>
        <Button
          className="w-full gap-2 bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae] md:w-auto"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          data-testid="button-sync-regions"
        >
          <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          {syncMutation.isPending
            ? t('adminPanel.admin.regions.syncing', 'Syncing...')
            : t('adminPanel.admin.regions.syncRegions', 'Sync Regions')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#168b80]">
              {t('adminPanel.admin.regions.totalRegions', 'Total Regions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{regions.length}</div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">
              {t('adminPanel.admin.regions.activeRegions', 'Active Regions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{regions.filter((r) => r.active).length}</div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-teal-700">
              {t('adminPanel.admin.regions.totalPackages', 'Total Packages')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{totalPackages.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-slate-950">{t('adminPanel.admin.regions.allRegions', 'All Regions')}</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder={t('adminPanel.admin.regions.searchPlaceholder', 'Search regions...')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={`w-full pl-9 sm:w-[250px] ${lightInputClass}`}
                data-testid="input-search-regions"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <Globe className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : regions.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Globe className="h-8 w-8 text-slate-400" />
              </div>
              <p className="font-medium text-slate-500">{t('adminPanel.admin.regions.noRegions', 'No regions found.')}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">{t('adminPanel.admin.regions.table.icon', 'Icon')}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t('adminPanel.admin.regions.table.banner', 'Banner')}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t('adminPanel.admin.regions.table.name', 'Name')}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t('adminPanel.admin.regions.table.slug', 'Slug')}</TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      {t('adminPanel.admin.regions.table.countries', 'Countries')}
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      {t('adminPanel.admin.regions.table.packages', 'Packages')}
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">{t('adminPanel.admin.regions.table.status', 'Status')}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t('adminPanel.admin.regions.table.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regions.map((region) => (
                    <TableRow key={region.id} className="border-slate-200 hover:bg-slate-50">
                      <TableCell>
                        <img
                          src={regionIconSrc(region)}
                          alt={region.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      </TableCell>
                      <TableCell>
                        <img
                          src={regionBannerSrc(region)}
                          alt={`${region.name} banner`}
                          className="h-10 w-16 rounded border border-slate-200 object-cover"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-slate-950">{region.name}</span>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {region.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">
                          {region.countries?.length || 0} countries
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="font-semibold text-slate-950">{region.packageCounts.total} total</span>
                          <span className="font-medium text-slate-500">
                            A:{region.packageCounts.airalo} E:{region.packageCounts.esimAccess} G:
                            {region.packageCounts.esimGo}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={region.active}
                          onCheckedChange={() => handleToggleActive(region)}
                          className={tableSwitchClass}
                          data-testid={`switch-active-${region.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="outline"
                          className={lightOutlineButtonClass}
                          onClick={() => handleEditClick(region)}
                          data-testid={`button-edit-${region.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingRegion} onOpenChange={handleCloseDialog}>
        <DialogContent className="border-slate-200 bg-white text-slate-950">
          <DialogHeader>
            <DialogTitle className="text-slate-950">
              {t('adminPanel.admin.regions.dialog.title', 'Edit Region Image')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Region Icon */}
            <div className="flex flex-col items-center gap-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <Label className="self-start text-sm font-semibold text-slate-700">
                {t('adminPanel.admin.regions.iconLabel', 'Region Icon')}
              </Label>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Icon Preview"
                  className="w-20 h-20 rounded object-cover border"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded border border-slate-200 bg-white">
                  <Image className="h-8 w-8 text-slate-400" />
                </div>
              )}
              <div className="w-full">
                <Input
                  ref={fileInputRef}
                  id="image-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 'image')}
                  className={`w-full ${lightInputClass}`}
                  data-testid="input-region-image-file"
                />
              </div>
            </div>

            {/* Region Banner */}
            <div className="flex flex-col items-center gap-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <Label className="self-start text-sm font-semibold text-slate-700">
                {t('adminPanel.admin.regions.bannerLabel', 'Region Banner')}
              </Label>
              {bannerPreviewUrl ? (
                <img
                  src={bannerPreviewUrl}
                  alt="Banner Preview"
                  className="w-full aspect-[21/9] rounded object-cover border"
                />
              ) : (
                <div className="flex aspect-[21/9] w-full items-center justify-center rounded border border-slate-200 bg-white">
                  <Image className="h-10 w-10 text-slate-400" />
                </div>
              )}
              <div className="w-full">
                <Input
                  ref={bannerInputRef}
                  id="banner-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 'banner')}
                  className={`w-full ${lightInputClass}`}
                  data-testid="input-region-banner-file"
                />
              </div>
            </div>

            <p className="text-center text-[10px] text-slate-500">
              {t(
                'adminPanel.admin.regions.imageFormats',
                'Accepted formats: JPG, PNG, GIF, WebP, SVG (max 5MB)',
              )}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" className={lightOutlineButtonClass} onClick={handleCloseDialog}>
              {t('adminPanel.common.cancel', 'Cancel')}
            </Button>
            <Button
              className="bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]"
              onClick={handleUploadFiles}
              disabled={uploadMutation.isPending || (!selectedFile && !selectedBannerFile)}
              data-testid="button-upload-region-assets"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadMutation.isPending
                ? t('adminPanel.admin.regions.uploading', 'Uploading...')
                : t('adminPanel.admin.regions.saveChanges', 'Save Changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
