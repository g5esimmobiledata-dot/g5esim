import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Globe2, MapPin, Search, Edit2, Image, RefreshCw, Upload, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ReactCountryFlag from "react-country-flag";
import { useTranslation } from "@/contexts/TranslationContext";

interface Destination {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  airaloId: string | null;
  flagEmoji: string | null;
  image: string | null;
  bannerImage: string | null;
  isTerritory: boolean;
  parentCountryCode: string | null;
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

interface CountriesResponse {
  success: boolean;
  data: {
    destinations: Destination[];
    stats: {
      total: number;
      countries: number;
      territories: number;
    };
  };
}

const lightInputClass =
  "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500";
const lightOutlineButtonClass =
  "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950";
const statCardClass = "rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm";
const tableSwitchClass = [
  "h-7 w-14 border border-slate-300 bg-slate-200 shadow-inner",
  "data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500",
  "data-[state=unchecked]:border-slate-300 data-[state=unchecked]:bg-slate-200",
  "[&>span]:h-6 [&>span]:w-6 [&>span]:bg-white [&>span]:shadow-md [&>span]:data-[state=checked]:translate-x-7",
].join(" ");

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hashText(value: string) {
  return value.split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function countryMediaDataUri(dest: Pick<Destination, "name" | "countryCode">, type: "icon" | "banner") {
  const code = escapeSvgText((dest.countryCode || "GL").toUpperCase());
  const name = escapeSvgText(dest.name || code);
  const hue = Math.abs(hashText(`${dest.countryCode}-${dest.name}`)) % 360;
  const hueAlt = (hue + 46) % 360;

  const svg =
    type === "icon"
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="hsl(${hue},74%,42%)"/>
              <stop offset="1" stop-color="hsl(${hueAlt},74%,50%)"/>
            </linearGradient>
          </defs>
          <rect width="160" height="160" rx="28" fill="url(#g)"/>
          <circle cx="123" cy="35" r="31" fill="rgba(255,255,255,.18)"/>
          <path d="M33 105c24-18 51-18 77 0" fill="none" stroke="rgba(255,255,255,.38)" stroke-width="10" stroke-linecap="round"/>
          <text x="80" y="88" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="800" fill="white">${code}</text>
          <text x="80" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="2" fill="rgba(255,255,255,.78)">eSIM</text>
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="hsl(${hue},76%,34%)"/>
              <stop offset=".55" stop-color="hsl(${hueAlt},70%,44%)"/>
              <stop offset="1" stop-color="hsl(${(hue + 92) % 360},72%,35%)"/>
            </linearGradient>
          </defs>
          <rect width="640" height="240" rx="24" fill="url(#g)"/>
          <circle cx="552" cy="42" r="96" fill="rgba(255,255,255,.15)"/>
          <circle cx="86" cy="204" r="138" fill="rgba(255,255,255,.1)"/>
          <path d="M390 186c43-52 106-69 180-52" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="18" stroke-linecap="round"/>
          <rect x="42" y="48" width="94" height="94" rx="22" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.38)"/>
          <text x="89" y="108" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="white">${code}</text>
          <text x="160" y="102" font-family="Arial, sans-serif" font-size="40" font-weight="800" fill="white">${name}</text>
          <text x="164" y="138" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2" fill="rgba(255,255,255,.78)">DESTINATION eSIM</text>
        </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function countryIconSrc(dest: Destination) {
  return dest.image || countryMediaDataUri(dest, "icon");
}

function countryBannerSrc(dest: Destination) {
  return dest.bannerImage || countryMediaDataUri(dest, "banner");
}

function normalizeFlagCode(code?: string | null) {
  const normalized = (code || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function DestinationFlag({ dest }: { dest: Destination }) {
  const code = normalizeFlagCode(dest.countryCode);
  if (code) {
    return (
      <ReactCountryFlag
        countryCode={code}
        svg
        style={{ width: "24px", height: "18px" }}
        title={dest.name}
      />
    );
  }

  return (
    <span
      aria-label={`${dest.name} regional destination`}
      className="inline-flex h-[22px] w-7 items-center justify-center rounded-sm border border-slate-200 bg-slate-100 text-slate-500"
      title={`${dest.name} regional destination`}
    >
      <Globe2 className="h-4 w-4" />
    </span>
  );
}

export default function MasterCountries() {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [isBulkMediaOpen, setIsBulkMediaOpen] = useState(false);
  const [bulkIconFile, setBulkIconFile] = useState<File | null>(null);
  const [bulkBannerFile, setBulkBannerFile] = useState<File | null>(null);
  const [bulkIconPreviewUrl, setBulkIconPreviewUrl] = useState<string | null>(null);
  const [bulkBannerPreviewUrl, setBulkBannerPreviewUrl] = useState<string | null>(null);
  const [includeTerritories, setIncludeTerritories] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const bulkIconInputRef = useRef<HTMLInputElement>(null);
  const bulkBannerInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: countriesData, isLoading } = useQuery<CountriesResponse>({
    queryKey: ["/api/admin/master-countries", { search: debouncedSearch, type: typeFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (typeFilter !== "all") params.append("type", typeFilter);
      const res = await fetch(`/api/admin/master-countries?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch countries");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/master-countries/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Country updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/master-countries"] });
      setEditingDestination(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update country",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/master-countries/sync", {});
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sync Complete",
        description: `Created ${data.data?.destinationsCreated || 0} countries, updated ${data.data?.destinationsUpdated || 0}`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/master-countries"] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync countries",
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`/api/admin/master-countries/${id}/upload-image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Upload failed");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Icon uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/master-countries"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload icon",
        variant: "destructive",
      });
    },
  });

  const uploadBannerMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`/api/admin/master-countries/${id}/upload-banner`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Upload failed");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Banner image uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/master-countries"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload banner image",
        variant: "destructive",
      });
    },
  });

  const bulkMediaMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (bulkIconFile) formData.append("icon", bulkIconFile);
      if (bulkBannerFile) formData.append("banner", bulkBannerFile);
      formData.append("includeTerritories", String(includeTerritories));

      const res = await fetch("/api/admin/master-countries/upload-all-media", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to apply country media");
      }

      return res.json();
    },
    onSuccess: (data: any) => {
      const updated = data.data?.updated || 0;
      toast({
        title: "Success",
        description: `Media applied to ${updated} ${includeTerritories ? "destinations" : "countries"}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/master-countries"] });
      handleCloseBulkMediaDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply country media",
        variant: "destructive",
      });
    },
  });

  const destinations = countriesData?.data?.destinations || [];
  const stats = countriesData?.data?.stats || { total: 0, countries: 0, territories: 0 };
  const totalPackages = destinations.reduce((sum, d) => sum + d.packageCounts.total, 0);

  const handleEditClick = (dest: Destination) => {
    setEditingDestination(dest);
    setSelectedFile(null);
    setPreviewUrl(countryIconSrc(dest));
    setSelectedBannerFile(null);
    setBannerPreviewUrl(countryBannerSrc(dest));
  };

  const handleCloseDialog = () => {
    setEditingDestination(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setSelectedBannerFile(null);
    setBannerPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (bannerFileInputRef.current) {
      bannerFileInputRef.current.value = "";
    }
  };

  const handleCloseBulkMediaDialog = () => {
    setIsBulkMediaOpen(false);
    setBulkIconFile(null);
    setBulkBannerFile(null);
    setBulkIconPreviewUrl(null);
    setBulkBannerPreviewUrl(null);
    setIncludeTerritories(false);
    if (bulkIconInputRef.current) {
      bulkIconInputRef.current.value = "";
    }
    if (bulkBannerInputRef.current) {
      bulkBannerInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedBannerFile(file);
      const url = URL.createObjectURL(file);
      setBannerPreviewUrl(url);
    }
  };

  const handleBulkIconFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBulkIconFile(file);
      setBulkIconPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleBulkBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBulkBannerFile(file);
      setBulkBannerPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadImage = async () => {
    if (editingDestination) {
      if (selectedFile) {
        await uploadMutation.mutateAsync({ id: editingDestination.id, file: selectedFile });
      }
      if (selectedBannerFile) {
        await uploadBannerMutation.mutateAsync({ id: editingDestination.id, file: selectedBannerFile });
      }
      handleCloseDialog();
    }
  };

  const handleToggleActive = (dest: Destination) => {
    updateMutation.mutate({ id: dest.id, data: { active: !dest.active } });
  };

  return (
    <div className="space-y-6 p-6 text-slate-900 dark:text-slate-100 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            <MapPin className="h-6 w-6 text-[#168b80]" />
            {t("adminPanel.admin.countries.title", "Countries & Territories")}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t("adminPanel.admin.countries.description", "Manage destination countries and territories")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className={`w-full gap-2 md:w-auto ${lightOutlineButtonClass}`}
            onClick={() => setIsBulkMediaOpen(true)}
            data-testid="button-bulk-country-media"
          >
            <Images className="h-4 w-4" />
            {t("adminPanel.admin.countries.bulkMedia", "All Countries Media")}
          </Button>
          <Button
            className="w-full gap-2 bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae] md:w-auto"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            data-testid="button-sync-countries"
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? t("adminPanel.admin.countries.syncing", "Syncing...")
              : t("adminPanel.admin.countries.syncCountries", "Sync Countries")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#168b80]">
              {t("adminPanel.admin.countries.totalDestinations", "Total Destinations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">
              {t("adminPanel.admin.countries.countries", "Countries")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{stats.countries}</div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">
              {t("adminPanel.admin.countries.territories", "Territories")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{stats.territories}</div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-teal-700">
              {t("adminPanel.admin.countries.totalPackages", "Total Packages")}
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
            <CardTitle className="text-slate-950">{t("adminPanel.admin.countries.allCountries", "All Countries")}</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder={t("adminPanel.admin.countries.searchPlaceholder", "Search countries...")}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className={`w-full pl-9 sm:w-[200px] ${lightInputClass}`}
                  data-testid="input-search-countries"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className={`w-full sm:w-[150px] ${lightInputClass}`} data-testid="select-type">
                  <SelectValue placeholder={t("adminPanel.admin.countries.allTypes", "All Types")} />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-900">
                  <SelectItem value="all">{t("adminPanel.admin.countries.allTypes", "All Types")}</SelectItem>
                  <SelectItem value="country">{t("adminPanel.admin.countries.filterCountries", "Countries")}</SelectItem>
                  <SelectItem value="territory">{t("adminPanel.admin.countries.filterTerritories", "Territories")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <MapPin className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : destinations.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <MapPin className="h-8 w-8 text-slate-400" />
              </div>
              <p className="font-medium text-slate-500">{t("adminPanel.admin.countries.noCountries", "No countries found.")}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">{t("adminPanel.admin.countries.table.flag", "Flag")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t("adminPanel.admin.countries.table.icon", "Icon")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t("adminPanel.admin.countries.table.banner", "Banner")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t("adminPanel.admin.countries.table.name", "Name")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t("adminPanel.admin.countries.table.code", "Code")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t("adminPanel.admin.countries.table.type", "Type")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t("adminPanel.admin.countries.table.packages", "Packages")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t("adminPanel.admin.countries.table.status", "Status")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t("adminPanel.admin.countries.table.actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {destinations.map((dest) => (
                    <TableRow key={dest.id} className="border-slate-200 hover:bg-slate-50">
                      <TableCell>
                        <DestinationFlag dest={dest} />
                      </TableCell>
                      <TableCell>
                        <img
                          src={countryIconSrc(dest)}
                          alt={`${dest.name} icon`}
                          className="h-10 w-10 rounded border border-slate-200 object-cover"
                        />
                      </TableCell>
                      <TableCell>
                        <img
                          src={countryBannerSrc(dest)}
                          alt={`${dest.name} banner`}
                          className="h-10 w-20 rounded border border-slate-200 object-cover"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-slate-950">{dest.name}</span>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {dest.countryCode}
                        </code>
                      </TableCell>
                      <TableCell>
                        {dest.isTerritory ? (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                            {t("adminPanel.admin.countries.territory", "Territory")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">
                            {t("adminPanel.admin.countries.country", "Country")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="font-semibold text-slate-950">
                            {dest.packageCounts.total} total
                          </span>
                          <span className="font-medium text-slate-500">
                            A:{dest.packageCounts.airalo} E:{dest.packageCounts.esimAccess} G:{dest.packageCounts.esimGo}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={dest.active}
                          onCheckedChange={() => handleToggleActive(dest)}
                          className={tableSwitchClass}
                          data-testid={`switch-active-${dest.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="outline"
                          className={lightOutlineButtonClass}
                          onClick={() => handleEditClick(dest)}
                          data-testid={`button-edit-${dest.id}`}
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

      <Dialog open={!!editingDestination} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl border-slate-200 bg-white text-slate-950">
          <DialogHeader>
            <DialogTitle className="text-slate-950">{t("adminPanel.admin.countries.dialog.title", "Edit Country Media")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
            {/* Icon Upload Piece */}
            <div className="space-y-4">
              <Label className="text-base font-semibold text-slate-700">{t("adminPanel.admin.countries.icon", "Country Icon")}</Label>
              <div className="flex flex-col items-center gap-4">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Icon Preview"
                    className="w-32 h-32 rounded object-cover border shadow-sm"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded border border-slate-200 bg-slate-100">
                    <Image className="h-12 w-12 text-slate-400" />
                  </div>
                )}
                <div className="w-full">
                  <Label htmlFor="image-file" className="text-sm text-slate-700">{t("adminPanel.admin.countries.uploadIcon", "Upload Icon")}</Label>
                  <Input
                    ref={fileInputRef}
                    id="image-file"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className={`mt-1 ${lightInputClass}`}
                    data-testid="input-country-image-file"
                  />
                </div>
              </div>
            </div>

            {/* Banner Upload Piece */}
            <div className="space-y-4">
              <Label className="text-base font-semibold text-slate-700">{t("adminPanel.admin.countries.banner", "Country Banner")}</Label>
              <div className="flex flex-col items-center gap-4">
                {bannerPreviewUrl ? (
                  <img
                    src={bannerPreviewUrl}
                    alt="Banner Preview"
                    className="w-full h-32 rounded object-cover border shadow-sm"
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center rounded border border-slate-200 bg-slate-100">
                    <Image className="h-12 w-12 text-slate-400" />
                  </div>
                )}
                <div className="w-full">
                  <Label htmlFor="banner-file" className="text-sm text-slate-700">{t("adminPanel.admin.countries.uploadBanner", "Upload Banner")}</Label>
                  <Input
                    ref={bannerFileInputRef}
                    id="banner-file"
                    type="file"
                    accept="image/*"
                    onChange={handleBannerFileSelect}
                    className={`mt-1 ${lightInputClass}`}
                    data-testid="input-country-banner-file"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-1 py-2">
            <p className="text-xs text-slate-500">
              {t("adminPanel.admin.countries.imageFormats", "Accepted formats: JPG, PNG, GIF, WebP, SVG (max 5MB)")}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" className={lightOutlineButtonClass} onClick={handleCloseDialog}>
              {t("adminPanel.common.cancel", "Cancel")}
            </Button>
            <Button
              className="bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]"
              onClick={handleUploadImage}
              disabled={uploadMutation.isPending || uploadBannerMutation.isPending || (!selectedFile && !selectedBannerFile)}
              data-testid="button-upload-country-media"
            >
              {(uploadMutation.isPending || uploadBannerMutation.isPending) ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t("adminPanel.admin.countries.uploading", "Uploading...")}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t("adminPanel.admin.countries.saveMedia", "Save Media")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkMediaOpen} onOpenChange={handleCloseBulkMediaDialog}>
        <DialogContent className="max-w-2xl border-slate-200 bg-white text-slate-950">
          <DialogHeader>
            <DialogTitle className="text-slate-950">
              {t("adminPanel.admin.countries.bulkDialog.title", "Apply Media to All Countries")}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-slate-600">
            {t(
              "adminPanel.admin.countries.bulkDialog.description",
              "Upload an icon, a banner, or both. Empty fields will stay unchanged.",
            )}
          </p>

          <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
            <div className="space-y-4">
              <Label className="text-base font-semibold text-slate-700">
                {t("adminPanel.admin.countries.icon", "Country Icon")}
              </Label>
              <div className="flex flex-col items-center gap-4">
                {bulkIconPreviewUrl ? (
                  <img
                    src={bulkIconPreviewUrl}
                    alt="Icon Preview"
                    className="h-32 w-32 rounded border object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded border border-slate-200 bg-slate-100">
                    <Image className="h-12 w-12 text-slate-400" />
                  </div>
                )}
                <div className="w-full">
                  <Label htmlFor="bulk-image-file" className="text-sm text-slate-700">
                    {t("adminPanel.admin.countries.uploadIcon", "Upload Icon")}
                  </Label>
                  <Input
                    ref={bulkIconInputRef}
                    id="bulk-image-file"
                    type="file"
                    accept="image/*"
                    onChange={handleBulkIconFileSelect}
                    className={`mt-1 ${lightInputClass}`}
                    data-testid="input-bulk-country-image-file"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold text-slate-700">
                {t("adminPanel.admin.countries.banner", "Country Banner")}
              </Label>
              <div className="flex flex-col items-center gap-4">
                {bulkBannerPreviewUrl ? (
                  <img
                    src={bulkBannerPreviewUrl}
                    alt="Banner Preview"
                    className="h-32 w-full rounded border object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center rounded border border-slate-200 bg-slate-100">
                    <Image className="h-12 w-12 text-slate-400" />
                  </div>
                )}
                <div className="w-full">
                  <Label htmlFor="bulk-banner-file" className="text-sm text-slate-700">
                    {t("adminPanel.admin.countries.uploadBanner", "Upload Banner")}
                  </Label>
                  <Input
                    ref={bulkBannerInputRef}
                    id="bulk-banner-file"
                    type="file"
                    accept="image/*"
                    onChange={handleBulkBannerFileSelect}
                    className={`mt-1 ${lightInputClass}`}
                    data-testid="input-bulk-country-banner-file"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 px-1 py-2">
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <Label htmlFor="include-territories" className="text-sm font-medium text-slate-700">
                {t("adminPanel.admin.countries.includeTerritories", "Include territories")}
              </Label>
              <Switch
                id="include-territories"
                checked={includeTerritories}
                onCheckedChange={setIncludeTerritories}
                className={tableSwitchClass}
              />
            </div>
            <p className="text-xs text-slate-500">
              {t("adminPanel.admin.countries.imageFormats", "Accepted formats: JPG, PNG, GIF, WebP, SVG (max 5MB)")}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" className={lightOutlineButtonClass} onClick={handleCloseBulkMediaDialog}>
              {t("adminPanel.common.cancel", "Cancel")}
            </Button>
            <Button
              className="bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]"
              onClick={() => bulkMediaMutation.mutate()}
              disabled={bulkMediaMutation.isPending || (!bulkIconFile && !bulkBannerFile)}
              data-testid="button-upload-all-country-media"
            >
              {bulkMediaMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t("adminPanel.admin.countries.uploading", "Uploading...")}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t("adminPanel.admin.countries.applyToAll", "Apply to All")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
