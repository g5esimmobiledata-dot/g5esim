import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

type StorefrontSmtpSettings = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  allowSelfSigned: boolean;
  isEnabled: boolean;
  isConfigured?: boolean;
};

const defaultForm: StorefrontSmtpSettings = {
  host: '',
  port: 587,
  user: '',
  pass: '',
  fromEmail: '',
  fromName: '',
  allowSelfSigned: false,
  isEnabled: false,
  isConfigured: false,
};

export default function ResellerStorefrontSmtp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<StorefrontSmtpSettings>(defaultForm);

  const { data: smtp, isLoading } = useQuery<StorefrontSmtpSettings>({
    queryKey: ['/api/reseller/storefront/smtp'],
  });

  useEffect(() => {
    if (smtp) {
      setForm({
        ...defaultForm,
        ...smtp,
        port: Number(smtp.port || 587),
      });
    }
  }, [smtp]);

  const updateField = (field: keyof StorefrontSmtpSettings, value: string | number | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', '/api/reseller/storefront/smtp', {
        ...form,
        port: Number(form.port || 587),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/storefront/smtp'] });
      toast({
        title: 'SMTP saved',
        description: 'Your storefront email sender settings have been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message || 'Could not save storefront SMTP settings.',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Mail className="h-6 w-6 text-teal-300" />
          <h1 className="text-3xl font-semibold text-white">SMTP</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Send storefront customer emails from your own reseller or agent email account.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-950/70 text-white">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Storefront SMTP Sender</CardTitle>
              <CardDescription className="text-slate-400">
                When enabled, reseller customer emails use these credentials instead of the platform SMTP.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3">
              <Label htmlFor="smtp-enabled" className="text-sm text-slate-200">
                Enable
              </Label>
              <Switch
                id="smtp-enabled"
                checked={form.isEnabled}
                onCheckedChange={(checked) => updateField('isEnabled', checked)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="flex items-center gap-2 py-10 text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading SMTP settings...
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    className="mt-2"
                    value={form.host}
                    onChange={(event) => updateField('host', event.target.value)}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input
                    id="smtp-port"
                    className="mt-2"
                    type="number"
                    min={1}
                    max={65535}
                    value={form.port}
                    onChange={(event) => updateField('port', Number(event.target.value || 587))}
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-user">Username</Label>
                  <Input
                    id="smtp-user"
                    className="mt-2"
                    value={form.user}
                    onChange={(event) => updateField('user', event.target.value)}
                    placeholder="sender@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-pass">Password</Label>
                  <Input
                    id="smtp-pass"
                    className="mt-2"
                    type="password"
                    value={form.pass}
                    onChange={(event) => updateField('pass', event.target.value)}
                    placeholder={smtp?.isConfigured ? 'Stored password' : 'SMTP password'}
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-from-email">From Email</Label>
                  <Input
                    id="smtp-from-email"
                    className="mt-2"
                    value={form.fromEmail}
                    onChange={(event) => updateField('fromEmail', event.target.value)}
                    placeholder="sender@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-from-name">From Name</Label>
                  <Input
                    id="smtp-from-name"
                    className="mt-2"
                    value={form.fromName}
                    onChange={(event) => updateField('fromName', event.target.value)}
                    placeholder="Store name"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-300" />
                  <div>
                    <p className="font-medium text-slate-100">Allow self-signed certificate</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Use only when your SMTP provider requires it.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.allowSelfSigned}
                  onCheckedChange={(checked) => updateField('allowSelfSigned', checked)}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  className="bg-primary-gradient text-white"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save SMTP
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
