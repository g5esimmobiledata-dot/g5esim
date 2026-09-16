import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Edit3, Plus, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type RegistrationProfile = {
  id: string;
  name: string;
  description: string;
  status: string;
  isDefault: boolean;
  metadata: Record<string, any>;
};

const primaryButtonClass = 'gap-2 bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]';

function yesNo(value: unknown) {
  return value ? 'Yes' : 'No';
}

function tariffLabel(name?: unknown) {
  return String(name || '').trim() || 'No Tariff';
}

export default function AdminSipRegistrationProfiles() {
  const profilesQuery = useQuery<{ data: RegistrationProfile[] }>({
    queryKey: ['/api/admin/sip-registration-profiles'],
  });
  const profiles = profilesQuery.data?.data || [];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            <ShieldCheck className="h-8 w-8 text-cyan-300" />
            SIP Registration Profile
          </h1>
          <p className="mt-2 text-slate-400">Control Which SIP Features Are Applied During Automatic Or Manual Registration.</p>
        </div>
        <Button asChild className={primaryButtonClass}>
          <Link href="/admin/sip-configuration/registration-profiles/create">
            <Plus className="h-4 w-4" />
            Create Registration Profile
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <CardTitle>Profile List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Calls</TableHead>
                <TableHead>Monthly Fees</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-slate-500">No SIP Registration Profiles Found.</TableCell>
                </TableRow>
              ) : (
                profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="font-medium">{profile.name}</div>
                      <div className="text-xs text-slate-500">{profile.description}</div>
                    </TableCell>
                    <TableCell>{profile.isDefault ? <Badge className="bg-teal-50 text-teal-700">Default</Badge> : 'No'}</TableCell>
                    <TableCell>
                      <div>Internal: {yesNo(profile.metadata.allowInternalCalls)} / {tariffLabel(profile.metadata.internalTariffName)}</div>
                      <div className="text-xs text-slate-500">International: {yesNo(profile.metadata.allowInternationalCalls)} / {tariffLabel(profile.metadata.internationalTariffName)}</div>
                    </TableCell>
                    <TableCell>
                      SIP {profile.metadata.sipMonthlyFee || '0.00'} / DID {profile.metadata.didMonthlyFee || '0.00'}
                    </TableCell>
                    <TableCell className="max-w-md">
                      Voicemail {yesNo(profile.metadata.voicemailEnabled)}, Callback {yesNo(profile.metadata.callbackEnabled)}, Recording {yesNo(profile.metadata.callRecordingEnabled)}, Chat {yesNo(profile.metadata.chatEnabled)}
                    </TableCell>
                    <TableCell>
                      <Badge className={profile.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-700'}>
                        {profile.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" className={primaryButtonClass}>
                        <Link href={`/admin/sip-configuration/registration-profiles/${profile.id}/edit`}>
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
