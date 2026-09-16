import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Ban, Download, Eye, KeyRound, Loader2, Plus, RefreshCw, RotateCcw, PauseCircle, Tv, Users } from 'lucide-react';

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
  username?: string | null;
  password?: string | null;
  macAddress?: string | null;
  portalUrl?: string | null;
  m3uUrl?: string | null;
  protocolCode?: string | null;
  price?: string;
  currency?: string;
  expiresAt?: string | null;
  createdAt: string;
  tvplusPackageId?: string | null;
  providerResponse?: {
    provider?: string;
    source?: string;
    [key: string]: any;
  } | null;
};

type Dashboard = {
  orders: IptvOrder[];
  packages?: Array<{ id: string; name: string }>;
};

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function termLabel(order: IptvOrder) {
  if (order.subscriptionLabel) return order.subscriptionLabel;
  if (order.subscriptionTermType === 'hours' && order.subscriptionHours) {
    return `Free ${order.subscriptionHours === 24 ? '1 Day' : `${order.subscriptionHours} Hour${order.subscriptionHours === 1 ? '' : 's'}`}`;
  }
  return order.subscriptionMonths === 99 ? 'Demo' : `${order.subscriptionMonths} Month${order.subscriptionMonths === 1 ? '' : 's'}`;
}

function statusClass(status: string) {
  if (status === 'active') return 'bg-emerald-500';
  if (status === 'suspended') return 'bg-amber-500';
  if (status === 'refunded') return 'bg-blue-500';
  if (status === 'failed') return 'bg-red-500';
  return 'bg-slate-600';
}

function isProviderAccount(order: IptvOrder) {
  if (order.status !== 'active') return false;
  if (order.m3uUrl?.includes('demo.tvplus.local')) return false;
  if (order.deviceType === 'm3u') return Boolean(order.username && order.password);
  if (order.deviceType === 'mag') return Boolean(order.macAddress && order.portalUrl);
  if (order.deviceType === 'protocol') return Boolean(order.protocolCode);
  return false;
}

function isIotvOrder(order: IptvOrder) {
  const provider = String(order.providerResponse?.provider || order.providerResponse?.source || '').toLowerCase();
  return provider === 'iotv' || String(order.tvplusPackageId || '').startsWith('iotv-');
}

const lightPanelClass = 'overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm';
const lightInputClass =
  'border-[#24445f] bg-[#071b35] text-white placeholder:text-slate-400 focus-visible:ring-teal-500';
const lightOutlineButtonClass =
  'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';
const primaryButtonClass = 'bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]';

