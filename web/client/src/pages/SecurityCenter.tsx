import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Lock,
  Mail,
  KeyRound,
  MapPinned,
  Phone,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

type SecuritySettings = {
  twoFactorEnabled: boolean;
  otpEmailEnabled: boolean;
  otpPhoneEnabled: boolean;
  authenticatorConfigured: boolean;
  allowVpn: boolean;
  blockedIps: string[];
  whitelistIps: string[];
};

type IpLookup = {
  ip: string;
  country: string;
  city: string;
  isp: string;
  vpn: string;
  risk: string;
  latitude?: number | null;
  longitude?: number | null;
  mapUrl: string;
  lookupUrl: string;
};

type LoginLog = {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  ipLookup: IpLookup;
  metadata?: Record<string, any>;
};

type SecurityPayload = {
  settings: SecuritySettings;
  currentIp: string;
  currentIpLookup: IpLookup;
  logs: LoginLog[];
};

type CurrentUser = {
  email?: string | null;
};

function unwrap<T>(payload: any): T {
  return (payload?.data || payload) as T;
}

async function json<T>(response: Response): Promise<T> {
  return unwrap<T>(await response.json());
}

function dateText(value: string) {
  return new Date(value).toLocaleString();
}

function listText(items: string[]) {
  return items.length ? items.join(', ') : 'None';
}

