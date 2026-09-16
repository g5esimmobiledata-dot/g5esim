import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

interface Destination {
  id: number;
  name: string;
  slug: string;
  countryCode: string;
  flagEmoji?: string;
  imageUrl?: string;
  minPrice?: number;
  packageCount?: number;
  isPopular?: boolean;
}

interface Region {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string;
  minPrice?: number;
  packageCount?: number;
  countries?: string[];
}

interface UnifiedPackage {
  id: number;
  name: string;
  slug: string;
  provider: string;
  destinationSlug?: string;
  regionSlug?: string;
  dataMb: number;
  validityDays: number;
  wholesalePrice: number;
  retailPrice: number;
  currency: string;
  dataDescription?: string;
  voiceMinutes?: number;
  smsCount?: number;
  isUnlimited?: boolean;
  coverageCountries?: string[];
}

interface PackageFilters {
  destination?: string;
  region?: string;
  minData?: number;
  maxData?: number;
  minPrice?: number;
  maxPrice?: number;
  provider?: string;
  sortBy?: string;
  sortOrder?: string;
}

export function useDestinations() {
  return useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
    staleTime: 1000 * 60 * 10,
  });
}

export function useDestinationsWithPricing() {
  return useQuery<Destination[]>({
    queryKey: ["/api/destinations/with-pricing"],
    staleTime: 1000 * 60 * 10,
  });
}

export function usePopularDestinations(limit = 6) {
  return useQuery<Destination[]>({
    queryKey: ["/api/destinations/popular", { limit }],
    staleTime: 1000 * 60 * 10,
  });
}

export function useDestination(slug: string) {
  return useQuery<Destination>({
    queryKey: ["/api/destinations", slug],
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
  });
}

export function useRegions() {
  return useQuery<Region[]>({
    queryKey: ["/api/regions"],
    staleTime: 1000 * 60 * 10,
  });
}

export function useRegionsWithPricing() {
  return useQuery<Region[]>({
    queryKey: ["/api/regions/with-pricing"],
    staleTime: 1000 * 60 * 10,
  });
}

export function useRegion(slug: string) {
  return useQuery<Region>({
    queryKey: ["/api/regions", slug],
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
  });
}

export function useUnifiedPackages(filters?: PackageFilters) {
  return useQuery<UnifiedPackage[]>({
    queryKey: ["/api/unified-packages", filters],
    staleTime: 1000 * 60 * 5,
  });
}

export function usePackagesByDestination(slug: string) {
  return useQuery<UnifiedPackage[]>({
    queryKey: ["/api/unified-packages", { destination: slug }],
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePackagesByRegion(slug: string) {
  return useQuery<UnifiedPackage[]>({
    queryKey: ["/api/unified-packages", { region: slug }],
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePackageDetails(slug: string) {
  return useQuery<UnifiedPackage>({
    queryKey: ["/api/unified-packages", slug],
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
}

interface OTPRequest {
  email: string;
}

interface OTPVerify {
  email: string;
  otp: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export function useRequestOTP() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: OTPRequest): Promise<AuthResponse> => {
      const res = await apiRequest("POST", "/api/auth/send-otp", data);
      return res.json();
    },
  });
}

export function useVerifyOTP() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: OTPVerify): Promise<AuthResponse> => {
      const res = await apiRequest("POST", "/api/auth/verify-otp", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-esims"] });
    },
  });
}

interface Order {
  id: number;
  userId: string;
  packageId: number;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  esimDetails?: {
    iccid?: string;
    qrCode?: string;
  };
}

export function useMyOrders() {
  return useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
}

export function useMyESIMs() {
  return useQuery<any[]>({
    queryKey: ["/api/my-esims"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
}

export function useNotifications() {
  return useQuery<any[]>({
    queryKey: ["/api/notifications"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
}

interface SearchResult {
  destinations: Destination[];
  regions: Region[];
  packages: UnifiedPackage[];
}

export function useSearch(query: string) {
  return useQuery<SearchResult>({
    queryKey: ["/api/search", { q: query }],
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCurrencyRates() {
  return useQuery<Record<string, number>>({
    queryKey: ["/api/currency-rates"],
    staleTime: 1000 * 60 * 60,
  });
}
