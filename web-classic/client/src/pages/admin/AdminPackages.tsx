import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { RefreshCw, Package as PackageIcon, Globe, Clock, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Package, Destination } from "@shared/schema";

export default function AdminPackages() {
  const { toast } = useToast();
  const [syncStats, setSyncStats] = useState<any>(null);

  const { data: packages, isLoading } = useQuery<(Package & { destination?: Destination })[]>({
    queryKey: ["/api/packages"],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/sync-packages");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/destinations"] });
      
      setSyncStats(data.stats);
      
      toast({
        title: "Sync Successful!",
        description: `Synced ${data.stats.packages.created} new Packages and ${data.stats.countries.created} new destinations from Airalo.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync Packages from Airalo",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-8">
      <Helmet>
        <title>Package Management - Admin | eSIM Marketplace</title>
      </Helmet>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Package Management</h1>
          <p className="text-muted-foreground">
            Manage eSIM Packages and sync from Airalo
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          data-testid="button-sync-packages"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          {syncMutation.isPending ? "Syncing..." : "Sync from Airalo"}
        </Button>
      </div>

      {/* Sync Stats */}
      {syncStats && (
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Last Sync Results</CardTitle>
            <CardDescription>Package sync completed successfully</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Destinations</h4>
                <div className="space-y-1 text-sm">
                  <p>✅ Created: {syncStats.countries.created}</p>
                  <p>♻️ Updated: {syncStats.countries.updated}</p>
                  {syncStats.countries.errorCount > 0 && (
                    <p className="text-destructive">❌ Errors: {syncStats.countries.errorCount}</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Regions</h4>
                <div className="space-y-1 text-sm">
                  <p>✅ Created: {syncStats.regions?.created || 0}</p>
                  <p>♻️ Updated: {syncStats.regions?.updated || 0}</p>
                  {(syncStats.regions?.errorCount || 0) > 0 && (
                    <p className="text-destructive">❌ Errors: {syncStats.regions?.errorCount}</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Packages</h4>
                <div className="space-y-1 text-sm">
                  <p>✅ Created: {syncStats.packages.created}</p>
                  <p>♻️ Updated: {syncStats.packages.updated}</p>
                  <p>⏭️ Skipped: {syncStats.packages.skipped}</p>
                  {syncStats.packages.errorCount > 0 && (
                    <p className="text-destructive">❌ Errors: {syncStats.packages.errorCount}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-packages">
              {packages?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Packages</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-packages">
              {packages?.filter(p => p.active).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Destinations</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-destinations">
              {new Set(packages?.map(p => p.destinationId)).size || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-inactive-packages">
              {packages?.filter(p => !p.active).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Packages Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Packages</CardTitle>
          <CardDescription>
            Browse and manage all eSIM Packages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : packages && packages.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Package</th>
                    <th className="text-left py-3 px-4">Destination</th>
                    <th className="text-left py-3 px-4">Data</th>
                    <th className="text-left py-3 px-4">Validity</th>
                    <th className="text-left py-3 px-4">Price</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Slug</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((pkg) => (
                    <tr 
                      key={pkg.id} 
                      className="border-b hover-elevate"
                      data-testid={`row-package-${pkg.slug}`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium">{pkg.title}</div>
                        <div className="text-sm text-muted-foreground">{pkg.operator || "N/A"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span>{pkg.destination?.flagEmoji}</span>
                          <span>{pkg.destination?.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{pkg.dataAmount}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{pkg.validity} days</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-semibold">
                          <DollarSign className="h-3 w-3" />
                          <span>{pkg.price}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {pkg.active ? (
                          <Badge variant="default" className="bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {pkg.slug}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <PackageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Packages found</h3>
              <p className="text-muted-foreground mb-4">
                Click "Sync from Airalo" to import Packages
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
