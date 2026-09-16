import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BellRing, Send, Smartphone } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

type PushAudience = 'all' | 'users' | 'agents' | 'resellers' | 'single';

type PushSettingsResponse = {
  enabled: boolean;
  role: 'agent' | 'reseller';
  pricing: {
    pricingMode: 'free' | 'paid';
    pricePerNotification: number;
    monthlyFee: number;
  };
};

type ResellerCustomer = {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  const json = await response.json();
  return (json?.data ?? json) as T;
}

export default function PushNotifications() {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<PushAudience>('all');
  const [recipientUserId, setRecipientUserId] = useState('');
  const [sendPush, setSendPush] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  const [search, setSearch] = useState('');

  const { data: settings } = useQuery<PushSettingsResponse>({
    queryKey: ['/api/reseller/push-notifications/settings'],
  });

  const { data: customerData } = useQuery<{ customers: ResellerCustomer[] }>({
    queryKey: ['/api/reseller/customers', { search, limit: 100 }],
    queryFn: () =>
      fetchJson<{ customers: ResellerCustomer[] }>(
        `/api/reseller/customers?limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      ),
    enabled: audience === 'single',
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/reseller/push-notifications/send', {
        title,
        message,
        audience,
        recipientUserId: audience === 'single' ? recipientUserId : undefined,
        sendPush,
        sendInApp,
      });
      const json = await response.json();
      return json.data || json;
    },
    onSuccess: (result: any) => {
      toast({
        title: 'Push notification sent',
        description: `${result.pushSent || 0} mobile push sent, ${result.inAppSent || 0} in-app saved.`,
      });
      setTitle('');
      setMessage('');
      setRecipientUserId('');
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/push-notifications/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Push notification failed',
        description: error.message || 'Could not send push notification.',
        variant: 'destructive',
      });
    },
  });

  if (settings && !settings.enabled) {
    return (
      <div className="space-y-6">
        <Card className="border-white/10 bg-[#101827] text-white">
          <CardHeader>
            <CardTitle>Push Notifications</CardTitle>
            <CardDescription className="text-slate-300">
              This module is disabled for your account. Please contact the platform admin.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const customers = customerData?.customers || [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-300/10 bg-slate-900/70 p-6 text-white shadow-xl shadow-black/20">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-lime-200">
          <BellRing className="h-4 w-4" />
          Mobile Push
        </div>
        <h1 className="mt-3 text-3xl font-semibold">Push Notifications</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Send mobile app push notifications and save in-app notifications for your managed accounts.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="border-white/10 bg-[#101827] text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-cyan-200" />
              Send Push
            </CardTitle>
            <CardDescription className="text-slate-300">
              Choose the audience, write the message, and send it to mobile devices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Important update"
                  className="border-slate-700 bg-[#071b33] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Send To</Label>
                <Select value={audience} onValueChange={(value: PushAudience) => setAudience(value)}>
                  <SelectTrigger className="border-slate-700 bg-[#071b33] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-[#071b33] text-white">
                    <SelectItem value="all">All Managed Accounts</SelectItem>
                    <SelectItem value="users">Users Only</SelectItem>
                    <SelectItem value="agents">Agents Only</SelectItem>
                    <SelectItem value="resellers">Resellers Only</SelectItem>
                    <SelectItem value="single">Single Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {audience === 'single' && (
              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <div className="space-y-2">
                  <Label>Search Account</Label>
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by email, name, phone, UID"
                    className="border-slate-700 bg-[#071b33] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select value={recipientUserId} onValueChange={setRecipientUserId}>
                    <SelectTrigger className="border-slate-700 bg-[#071b33] text-white">
                      <SelectValue placeholder="Choose account" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-[#071b33] text-white">
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {(customer.name || customer.email)} ({customer.role || 'user'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write the notification message..."
                rows={7}
                className="border-slate-700 bg-[#071b33] text-white"
              />
            </div>

            <div className="flex flex-wrap gap-5">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={sendPush} onCheckedChange={(checked) => setSendPush(Boolean(checked))} />
                Mobile push notification
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={sendInApp} onCheckedChange={(checked) => setSendInApp(Boolean(checked))} />
                Save in-app notification
              </label>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={
                  sendMutation.isPending ||
                  !title.trim() ||
                  !message.trim() ||
                  (!sendPush && !sendInApp) ||
                  (audience === 'single' && !recipientUserId)
                }
                className="gap-2 bg-cyan-300 text-slate-950 hover:bg-cyan-200"
              >
                <Send className="h-4 w-4" />
                {sendMutation.isPending ? 'Sending...' : 'Send Notification'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#101827] text-white">
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription className="text-slate-300">
              The admin controls your Push Notifications module and billing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Mode</span>
              <Badge variant="outline" className="capitalize text-white">
                {settings?.pricing?.pricingMode || 'free'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Per notification</span>
              <span>${Number(settings?.pricing?.pricePerNotification || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Monthly fee</span>
              <span>${Number(settings?.pricing?.monthlyFee || 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

