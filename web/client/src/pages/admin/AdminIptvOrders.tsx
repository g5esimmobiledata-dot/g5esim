import { useQuery } from '@tanstack/react-query';
import { Download, Loader2, ReceiptText, Tv } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type IptvOrder = {
  id: string;
  userEmail?: string | null;
  userName?: string | null;
  deviceType: string;
  status: string;
  packageName?: string | null;
  subscriptionMonths: number;
  subscriptionTermType?: 'months' | 'hours';
  subscriptionHours?: number | null;
  subscriptionLabel?: string | null;
  m3uUrl?: string | null;
  createdAt: string;
};

type Dashboard = {
  orders: IptvOrder[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function getOrderTermLabel(order: IptvOrder) {
  if (order.subscriptionLabel) return order.subscriptionLabel;
  if (order.subscriptionTermType === 'hours' && order.subscriptionHours) {
    return `Free ${order.subscriptionHours} Hour${order.subscriptionHours === 1 ? '' : 's'}`;
  }
  return order.subscriptionMonths === 99 ? 'Demo' : `${order.subscriptionMonths} months`;
}

const lightPanelClass = 'overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm';
const lightOutlineButtonClass =
  'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';

export default function AdminIptvOrders() {
  const { data, isLoading } = useQuery<Dashboard>({
    queryKey: ['/api/admin/iptv/dashboard'],
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[30rem] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Tv className="h-4 w-4" />
          IPTV Services
        </div>
        <h1 className="mt-2 text-3xl font-bold text-white">IPTV Log's</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Latest subscriptions created through the active IPTV provider API.
        </p>
      </div>

      <Card className={lightPanelClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-950">
            <ReceiptText className="h-5 w-5 text-primary" />
            IPTV Log's
          </CardTitle>
          <CardDescription className="text-slate-500">Latest subscriptions created through the active IPTV provider API.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-700">
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Package</th>
                <th className="px-4 py-3 font-semibold">Device</th>
                <th className="px-4 py-3 font-semibold">Term</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">M3U</th>
              </tr>
            </thead>
            <tbody>
              {(data?.orders || []).map((order) => (
                <tr key={order.id} className="border-b border-slate-200 text-slate-900 last:border-b-0 hover:bg-slate-50">
                  <td className="px-4 py-4 font-medium text-slate-950">{order.userName || order.userEmail || 'Unknown'}</td>
                  <td className="px-4 py-4">{order.packageName || 'IPTV Subscription'}</td>
                  <td className="px-4 py-4 uppercase">{order.deviceType}</td>
                  <td className="px-4 py-4">{getOrderTermLabel(order)}</td>
                  <td className="px-4 py-4">
                    <Badge className={order.status === 'active' ? 'bg-emerald-500' : 'bg-slate-600'}>{order.status}</Badge>
                  </td>
                  <td className="px-4 py-4">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-4">
                    {order.m3uUrl ? (
                      <Button size="sm" variant="outline" className={lightOutlineButtonClass} asChild>
                        <a href={`/api/admin/iptv/orders/${order.id}/m3u-download`}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </a>
                      </Button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {(data?.orders || []).length === 0 && (
                <tr>
                  <td className="py-8 text-center text-slate-500" colSpan={7}>
                    No IPTV orders found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