export default function AdminIptvUsers() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<IptvOrder | null>(null);
  const [credentialOrder, setCredentialOrder] = useState<IptvOrder | null>(null);
  const [credentialDraft, setCredentialDraft] = useState({ username: '', password: '', adminNote: '' });
  const [actionNote, setActionNote] = useState('');
  const [renewMonths, setRenewMonths] = useState('12');
  const [importDraft, setImportDraft] = useState({
    username: '',
    password: '',
    expiresAt: '',
    m3uUrl: '',
    packageId: '',
    note: '',
  });

  const { data, isLoading } = useQuery<Dashboard>({
    queryKey: ['/api/admin/iptv/dashboard'],
  });

  const orders = data?.orders || [];
  const packages = (data?.packages || []).filter((pkg) => !pkg.metadata?.virtualTrial);
  const providerAccounts = useMemo(() => orders.filter(isProviderAccount), [orders]);
  const localOnlyOrders = orders.length - providerAccounts.length;

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: string; status: string; adminNote?: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/iptv/orders/${id}/status`, { status, adminNote });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] });
      setActionNote('');
      toast({ title: 'IPTV user updated', description: 'The subscription status was changed.' });
    },
    onError: (error: any) => {
      toast({ title: 'Action failed', description: error.message || 'Could not update IPTV user.', variant: 'destructive' });
    },
  });

  const renewOrder = useMutation({
    mutationFn: async ({ id, months }: { id: string; months: number }) => {
      const response = await apiRequest('POST', `/api/admin/iptv/orders/${id}/renew`, { subscriptionMonths: months });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] });
      toast({ title: 'IPTV renewed', description: 'The subscription was renewed successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Renew failed', description: error.message || 'Could not renew IPTV subscription.', variant: 'destructive' });
    },
  });

  const updateCredentials = useMutation({
    mutationFn: async () => {
      if (!credentialOrder) throw new Error('Select an IPTV user first');
      const response = await apiRequest('PATCH', `/api/admin/iptv/orders/${credentialOrder.id}/credentials`, credentialDraft);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] });
      setCredentialOrder(null);
      setCredentialDraft({ username: '', password: '', adminNote: '' });
      toast({ title: 'Credentials changed', description: 'Username and password were updated in the IPTV Reseller Hub Provider panel.' });
    },
    onError: (error: any) => {
      toast({ title: 'Credential update failed', description: error.message || 'Could not update IPTV Reseller Hub Provider credentials.', variant: 'destructive' });
    },
  });

  const importLine = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/iptv/orders/import', {
        deviceType: 'm3u',
        subscriptionMonths: 1,
        ...importDraft,
      });
      return response.json();
    },
    onSuccess: async () => {
      setImportDraft({ username: '', password: '', expiresAt: '', m3uUrl: '', packageId: '', note: '' });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] });
      toast({ title: 'Provider line imported', description: 'The provider account is now visible in the IPTV User List.' });
    },
    onError: (error: any) => {
      toast({ title: 'Import failed', description: error.message || 'Could not import provider line.', variant: 'destructive' });
    },
  });

  function openDetails(order: IptvOrder) {
    setSelectedOrder(order);
  }

  function openCredentials(order: IptvOrder) {
    setCredentialOrder(order);
    setCredentialDraft({
      username: order.username || '',
      password: order.password || '',
      adminNote: 'IPTV Reseller Hub Provider credentials changed from admin user list',
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[30rem] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Tv className="h-4 w-4" />
            IPTV Services
          </div>
          <h1 className="mt-2 text-3xl font-bold text-white">User List</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">Manage real IPTV Reseller Hub Provider accounts and subscriptions.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={lightPanelClass}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-[#168b80]">IPTV Reseller Hub Provider Accounts</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{providerAccounts.length}</div>
          </CardContent>
        </Card>
        <Card className={lightPanelClass}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Local Orders</CardTitle>
            <Tv className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{orders.length}</div>
          </CardContent>
        </Card>
        <Card className={lightPanelClass}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Not In Provider Panel</CardTitle>
            <Ban className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{localOnlyOrders}</div>
          </CardContent>
        </Card>
      </div>

      <Card className={lightPanelClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-950">
            <Plus className="h-5 w-5 text-primary" />
            Import Provider Line
          </CardTitle>
          <CardDescription className="text-slate-500">Add a real line that already exists in the provider panel without changing the provider account.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1.4fr_1fr_auto]">
          <div className="space-y-2">
            <Label className="text-slate-700">Username</Label>
            <Input
              className={lightInputClass}
              value={importDraft.username}
              onChange={(event) => setImportDraft((current) => ({ ...current, username: event.target.value }))}
              placeholder="6aee40bfc7"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700">Password</Label>
            <Input
              className={lightInputClass}
              value={importDraft.password}
              onChange={(event) => setImportDraft((current) => ({ ...current, password: event.target.value }))}
              placeholder="a8157468c37a"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700">Expire</Label>
            <Input
              className={lightInputClass}
              type="date"
              value={importDraft.expiresAt}
              onChange={(event) => setImportDraft((current) => ({ ...current, expiresAt: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700">M3U URL</Label>
            <Input
              className={lightInputClass}
              value={importDraft.m3uUrl}
              onChange={(event) => setImportDraft((current) => ({ ...current, m3uUrl: event.target.value }))}
              placeholder="Optional provider link"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700">Package</Label>
            <select
              className={`h-9 w-full rounded-md border px-3 text-sm ${lightInputClass}`}
              value={importDraft.packageId}
              onChange={(event) => setImportDraft((current) => ({ ...current, packageId: event.target.value }))}
            >
              <option value="">Default</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              className={`w-full ${primaryButtonClass}`}
              disabled={importLine.isPending || !importDraft.username.trim() || !importDraft.password.trim()}
              onClick={() => importLine.mutate()}
            >
              {importLine.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={lightPanelClass}>
        <CardHeader>
          <CardTitle className="text-slate-950">IPTV Reseller Hub Provider User List</CardTitle>
          <CardDescription className="text-slate-500">Showing active accounts that exist on the provider panel. Failed/demo/local rows are excluded from this list.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-700">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Package</th>
                <th className="px-4 py-3 font-semibold">Device</th>
                <th className="px-4 py-3 font-semibold">Term</th>
                <th className="px-4 py-3 font-semibold">Expires</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Manage Options</th>
              </tr>
            </thead>
            <tbody>
              {providerAccounts.map((order) => (
                <tr key={order.id} className="border-b border-slate-200 text-slate-900 last:border-b-0 hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-950">{order.userName || 'IPTV User'}</div>
                    <div className="text-xs text-slate-500">{order.userEmail || order.id}</div>
                  </td>
                  <td className="px-4 py-4">{order.packageName || 'IPTV Package'}</td>
                  <td className="px-4 py-4 uppercase">{order.deviceType}</td>
                  <td className="px-4 py-4">{termLabel(order)}</td>
                  <td className="px-4 py-4">{formatDate(order.expiresAt)}</td>
                  <td className="px-4 py-4">
                    <Badge className={statusClass(order.status)}>{order.status}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className={lightOutlineButtonClass} onClick={() => openDetails(order)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Details
                      </Button>
                      {isIotvOrder(order) && order.deviceType === 'm3u' && (
                        <Button size="sm" variant="outline" className={lightOutlineButtonClass} onClick={() => openCredentials(order)}>
                          <KeyRound className="mr-2 h-4 w-4" />
                          Credentials
                        </Button>
                      )}
                      {order.m3uUrl && (
                        <Button size="sm" variant="outline" className={lightOutlineButtonClass} asChild>
                          <a href={`/api/admin/iptv/orders/${order.id}/m3u-download`}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      )}
                      <select
                        className={`h-8 rounded-md border px-2 text-xs ${lightInputClass}`}
                        value={renewMonths}
                        onChange={(event) => setRenewMonths(event.target.value)}
                      >
                        <option value="1">1M</option>
                        <option value="3">3M</option>
                        <option value="6">6M</option>
                        <option value="12">12M</option>
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        className={lightOutlineButtonClass}
                        disabled={renewOrder.isPending || order.subscriptionTermType === 'hours' || order.subscriptionMonths === 99}
                        onClick={() => renewOrder.mutate({ id: order.id, months: Number(renewMonths) || 12 })}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Renew
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={lightOutlineButtonClass}
                        disabled={updateStatus.isPending || order.status === 'refunded'}
                        onClick={() => updateStatus.mutate({ id: order.id, status: 'refunded', adminNote: actionNote || 'IPTV refund marked by admin' })}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Refund
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={lightOutlineButtonClass}
                        disabled={updateStatus.isPending || order.status === 'suspended'}
                        onClick={() => updateStatus.mutate({ id: order.id, status: 'suspended', adminNote: actionNote || 'IPTV user suspended by admin' })}
                      >
                        <PauseCircle className="mr-2 h-4 w-4" />
                        Suspend
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {providerAccounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No IPTV Reseller Hub Provider accounts available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label className="text-slate-700">Manage Note</Label>
              <Textarea
                className={lightInputClass}
                value={actionNote}
                onChange={(event) => setActionNote(event.target.value)}
                placeholder="Optional note used for refund or suspend actions"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className={lightOutlineButtonClass} onClick={() => setActionNote('')}>
                <Ban className="mr-2 h-4 w-4" />
                Clear Note
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>IPTV User Details</DialogTitle>
            <DialogDescription>Subscription, credentials, and provider details.</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="User" value={selectedOrder.userName || selectedOrder.userEmail || 'Unknown'} />
              <Detail label="Package" value={selectedOrder.packageName || 'IPTV Package'} />
              <Detail label="Device" value={selectedOrder.deviceType.toUpperCase()} />
              <Detail label="Term" value={termLabel(selectedOrder)} />
              <Detail label="Status" value={selectedOrder.status} />
              <Detail label="Expires" value={formatDate(selectedOrder.expiresAt)} />
              <Detail label="Username" value={selectedOrder.username || '-'} />
              <Detail label="Password" value={selectedOrder.password || '-'} />
              <Detail label="MAC" value={selectedOrder.macAddress || '-'} />
              <Detail label="Protocol Code" value={selectedOrder.protocolCode || '-'} />
              <div className="sm:col-span-2">
                <Detail label="M3U URL" value={selectedOrder.m3uUrl || '-'} />
              </div>
              <div className="sm:col-span-2">
                <Detail label="Portal URL" value={selectedOrder.portalUrl || '-'} />
              </div>
              <div className="rounded-lg border p-3 text-xs text-muted-foreground sm:col-span-2">
                <div>
                  <div className="font-semibold text-foreground">Provider Credentials</div>
                  <div className="mt-1">For IPTV Reseller Hub Provider accounts, username/password changes are pushed to the provider panel and the local M3U URL is updated.</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(credentialOrder)} onOpenChange={(open) => !open && setCredentialOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Change IPTV Reseller Hub Provider Credentials</DialogTitle>
            <DialogDescription>
              Updates the username and password in the IPTV Reseller Hub Provider panel, then refreshes the local M3U link.
            </DialogDescription>
          </DialogHeader>
          {credentialOrder && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{credentialOrder.packageName || 'IPTV Package'}</div>
                <div className="text-xs text-muted-foreground">Current: {credentialOrder.username || '-'} / {credentialOrder.password || '-'}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>New Username</Label>
                  <Input
                    value={credentialDraft.username}
                    onChange={(event) => setCredentialDraft((current) => ({ ...current, username: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    value={credentialDraft.password}
                    onChange={(event) => setCredentialDraft((current) => ({ ...current, password: event.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Admin Note</Label>
                <Textarea
                  value={credentialDraft.adminNote}
                  onChange={(event) => setCredentialDraft((current) => ({ ...current, adminNote: event.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCredentialOrder(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={updateCredentials.isPending || !credentialDraft.username.trim() || !credentialDraft.password.trim()}
                  onClick={() => updateCredentials.mutate()}
                >
                  {updateCredentials.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  Update IPTV Reseller Hub Provider
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-medium">{value}</div>
    </div>
  );
}