function ipMapEmbedUrl(lookup?: IpLookup) {
  if (!lookup?.ip || lookup.country === 'Local Network') return '';
  const hasCoordinates = typeof lookup.latitude === 'number' && typeof lookup.longitude === 'number';
  const query = hasCoordinates
    ? `${lookup.latitude},${lookup.longitude}`
    : lookup.city !== 'Unknown' || lookup.country !== 'Unknown'
      ? `${lookup.city}, ${lookup.country}`
      : lookup.ip;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

const panelClass = 'border-slate-200 bg-white text-slate-950 shadow-sm';
const statCardClass = panelClass;
const labelClass = 'text-sm text-slate-700';
const mutedTextClass = 'text-slate-500';
const darkFieldClass =
  'border-slate-700 bg-[#071b33] text-white placeholder:text-slate-400 focus-visible:ring-teal-400';
const lightButtonClass = 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50';
const primaryButtonClass = 'bg-teal-300 text-slate-950 hover:bg-teal-200';
const nestedPanelClass = 'rounded-lg border border-slate-200 bg-white p-4';
const subtlePanelClass = 'rounded-lg border border-slate-200 bg-slate-50 p-4';

export default function SecurityCenter({ section = '2fa' }: { section?: '2fa' | 'ip-logs' }) {
  const { toast } = useToast();
  const [ipInput, setIpInput] = useState('');
  const [selectedIpLogId, setSelectedIpLogId] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [authenticatorSetup, setAuthenticatorSetup] = useState<{
    secret: string;
    qrCodeDataUrl: string;
    otpauthUrl: string;
  } | null>(null);
  const [authenticatorCode, setAuthenticatorCode] = useState('');

  const { data, isLoading } = useQuery<SecurityPayload>({
    queryKey: ['/api/security'],
    queryFn: async () => json<SecurityPayload>(await apiRequest('GET', '/api/security')),
  });
  const { data: currentUser } = useQuery<CurrentUser | null>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  const settings = data?.settings;
  const logs = data?.logs || [];
  const currentIp = data?.currentIp || '';

  const saveSettings = useMutation({
    mutationFn: async (updates: Partial<SecuritySettings>) =>
      json(await apiRequest('PUT', '/api/security/settings', updates)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/security'] });
      toast({ title: 'Security settings saved' });
    },
  });

  const ipAction = useMutation({
    mutationFn: async ({ action, ip }: { action: string; ip: string }) =>
      json(await apiRequest('POST', `/api/security/ip/${action}`, { ip })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/security'] });
      setIpInput('');
      toast({ title: 'IP security list updated' });
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => json(await apiRequest('POST', '/api/auth/change-password', passwordForm)),
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({ title: 'Password changed successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Could not change password',
        description: error.message || 'Please check your password details and try again.',
        variant: 'destructive',
      });
    },
  });

  const sendTestEmailOtp = useMutation({
    mutationFn: async () => {
      if (!currentUser?.email) throw new Error('No email address found for this account.');
      return json(await apiRequest('POST', '/api/auth/send-otp', { email: currentUser.email, purpose: 'login' }));
    },
    onSuccess: () => {
      toast({
        title: 'Test OTP sent',
        description: `A verification code was sent to ${currentUser?.email}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Could not send test OTP',
        description: error.message || 'Please check email settings and try again.',
        variant: 'destructive',
      });
    },
  });

  const startAuthenticatorSetup = useMutation({
    mutationFn: async () =>
      json<{ secret: string; qrCodeDataUrl: string; otpauthUrl: string }>(
        await apiRequest('POST', '/api/security/totp/setup', {}),
      ),
    onSuccess: (payload) => {
      setAuthenticatorSetup(payload);
      toast({ title: 'Scan the QR code', description: 'Open Google Authenticator or another authenticator app.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Could not start authenticator setup',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const verifyAuthenticator = useMutation({
    mutationFn: async () => json(await apiRequest('POST', '/api/security/totp/verify', { code: authenticatorCode })),
    onSuccess: () => {
      setAuthenticatorSetup(null);
      setAuthenticatorCode('');
      queryClient.invalidateQueries({ queryKey: ['/api/security'] });
      toast({ title: 'Authenticator 2FA enabled' });
    },
    onError: (error: any) => {
      toast({
        title: 'Invalid authenticator code',
        description: error.message || 'Check the 6-digit code and try again.',
        variant: 'destructive',
      });
    },
  });

  const disableAuthenticator = useMutation({
    mutationFn: async () => json(await apiRequest('POST', '/api/security/totp/disable', {})),
    onSuccess: () => {
      setAuthenticatorSetup(null);
      setAuthenticatorCode('');
      queryClient.invalidateQueries({ queryKey: ['/api/security'] });
      toast({ title: 'Authenticator 2FA disabled' });
    },
  });

  const latestLog = logs[0];
  const selectedIpLog = logs.find((log) => log.id === selectedIpLogId) || latestLog;
  const selectedMapUrl = ipMapEmbedUrl(selectedIpLog?.ipLookup);
  const uniqueIpCount = useMemo(
    () => new Set(logs.map((log) => log.ipAddress || log.ipLookup?.ip).filter(Boolean)).size,
    [logs],
  );

  if (isLoading) {
    return <div className="p-6 text-white">Loading Security...</div>;
  }

  return (
    <div className="admin-mode-surface space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Security</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Manage Two-Factor Authentication, Login IP tracing, VPN policy, blocked IPs, and trusted whitelist access.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className={statCardClass}>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-slate-600">2FA Status</p>
              <p className="text-2xl font-bold text-slate-950">{settings?.twoFactorEnabled ? 'Enabled' : 'Off'}</p>
            </div>
            <KeyRound className="h-8 w-8 text-lime-500" />
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-slate-600">Login IPs</p>
              <p className="text-2xl font-bold text-slate-950">{uniqueIpCount}</p>
            </div>
            <MapPinned className="h-8 w-8 text-cyan-500" />
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-slate-600">VPN Access</p>
              <p className="text-2xl font-bold text-slate-950">{settings?.allowVpn ? 'Allowed' : 'Blocked'}</p>
            </div>
            <Wifi className="h-8 w-8 text-amber-500" />
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-slate-600">Blocked IPs</p>
              <p className="text-2xl font-bold text-slate-950">{settings?.blockedIps.length || 0}</p>
            </div>
            <Ban className="h-8 w-8 text-red-500" />
          </CardContent>
        </Card>
      </div>

      {section === '2fa' ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className={panelClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-950">
                <ShieldCheck className="h-5 w-5 text-slate-700" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription className={mutedTextClass}>Control login verification methods and password security for users, agents, and resellers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className={`flex items-center justify-between ${nestedPanelClass}`}>
                <div>
                  <Label className="text-base font-semibold text-slate-950">Setup 2FA Security</Label>
                  <p className="text-sm text-slate-500">Use Google Authenticator, Authy, Microsoft Authenticator, or another authenticator app.</p>
                </div>
                <Switch
                  checked={Boolean(settings?.twoFactorEnabled)}
                  onCheckedChange={(enabled) => {
                    if (enabled) {
                      if (settings?.authenticatorConfigured) {
                        saveSettings.mutate({ twoFactorEnabled: true });
                      } else {
                        startAuthenticatorSetup.mutate();
                      }
                    } else {
                      disableAuthenticator.mutate();
                    }
                  }}
                />
              </div>

              {(authenticatorSetup || settings?.authenticatorConfigured) && (
                <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    {authenticatorSetup?.qrCodeDataUrl && (
                      <img
                        src={authenticatorSetup.qrCodeDataUrl}
                        alt="Authenticator QR code"
                        className="h-40 w-40 rounded-lg bg-white p-2"
                      />
                    )}
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <h3 className="font-semibold text-slate-950">
                          {settings?.authenticatorConfigured ? 'Authenticator App Connected' : 'Connect Authenticator App'}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {settings?.authenticatorConfigured
                            ? 'Password login now requires a 6-digit code from your authenticator app.'
                            : 'Scan the QR code, then enter the 6-digit code from the app to activate 2FA.'}
                        </p>
                      </div>
                      {authenticatorSetup?.secret && (
                        <div className="rounded-md border border-cyan-200 bg-white p-3">
                          <p className="text-xs uppercase text-slate-500">Manual Setup Key</p>
                          <p className="break-all font-mono text-sm text-slate-900">{authenticatorSetup.secret}</p>
                        </div>
                      )}
                      {authenticatorSetup && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            className={darkFieldClass}
                            value={authenticatorCode}
                            onChange={(event) => setAuthenticatorCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="6-digit code"
                            inputMode="numeric"
                            maxLength={6}
                          />
                          <Button
                            disabled={verifyAuthenticator.isPending || authenticatorCode.length !== 6}
                            onClick={() => verifyAuthenticator.mutate()}
                            className={primaryButtonClass}
                          >
                            {verifyAuthenticator.isPending ? 'Verifying...' : 'Verify & Enable'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className={`flex items-center justify-between gap-4 ${nestedPanelClass}`}>
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 text-cyan-500" />
                    <div>
                      <Label className="text-base font-semibold text-slate-950">Get OTP Code By Email</Label>
                      <p className="text-sm text-slate-500">Send verification codes to the account email address.</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={`mt-3 ${lightButtonClass}`}
                        disabled={!settings?.otpEmailEnabled || sendTestEmailOtp.isPending}
                        onClick={() => sendTestEmailOtp.mutate()}
                      >
                        {sendTestEmailOtp.isPending ? 'Sending...' : 'Send Test Email OTP'}
                      </Button>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.otpEmailEnabled !== false}
                    onCheckedChange={(otpEmailEnabled) => saveSettings.mutate({ otpEmailEnabled })}
                  />
                </div>

                <div className={`flex items-center justify-between ${nestedPanelClass}`}>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-5 w-5 text-lime-500" />
                    <div>
                      <Label className="text-base font-semibold text-slate-950">Get OTP Code By Phone</Label>
                      <p className="text-sm text-slate-500">Requires an SMS provider before codes can be delivered by phone.</p>
                      <Badge variant="outline" className="mt-3 border-amber-300 bg-amber-50 text-amber-700">
                        SMS Provider Required
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={Boolean(settings?.otpPhoneEnabled)}
                    disabled
                    onCheckedChange={(otpPhoneEnabled) => saveSettings.mutate({ otpPhoneEnabled })}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-slate-600">
                <AlertTriangle className="mb-2 h-5 w-5 text-amber-500" />
                The main 2FA switch uses an authenticator app. Email OTP remains available for email-code testing and future backup flows. Phone OTP is locked until an SMS gateway is connected.
              </div>
            </CardContent>
          </Card>

          <Card className={panelClass}>
            <CardHeader>
              <CardTitle className="text-slate-950">Latest Login</CardTitle>
              <CardDescription className={mutedTextClass}>Last detected access point for this account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-slate-500">Current IP</span><strong className="text-slate-950">{currentIp || 'Unknown'}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Last Login</span><strong className="text-slate-950">{latestLog ? dateText(latestLog.createdAt) : 'No Log'}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">ISP</span><strong className="text-slate-950">{latestLog?.ipLookup?.isp || 'Unknown'}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">VPN</span><strong className="text-slate-950">{latestLog?.ipLookup?.vpn || 'Unknown'}</strong></div>
            </CardContent>
          </Card>

          <Card className={`xl:col-span-2 ${panelClass}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-950">
                <Lock className="h-5 w-5 text-slate-700" />
                Change Password
              </CardTitle>
              <CardDescription className={mutedTextClass}>Update the password used for password login.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className={labelClass} htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    className={darkFieldClass}
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                    placeholder="Current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass} htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    className={darkFieldClass}
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                    placeholder="New password"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass} htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    className={darkFieldClass}
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    placeholder="Confirm password"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => changePassword.mutate()}
                  disabled={
                    changePassword.isPending ||
                    !passwordForm.currentPassword ||
                    !passwordForm.newPassword ||
                    !passwordForm.confirmPassword
                  }
                  className={primaryButtonClass}
                >
                  {changePassword.isPending ? 'Saving...' : 'Change Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className={panelClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-950">
                <MapPinned className="h-5 w-5 text-slate-700" />
                IP Logs & Access Policy
              </CardTitle>
              <CardDescription className={mutedTextClass}>Trace login IPs, open IP lookups, view map links, and control VPN/IP access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className={`flex items-center justify-between ${nestedPanelClass}`}>
                  <div>
                    <Label className="text-base font-semibold text-slate-950">Allow VPN Access</Label>
                    <p className="text-sm text-slate-500">Turn off when your IP intelligence provider flags an address as VPN/proxy.</p>
                  </div>
                  <Switch
                    checked={Boolean(settings?.allowVpn)}
                    onCheckedChange={(allowVpn) => saveSettings.mutate({ allowVpn })}
                  />
                </div>
                <div className={nestedPanelClass}>
                  <Label className={labelClass} htmlFor="ip-control">Block or Whitelist IP</Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      id="ip-control"
                      className={darkFieldClass}
                      value={ipInput}
                      onChange={(event) => setIpInput(event.target.value)}
                      placeholder="Example: 203.0.113.10"
                    />
                    <Button variant="destructive" disabled={!ipInput} onClick={() => ipAction.mutate({ action: 'block', ip: ipInput })}>Block</Button>
                    <Button className={primaryButtonClass} disabled={!ipInput} onClick={() => ipAction.mutate({ action: 'whitelist', ip: ipInput })}>Whitelist</Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className={subtlePanelClass}>
                  <h3 className="font-semibold text-red-600">Blocked IPs</h3>
                  <p className="mt-1 text-sm text-slate-500">{listText(settings?.blockedIps || [])}</p>
                </div>
                <div className={subtlePanelClass}>
                  <h3 className="font-semibold text-lime-700">Whitelisted IPs</h3>
                  <p className="mt-1 text-sm text-slate-500">{listText(settings?.whitelistIps || [])}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={panelClass}>
            <CardHeader>
              <CardTitle className="text-slate-950">Login IP Trace</CardTitle>
              <CardDescription className={mutedTextClass}>Each successful login is recorded with IP, browser, lookup, and map actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {selectedMapUrl ? (
                    <iframe
                      key={selectedMapUrl}
                      title={`IP location map for ${selectedIpLog?.ipLookup?.ip || 'selected IP'}`}
                      src={selectedMapUrl}
                      className="h-[320px] w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="flex h-[320px] items-center justify-center p-6 text-center text-sm text-slate-500">
                      Select a public IP log to preview its location on the map.
                    </div>
                  )}
                </div>
                <div className={nestedPanelClass}>
                  <h3 className="font-semibold text-slate-950">Selected IP Details</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">IP Address</span>
                      {selectedIpLog?.ipLookup?.lookupUrl ? (
                        <a
                          href={selectedIpLog.ipLookup.lookupUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-teal-700 underline-offset-4 hover:underline"
                        >
                          {selectedIpLog.ipAddress || selectedIpLog.ipLookup.ip}
                        </a>
                      ) : (
                        <strong className="font-mono text-slate-950">{selectedIpLog?.ipAddress || selectedIpLog?.ipLookup?.ip || 'None'}</strong>
                      )}
                    </div>
                    <div className="flex justify-between gap-4"><span className="text-slate-500">Location</span><strong className="text-slate-950">{selectedIpLog ? `${selectedIpLog.ipLookup.city}, ${selectedIpLog.ipLookup.country}` : 'None'}</strong></div>
                    <div className="flex justify-between gap-4"><span className="text-slate-500">ISP</span><strong className="text-slate-950">{selectedIpLog?.ipLookup?.isp || 'Unknown'}</strong></div>
                    <div className="flex justify-between gap-4"><span className="text-slate-500">VPN</span><strong className="text-slate-950">{selectedIpLog?.ipLookup?.vpn || 'Unknown'}</strong></div>
                    <div className="flex justify-between gap-4"><span className="text-slate-500">Last Seen</span><strong className="text-slate-950">{selectedIpLog ? dateText(selectedIpLog.createdAt) : 'None'}</strong></div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full min-w-[980px] text-sm text-slate-800">
                  <thead className="bg-slate-100 text-left text-slate-500">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">IP</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">ISP</th>
                      <th className="p-3">VPN</th>
                      <th className="p-3">Browser</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr><td className="p-6 text-center text-slate-500" colSpan={7}>No login IP logs yet.</td></tr>
                    ) : logs.map((log) => (
                      <tr key={log.id} className={log.id === selectedIpLog?.id ? 'border-t border-slate-200 bg-cyan-50' : 'border-t border-slate-200'}>
                        <td className="p-3">{dateText(log.createdAt)}</td>
                        <td className="p-3 font-mono">
                          {log.ipLookup.lookupUrl ? (
                            <a
                              href={log.ipLookup.lookupUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-teal-700 underline-offset-4 hover:underline"
                              title="Open IP lookup"
                            >
                              {log.ipAddress || log.ipLookup.ip}
                            </a>
                          ) : (
                            log.ipAddress || log.ipLookup.ip
                          )}
                        </td>
                        <td className="p-3">{log.ipLookup.city}, {log.ipLookup.country}</td>
                        <td className="p-3">{log.ipLookup.isp}</td>
                        <td className="p-3">
                          <Badge variant={log.ipLookup.vpn === 'unknown' ? 'outline' : 'default'}>{log.ipLookup.vpn}</Badge>
                        </td>
                        <td className="max-w-[260px] truncate p-3">{log.userAgent || 'Unknown'}</td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className={lightButtonClass} onClick={() => setSelectedIpLogId(log.id)}>View Map</Button>
                            <Button size="sm" variant="destructive" onClick={() => ipAction.mutate({ action: 'block', ip: log.ipAddress || log.ipLookup.ip })}>Block</Button>
                            <Button size="sm" className={primaryButtonClass} onClick={() => ipAction.mutate({ action: 'whitelist', ip: log.ipAddress || log.ipLookup.ip })}>Whitelist</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-slate-600">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                VPN/ISP precision depends on your IP intelligence provider. Lookup links are included for external enrichment and review.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <CheckCircle2 className="h-4 w-4 text-lime-400" />
        Blocked IPs are denied on login unless they are also in the whitelist.
      </div>
    </div>
  );
}
