import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Building2, FileText, Package, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EnterpriseDashboard() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/enterprise/me"],
  });

  const { data: quotes } = useQuery({
    queryKey: ["/api/enterprise/quotes"],
    enabled: !!user,
  });

  const { data: orders } = useQuery({
    queryKey: ["/api/enterprise/orders"],
    enabled: !!user,
  });

  const activeQuotes = quotes?.filter((q: any) => q.status === "sent") || [];
  const pendingOrders = orders?.filter((o: any) => o.status === "pending" || o.status === "processing") || [];
  const completedOrders = orders?.filter((o: any) => o.status === "completed") || [];

  if (userLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Enterprise Dashboard | eSIM Global</title>
        <meta name="description" content="Enterprise portal dashboard" />
      </Helmet>

      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-enterprise-company">
            {user?.enterpriseAccount?.companyName || "Enterprise Portal"}
          </h1>
          <p className="text-muted-foreground">Welcome back, {user?.name || user?.email}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Quotes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-quotes-count">
                {activeQuotes.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Quotes awaiting your approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pending-orders-count">
                {pendingOrders.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Orders being processed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-completed-orders-count">
                {completedOrders.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                eSIMs Ready for distribution
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company:</span>
              <span className="font-medium">{user?.enterpriseAccount?.companyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium capitalize">{user?.enterpriseAccount?.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role:</span>
              <span className="font-medium capitalize">{user?.role}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
