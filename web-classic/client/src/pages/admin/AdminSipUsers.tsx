import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Edit3, Loader2, Phone, Plus, RefreshCw, Search, Wifi, WifiOff } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

type SipUser = {
  id: string;
  username: string;
  uri: string;
  domain: string;
  status: string;
  provider: string;
  transport: string;
  port?: number | null;
  registrationProfileName?: string;
  allowInternalCalls: boolean;
  allowInternationalCalls: boolean;
  voicemailEnabled: boolean;
  pbxEnabled: boolean;
  callForwardEnabled: boolean;
  doNotDisturbEnabled: boolean;
  callbackEnabled: boolean;
  conferenceCallEnabled: boolean;
  clearEnabled: boolean;
  callerIdEnabled: boolean;
  callRecordingEnabled: boolean;
  ringGroupEnabled: boolean;
  chatEnabled: boolean;
  traceMeEnabled: boolean;
  faxEnabled: boolean;
  allocatedMsisdn?: string;
  receiveInternationalCalls: boolean;
  connectionStatus: string;
  user: {
    email: string;
    name?: string | null;
  };
};

type SipUsersResponse = {
  data: SipUser[];
  pagination: {
    page: number;
    total: number;
    totalPages: number;
  };
};

const lightInputClass =
  'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500';
const lightSelectClass = 'border-slate-300 bg-white text-slate-900 focus:ring-teal-500';
const lightSelectContentClass = 'border-slate-200 bg-white text-slate-900 shadow-lg';
const lightSelectItemClass =
  'text-slate-900 focus:bg-teal-100 focus:text-slate-950 data-[highlighted]:bg-teal-100 data-[highlighted]:text-slate-950 data-[state=checked]:bg-teal-600 data-[state=checked]:text-white [&_svg]:text-current';
const primaryButtonClass = 'gap-2 bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]';
const outlineButtonClass =
  'gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';

const featureModuleLabels = [
  ['voicemailEnabled', 'Voicemail'],
  ['pbxEnabled', 'PBX'],
  ['callForwardEnabled', 'Forward'],
  ['doNotDisturbEnabled', 'DND'],
  ['callbackEnabled', 'Callback'],
  ['conferenceCallEnabled', 'Conference'],
  ['clearEnabled', 'Clear'],
  ['callerIdEnabled', 'Caller ID'],
  ['callRecordingEnabled', 'Recording'],
  ['ringGroupEnabled', 'Ring Group'],
  ['chatEnabled', 'Chat'],
  ['traceMeEnabled', 'Trace Me'],
  ['faxEnabled', 'Fax'],
] as const;

async function unwrap<T>(response: Response): Promise<T> {
  const payload = await response.json();
  return (payload?.data ?? payload) as T;
}

function parseError(error: Error) {
  return error.message.replace(/^\d+:\s*/, '');
}

function statusBadge(status: string) {
  if (status === 'active') return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Active</Badge>;
  if (status === 'suspended') return <Badge className="border-amber-200 bg-amber-50 text-amber-700">Suspended</Badge>;
  return <Badge className="border-slate-200 bg-slate-100 text-slate-700">Inactive</Badge>;
}

function yesNoBadge(enabled: boolean, label: string) {
  return (
    <Badge className={enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}>
      {label}: {enabled ? 'Yes' : 'No'}
    </Badge>
  );
}

function connectionBadge(status: string) {
  if (status === 'online') {
    return (
      <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
        <Wifi className="h-3 w-3" />
        Online
      </Badge>
    );
  }
  if (status === 'offline') {
    return (
      <Badge className="gap-1 border-red-200 bg-red-50 text-red-700">
        <WifiOff className="h-3 w-3" />
        Offline
      </Badge>
    );
  }
  return <Badge className="border-slate-200 bg-slate-100 text-slate-700">Not Tested</Badge>;
}

function providerLabel(value: string) {
  if (value === 'external_sip') return 'External SIP';
  if (value === 'custom_sip') return 'Custom SIP';
  if (value === 'freepbx') return 'FreePBX';
  if (value === 'astpp') return 'ASTPP';
  return value || 'Local';
}

export default function AdminSipUsers() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const queryParams = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      status,
    }),
    [page, search, status],
  );

  const sipUsersQuery = useQuery<SipUsersResponse>({
    queryKey: ['/api/admin/sip-users', queryParams],
  });

  const testMutation = useMutation({
    mutationFn: async (accountId: string) => unwrap<any>(await apiRequest('POST', `/api/admin/sip-users/${accountId}/test`, {})),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/sip-users'] });
      toast({
        title: result?.online ? 'SIP User Online' : 'SIP User Offline',
        description: result?.message || 'Connection Test Completed.',
        variant: result?.online ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Test Failed', description: parseError(error), variant: 'destructive' });
    },
  });

  const accounts = sipUsersQuery.data?.data || [];
  const pagination = sipUsersQuery.data?.pagination;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            <Phone className="h-8 w-8 text-cyan-300" />
            ERoaming SIP Users
          </h1>
          <p className="mt-2 text-slate-400">Manage Customer SIP Credentials And Calling Permissions.</p>
        </div>
        <Button asChild className={primaryButtonClass}>
          <Link href="/admin/sip-users/create">
            <Plus className="h-4 w-4" />
            Create SIP User
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Phone className="h-5 w-5 text-teal-500" />
              SIP User List
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  className={`${lightInputClass} pl-9 sm:w-72`}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search SIP User, Email, Domain"
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className={`${lightSelectClass} sm:w-40`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={lightSelectContentClass}>
                  <SelectItem className={lightSelectItemClass} value="all">All Status</SelectItem>
                  <SelectItem className={lightSelectItemClass} value="active">Active</SelectItem>
                  <SelectItem className={lightSelectItemClass} value="inactive">Inactive</SelectItem>
                  <SelectItem className={lightSelectItemClass} value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>SIP Username</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Connection</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sipUsersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Loading SIP Users...
                  </TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                    No ERoaming SIP Users Found.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{account.user.name || account.user.email}</div>
                      <div className="text-xs text-slate-500">{account.user.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm font-semibold">{account.username}</div>
                      <div className="text-xs text-slate-500">{account.allocatedMsisdn || account.uri}</div>
                      <div className="text-xs text-slate-500">
                        {providerLabel(account.provider)} / {(account.transport || 'udp').toUpperCase()} {account.port || ''}
                      </div>
                    </TableCell>
                    <TableCell>{account.registrationProfileName || 'Manual Settings'}</TableCell>
                    <TableCell>
                      <div className="flex max-w-md flex-wrap gap-1.5">
                        {yesNoBadge(account.allowInternalCalls, 'Internal')}
                        {yesNoBadge(account.allowInternationalCalls, 'International')}
                        {yesNoBadge(account.receiveInternationalCalls, 'Receive Intl')}
                        {featureModuleLabels
                          .filter(([key]) => account[key])
                          .map(([key, label]) => (
                            <Badge key={key} className="border-emerald-200 bg-emerald-50 text-emerald-700">
                              {label}: Yes
                            </Badge>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(account.status)}</TableCell>
                    <TableCell>{connectionBadge(account.connectionStatus)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className={outlineButtonClass}
                          onClick={() => testMutation.mutate(account.id)}
                          disabled={testMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Test
                        </Button>
                        <Button asChild size="sm" className={primaryButtonClass}>
                          <Link href={`/admin/sip-users/${account.id}/edit`}>
                            <Edit3 className="h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">{pagination ? `${pagination.total} Total SIP Users` : ' '}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className={outlineButtonClass}
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                className={outlineButtonClass}
                disabled={!pagination || page >= pagination.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
