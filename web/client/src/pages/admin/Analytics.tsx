import { useQuery } from "@tanstack/react-query";
import { Download, DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/TranslationContext";

interface StatsData {
  totalOrders: number;
  totalRevenue: number;
  totalEsims: number;
  totalCost: number;
  totalCustomers: number;
  activePackages: number;
  trends: {
    orders: number;
    revenue: number;
    customers: number;
  };
  revenueByMonth: Array<{ month: string; revenue: number }>;
  ordersByStatus: Array<{ status: string; count: number }>;
  topDestinations: Array<{ country: string; flag: string; count: number; revenue: number }>;
  providerStats: Array<{
    id: string;
    name: string;
    slug: string;
    orderCount: number;
    totalCost: number;
    totalRevenue: number;
  }>;
}

const panelClass = "overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm";
const statCardClass = "rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm";
const primaryButtonClass = "border-[#58cbbb] bg-[#58cbbb] text-slate-950 hover:bg-[#48bdae]";
const lightButtonClass = "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950";

function money(value: number | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function Analytics() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ["/api/admin/stats"],
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#58cbbb]" />
          <p className="text-sm text-slate-300">
            {t("adminPanel.admin.analytics.loadingAnalytics", "Loading analytics...")}
          </p>
        </div>
      </div>
    );
  }

  const profit = (stats?.totalRevenue || 0) - (stats?.totalCost || 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {t("adminPanel.admin.analytics.title", "Analytics & Reports")}
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            {t("adminPanel.admin.analytics.description", "Detailed insights and performance metrics")}
          </p>
        </div>
        <Button variant="outline" className={`${lightButtonClass} gap-2`} data-testid="button-export-report">
          <Download className="h-4 w-4" />
          {t("adminPanel.admin.analytics.exportReport", "Export Report")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className={statCardClass} data-testid="card-analytics-revenue">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-teal-700">{t("adminPanel.admin.analytics.totalRevenue", "Total Revenue")}</p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950" data-testid="text-analytics-total-revenue">
                {money(stats?.totalRevenue)}
              </h3>
              <p className="mt-2 text-xs text-teal-700" data-testid="text-analytics-revenue-trend">
                {(stats?.trends?.revenue || 0) >= 0 ? "+" : ""}
                {(stats?.trends?.revenue || 0).toFixed(1)}%{" "}
                {t("adminPanel.admin.analytics.vsLastMonth", "vs last month")}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#58cbbb] text-slate-950">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className={statCardClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-teal-700">{t("adminPanel.admin.analytics.totalOrders", "Total Orders")}</p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                {stats?.totalOrders.toLocaleString() || 0}
              </h3>
              <p className="mt-2 text-xs text-teal-700">
                {stats?.totalEsims.toLocaleString() || 0}{" "}
                {t("adminPanel.admin.analytics.totalEsims", "eSIMs sold")}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#58cbbb] text-slate-950">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className={statCardClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-teal-700">{t("adminPanel.admin.analytics.totalCustomers", "Total Customers")}</p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                {stats?.totalCustomers.toLocaleString() || 0}
              </h3>
              <p className="mt-2 text-xs text-teal-700">
                +{stats?.trends?.customers || 0} {t("adminPanel.admin.analytics.newThisMonth", "new this month")}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#58cbbb] text-slate-950">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className={statCardClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-red-700">{t("adminPanel.admin.analytics.paidToProviders", "Paid to Providers")}</p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950">{money(stats?.totalCost)}</h3>
              <p className="mt-2 text-xs text-red-700">
                {t("adminPanel.admin.analytics.profit", "Profit:")} {money(profit)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-500 text-white">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {stats?.providerStats && stats.providerStats.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {t("adminPanel.admin.analytics.providerPerformance", "Provider Performance")}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {t("adminPanel.admin.analytics.providerPerformanceDesc", "Orders and costs by provider")}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stats.providerStats.map((provider) => (
              <Card className={panelClass} key={provider.id} data-testid={`card-provider-${provider.slug}`}>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold capitalize text-slate-950">{provider.name}</h3>
                    <div className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                      {provider.orderCount} {t("adminPanel.admin.analytics.orders", "orders")}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">{t("adminPanel.admin.analytics.revenue", "Revenue")}</span>
                      <span className="text-sm font-semibold text-emerald-600" data-testid={`text-provider-revenue-${provider.slug}`}>
                        {money(provider.totalRevenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">{t("adminPanel.admin.analytics.cost", "Cost")}</span>
                      <span className="text-sm font-semibold text-red-600" data-testid={`text-provider-cost-${provider.slug}`}>
                        {money(provider.totalCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="text-sm font-medium text-slate-950">
                        {t("adminPanel.admin.analytics.profitLabel", "Profit")}
                      </span>
                      <span className="text-sm font-semibold text-slate-950" data-testid={`text-provider-profit-${provider.slug}`}>
                        {money(provider.totalRevenue - provider.totalCost)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className={panelClass}>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-lg text-slate-950">
              {t("adminPanel.admin.analytics.revenueOverTime", "Revenue Over Time")}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {t("adminPanel.admin.analytics.monthlyRevenueTrend", "Monthly revenue trend")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats?.revenueByMonth || []}>
                <defs>
                  <linearGradient id="colorRevenue2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: "12px" }} />
                <YAxis stroke="#64748b" style={{ fontSize: "12px" }} tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                  formatter={(value: number) => [money(value), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#14b8a6" fillOpacity={1} fill="url(#colorRevenue2)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={panelClass}>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-lg text-slate-950">
              {t("adminPanel.admin.analytics.topDestinations", "Top Destinations by Revenue")}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {t("adminPanel.admin.analytics.highestEarning", "Highest earning providers")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.topDestinations.slice(0, 6) || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" style={{ fontSize: "12px" }} />
                <YAxis type="category" dataKey="country" stroke="#64748b" style={{ fontSize: "12px" }} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                  formatter={(value: number) => [money(value), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className={panelClass}>
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="text-lg text-slate-950">
            {t("adminPanel.admin.analytics.performanceSummary", "Performance Summary")}
          </CardTitle>
          <CardDescription className="text-slate-500">
            {t("adminPanel.admin.analytics.keyMetrics", "Key metrics and insights")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-500">
                {t("adminPanel.admin.analytics.customerLifetimeValue", "Customer Lifetime Value")}
              </p>
              <h4 className="mt-2 text-2xl font-semibold text-slate-950">
                {stats?.totalCustomers ? money((stats.totalRevenue || 0) / stats.totalCustomers) : "$0.00"}
              </h4>
              <p className="mt-2 text-xs text-slate-500">{t("adminPanel.admin.analytics.averagePerCustomer", "Average per customer")}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-500">{t("adminPanel.admin.analytics.conversionRate", "Conversion Rate")}</p>
              <h4 className="mt-2 text-2xl font-semibold text-slate-950">
                {stats?.totalCustomers ? (((stats.totalOrders || 0) / stats.totalCustomers) * 100).toFixed(1) : "0"}%
              </h4>
              <p className="mt-2 text-xs text-slate-500">{t("adminPanel.admin.analytics.ordersPerCustomer", "Orders per customer")}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-500">
                {t("adminPanel.admin.analytics.activePackageRate", "Active Package Rate")}
              </p>
              <h4 className="mt-2 text-2xl font-semibold text-slate-950">100%</h4>
              <p className="mt-2 text-xs text-slate-500">{t("adminPanel.admin.analytics.allPackagesAvailable", "All packages available")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
