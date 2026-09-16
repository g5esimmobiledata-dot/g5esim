import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DollarSign, Loader2, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/contexts/TranslationContext";

type AnalyticsOverview = {
  totalRevenue?: number;
  activeUsers?: number;
  conversionRate?: string | number;
  avgOrderValue?: string | number;
  totalOrders?: number;
};

type AnalyticsFunnel = {
  visitors?: number;
  packageViews?: number;
  checkoutStarts?: number;
  purchases?: number;
};

type CustomerSegment = {
  id: string;
  name: string;
  description?: string;
  userCount?: number;
};

type AbandonedCart = {
  id: string;
  reminderSent?: boolean;
  createdAt: string;
  user?: {
    email?: string;
  };
  package?: {
    title?: string;
  };
};

const panelClass = "overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm";
const statCardClass = "rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm";
const tabListClass = "h-auto rounded-md border border-slate-200 bg-white p-1 text-slate-700";
const tabTriggerClass =
  "rounded-md px-4 py-2 text-sm data-[state=active]:bg-[#58cbbb] data-[state=active]:text-slate-950";

function money(value: string | number | undefined) {
  const numberValue = Number(value || 0);
  return `$${Number.isFinite(numberValue) ? numberValue.toFixed(2) : "0.00"}`;
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-[#58cbbb]" />
    </div>
  );
}

export default function AdminAnalytics() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: overview, isLoading: overviewLoading } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/admin/analytics/overview"],
  });

  const { data: funnel, isLoading: funnelLoading } = useQuery<AnalyticsFunnel>({
    queryKey: ["/api/admin/analytics/funnel"],
  });

  const { data: segments = [], isLoading: segmentsLoading } = useQuery<CustomerSegment[]>({
    queryKey: ["/api/admin/analytics/segments"],
  });

  const { data: abandonedCarts = [], isLoading: cartsLoading } = useQuery<AbandonedCart[]>({
    queryKey: ["/api/admin/analytics/abandoned-carts"],
  });

  const funnelData = funnel
    ? [
        { name: t("adminPanel.admin.analytics.tabs.visitors", "Visitors"), value: funnel.visitors || 0 },
        { name: t("adminPanel.admin.analytics.tabs.packageViews", "Package Views"), value: funnel.packageViews || 0 },
        { name: t("adminPanel.admin.analytics.tabs.checkoutStarts", "Checkout Starts"), value: funnel.checkoutStarts || 0 },
        { name: t("adminPanel.admin.analytics.tabs.purchases", "Purchases"), value: funnel.purchases || 0 },
      ]
    : [];

  return (
    <div className="space-y-6 p-6">
      <Helmet>
        <title>{t("adminPanel.admin.analytics.pageTitle", "Analytics Dashboard")}</title>
      </Helmet>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {t("adminPanel.admin.analytics.pageTitle", "Analytics Dashboard")}
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          {t("adminPanel.admin.analytics.description2", "Track performance metrics and user behavior")}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
          <TabsList className={tabListClass}>
            <TabsTrigger className={tabTriggerClass} value="overview">
              {t("adminPanel.admin.analytics.tabs.overview", "Overview")}
            </TabsTrigger>
            <TabsTrigger className={tabTriggerClass} value="funnel">
              {t("adminPanel.admin.analytics.tabs.funnel", "Funnel")}
            </TabsTrigger>
            <TabsTrigger className={tabTriggerClass} value="segments">
              {t("adminPanel.admin.analytics.tabs.segments", "Segments")}
            </TabsTrigger>
            <TabsTrigger className={tabTriggerClass} value="abandoned">
              {t("adminPanel.admin.analytics.tabs.abandoned", "Abandoned Carts")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {overviewLoading ? (
            <LoadingState />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className={statCardClass}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-teal-700">{t("adminPanel.admin.analytics.totalRevenue2", "Total Revenue")}</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">{money(overview?.totalRevenue)}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#58cbbb] text-slate-950">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
              </Card>

              <Card className={statCardClass}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-teal-700">{t("adminPanel.admin.analytics.activeUsers", "Active Users (30d)")}</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">{overview?.activeUsers || 0}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#58cbbb] text-slate-950">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </Card>

              <Card className={statCardClass}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-teal-700">{t("adminPanel.admin.analytics.conversionRate2", "Conversion Rate")}</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">{overview?.conversionRate || "0"}%</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#58cbbb] text-slate-950">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              </Card>

              <Card className={statCardClass}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-teal-700">{t("adminPanel.admin.analytics.avgOrderValue", "Avg Order Value")}</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">{money(overview?.avgOrderValue)}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#58cbbb] text-slate-950">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="funnel" className="mt-6">
          {funnelLoading ? (
            <LoadingState />
          ) : (
            <Card className={panelClass}>
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-lg text-slate-950">
                  {t("adminPanel.admin.analytics.conversionFunnel", "Conversion Funnel")}
                </CardTitle>
                <CardDescription className="text-slate-500">
                  {t("adminPanel.admin.analytics.description2", "Track performance metrics and user behavior")}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                    <Legend />
                    <Bar dataKey="value" fill="#58cbbb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="segments" className="mt-6">
          {segmentsLoading ? (
            <LoadingState />
          ) : (
            <Card className={panelClass}>
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-lg text-slate-950">
                  {t("adminPanel.admin.analytics.customerSegments", "Customer Segments")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {segments.length > 0 ? (
                  <div className="space-y-3">
                    {segments.map((segment) => (
                      <div className="flex items-center justify-between gap-4 rounded-md border border-slate-200 p-4" key={segment.id}>
                        <div>
                          <h3 className="font-medium text-slate-950">{segment.name}</h3>
                          <p className="text-sm text-slate-500">{segment.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-slate-950">{segment.userCount || 0}</div>
                          <div className="text-xs text-slate-500">{t("adminPanel.admin.analytics.users", "users")}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">
                    {t("adminPanel.admin.analytics.noSegments", "No segments created yet")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="abandoned" className="mt-6">
          {cartsLoading ? (
            <LoadingState />
          ) : (
            <Card className={panelClass}>
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-lg text-slate-950">
                  {t("adminPanel.admin.analytics.abandonedCarts", "Abandoned Carts")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {abandonedCarts.length > 0 ? (
                  <div className="space-y-3">
                    {abandonedCarts.map((cart) => (
                      <div className="flex items-center justify-between gap-4 rounded-md border border-slate-200 p-4" key={cart.id}>
                        <div>
                          <p className="font-medium text-slate-950">
                            {cart.user?.email || t("adminPanel.admin.analytics.guest", "Guest")}
                          </p>
                          <p className="text-sm text-slate-500">
                            {cart.package?.title || t("adminPanel.admin.analytics.unknownPackage", "Unknown Package")}
                          </p>
                          <p className="text-xs text-slate-500">{new Date(cart.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {cart.reminderSent
                            ? t("adminPanel.admin.analytics.reminderSent", "Reminder sent")
                            : t("adminPanel.admin.analytics.noReminder", "No reminder")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">
                    {t("adminPanel.admin.analytics.noAbandonedCarts", "No abandoned carts")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
