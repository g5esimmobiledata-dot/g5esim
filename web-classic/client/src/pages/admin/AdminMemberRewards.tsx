import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Award,
  BadgeDollarSign,
  Crown,
  Gem,
  Loader2,
  Save,
  Search,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/contexts/TranslationContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

type TierKey = 'standard' | 'gold' | 'platinum';

type TierConfig = {
  key: TierKey;
  label: string;
  rewardRatePercent: number;
  conversionThreshold: number;
  color?: string;
};

type ProgramConfig = {
  enabled: boolean;
  currency: string;
  tiers: Record<TierKey, TierConfig>;
};

type ProgramResponse = {
  config: ProgramConfig;
  stats: {
    totalMembers: number;
    standardMembers: number;
    goldMembers: number;
    platinumMembers: number;
    totalRewardBalance: string;
    lifetimeRewards: string;
  };
};

type MemberRow = {
  id: string;
  displayUserId?: number;
  email: string;
  name?: string | null;
  phone?: string | null;
  role: string;
  memberTier: TierKey;
  memberRewardBalance: string;
  memberRewardLifetime: string;
  walletBalance: string;
};

type MembersResponse = {
  data: MemberRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const tierOrder: TierKey[] = ['standard', 'gold', 'platinum'];

const fallbackProgram: ProgramConfig = {
  enabled: true,
  currency: 'USD',
  tiers: {
    standard: {
      key: 'standard',
      label: 'Standard Member',
      rewardRatePercent: 1,
      conversionThreshold: 10,
      color: 'slate',
    },
    gold: {
      key: 'gold',
      label: 'Gold Member',
      rewardRatePercent: 2,
      conversionThreshold: 25,
      color: 'amber',
    },
    platinum: {
      key: 'platinum',
      label: 'Platinum Member',
      rewardRatePercent: 3,
      conversionThreshold: 50,
      color: 'cyan',
    },
  },
};

function money(value: unknown) {
  return Number(value || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

function tierIcon(tier: TierKey) {
  if (tier === 'gold') return Crown;
  if (tier === 'platinum') return Gem;
  return Sparkles;
}

function tierBadgeClass(tier: TierKey) {
  if (tier === 'gold') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (tier === 'platinum') return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function parseError(error: Error) {
  return error.message.replace(/^\d+:\s*/, '');
}

const lightInputClass =
  'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500';
const lightOutlineButtonClass =
  'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';
const statCardClass = 'rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm';
const primaryButtonClass = 'bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]';
const tableSwitchClass = [
  'h-7 w-14 border border-slate-300 bg-slate-200 shadow-inner',
  'data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500',
  'data-[state=unchecked]:border-slate-300 data-[state=unchecked]:bg-slate-200',
  '[&>span]:h-6 [&>span]:w-6 [&>span]:bg-white [&>span]:shadow-md [&>span]:data-[state=checked]:translate-x-7',
].join(' ');

export default function AdminMemberRewards() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const tr = (key: string, fallback: string, params?: Record<string, string | number>) =>
    t(`adminPanel.admin.memberRewards.${key}`, fallback, params);
  const [form, setForm] = useState<ProgramConfig>(fallbackProgram);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data: programData, isLoading: isProgramLoading } = useQuery<ProgramResponse>({
    queryKey: ['/api/admin/member-rewards'],
  });

  const { data: membersData, isLoading: isMembersLoading } = useQuery<MembersResponse>({
    queryKey: ['/api/admin/member-rewards/members', { page, search, tier: tierFilter }],
  });

  useEffect(() => {
    if (programData?.config) {
      setForm(programData.config);
    }
  }, [programData?.config]);

  const saveProgramMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PUT', '/api/admin/member-rewards', form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/member-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member-rewards'] });
      toast({
        title: tr('toast.saved', 'Member rewards updated'),
        description: tr('toast.savedDescription', 'The program settings are now live for members.'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: tr('toast.saveFailed', 'Failed to save member rewards'),
        description: parseError(error),
        variant: 'destructive',
      });
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: TierKey }) => {
      const res = await apiRequest('PATCH', `/api/admin/member-rewards/members/${userId}/tier`, {
        tier,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/member-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/member-rewards/members'] });
      toast({
        title: tr('toast.tierUpdated', 'Member tier updated'),
        description: tr('toast.tierUpdatedDescription', 'The selected customer now uses the new tier.'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: tr('toast.tierUpdateFailed', 'Failed to update tier'),
        description: parseError(error),
        variant: 'destructive',
      });
    },
  });

  const updateTier = (tier: TierKey, field: keyof TierConfig, value: string | number) => {
    setForm((current) => ({
      ...current,
      tiers: {
        ...current.tiers,
        [tier]: {
          ...current.tiers[tier],
          [field]:
            field === 'rewardRatePercent' || field === 'conversionThreshold'
              ? Number(value)
              : value,
        },
      },
    }));
  };

  const stats = programData?.stats;
  const members = membersData?.data || [];
  const pagination = membersData?.pagination || { page: 1, totalPages: 1, total: 0 };
  const tierLabel = (tier: TierKey) => {
    if (tier === 'gold') return tr('tiers.gold', 'Gold');
    if (tier === 'platinum') return tr('tiers.platinum', 'Platinum');
    return tr('tiers.standard', 'Standard');
  };
  const memberTypeLabel = (tier: TierKey, configuredLabel?: string) => {
    const normalized = String(configuredLabel || '').toLowerCase();
    if (!normalized) {
      if (tier === 'gold') return tr('memberTypes.gold', 'Gold Member');
      if (tier === 'platinum') return tr('memberTypes.platinum', 'Platinum Member');
      return tr('memberTypes.standard', 'Standard Member');
    }
    if (normalized === 'gold member') return tr('memberTypes.gold', 'Gold Member');
    if (normalized === 'platinum member' || normalized === 'platium member') {
      return tr('memberTypes.platinum', 'Platinum Member');
    }
    if (normalized === 'standard member') return tr('memberTypes.standard', 'Standard Member');
    return configuredLabel || tr('memberTypes.standard', 'Standard Member');
  };
  const roleLabel = (role?: string) => {
    const normalized = String(role || '').toLowerCase();
    if (normalized === 'admin' || normalized === 'super_admin') return tr('roles.admin', 'Admin');
    if (normalized === 'agent') return tr('roles.agent', 'Agent');
    if (normalized === 'reseller') return tr('roles.reseller', 'Reseller');
    return tr('roles.customer', 'Customer');
  };

  return (
    <div className="space-y-6 p-6 text-slate-900 dark:text-slate-100 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-50 text-[#168b80]">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{tr('title', 'Member Rewards')}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {tr('description', 'Set member tiers, reward percentages, conversion limits, and customer member type.')}
              </p>
            </div>
          </div>
        </div>

        <Button
          className={`gap-2 ${primaryButtonClass}`}
          disabled={saveProgramMutation.isPending}
          onClick={() => saveProgramMutation.mutate()}
        >
          {saveProgramMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saveProgramMutation.isPending ? tr('saving', 'Saving...') : tr('saveProgram', 'Save Program')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className={statCardClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#168b80]">{tr('stats.programStatus', 'Program Status')}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{form.enabled ? tr('status.enabled', 'Enabled') : tr('status.disabled', 'Disabled')}</p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, enabled: checked }))}
                className={tableSwitchClass}
              />
            </div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-teal-600" />
              <div>
                <p className="text-sm font-medium text-teal-700">{tr('stats.totalMembers', 'Total Members')}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{stats?.totalMembers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <BadgeDollarSign className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-700">{tr('stats.rewardBalance', 'Reward Balance')}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{money(stats?.totalRewardBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-cyan-600" />
              <div>
                <p className="text-sm font-medium text-cyan-700">{tr('stats.lifetimeRewards', 'Lifetime Rewards')}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{money(stats?.lifetimeRewards)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-950">{tr('settings.title', 'Program Settings')}</CardTitle>
          <CardDescription className="text-slate-500">
            {tr('settings.description', 'Members earn this percentage from eligible purchases and can convert rewards after the threshold.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <div className="space-y-2">
              <Label htmlFor="reward-currency" className="text-slate-700">{tr('settings.currency', 'Currency')}</Label>
              <Input
                id="reward-currency"
                className={lightInputClass}
                value={form.currency}
                onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
              />
            </div>
          </div>

          {isProgramLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-56 rounded-xl" />
              <Skeleton className="h-56 rounded-xl" />
              <Skeleton className="h-56 rounded-xl" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {tierOrder.map((tier) => {
                const tierConfig = form.tiers[tier];
                const Icon = tierIcon(tier);

                return (
                  <div key={tier} className="rounded-md border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-slate-700 shadow-sm">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <Badge variant="outline" className={cn('capitalize', tierBadgeClass(tier))}>
                            {tierLabel(tier)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-slate-700">{tr('settings.memberTypeName', 'Member Type Name')}</Label>
                        <Input
                          className={lightInputClass}
                          value={memberTypeLabel(tier, tierConfig.label)}
                          onChange={(event) => updateTier(tier, 'label', event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700">{tr('settings.rewardPercentage', 'Reward Percentage %')}</Label>
                        <Input
                          className={lightInputClass}
                          type="number"
                          min="0"
                          step="0.01"
                          value={tierConfig.rewardRatePercent}
                          onChange={(event) => updateTier(tier, 'rewardRatePercent', event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700">{tr('settings.requiredRewards', 'Required Rewards to Convert')}</Label>
                        <Input
                          className={lightInputClass}
                          type="number"
                          min="0"
                          step="0.01"
                          value={tierConfig.conversionThreshold}
                          onChange={(event) => updateTier(tier, 'conversionThreshold', event.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-slate-950">{tr('members.title', 'Members')}</CardTitle>
              <CardDescription className="text-slate-500">
                {tr('members.description', 'Assign Standard, Gold, or Platinum member type to any customer.')}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  className={`pl-9 sm:w-72 ${lightInputClass}`}
                  placeholder={tr('members.searchPlaceholder', 'Search member')}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select
                value={tierFilter}
                onValueChange={(value) => {
                  setTierFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className={`sm:w-44 ${lightInputClass}`}>
                  <SelectValue placeholder={tr('members.filterTier', 'Filter tier')} />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-900">
                  <SelectItem value="all">{tr('members.allTiers', 'All Tiers')}</SelectItem>
                  <SelectItem value="standard">{tierLabel('standard')}</SelectItem>
                  <SelectItem value="gold">{tierLabel('gold')}</SelectItem>
                  <SelectItem value="platinum">{tierLabel('platinum')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isMembersLoading ? (
            <Skeleton className="h-72 rounded-xl" />
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs uppercase text-slate-700">
                      <th className="px-4 py-3 font-semibold">{tr('members.table.member', 'Member')}</th>
                      <th className="px-4 py-3 font-semibold">{tr('members.table.role', 'Role')}</th>
                      <th className="px-4 py-3 font-semibold">{tr('members.table.memberType', 'Member Type')}</th>
                      <th className="px-4 py-3 font-semibold">{tr('members.table.rewardBalance', 'Reward Balance')}</th>
                      <th className="px-4 py-3 font-semibold">{tr('members.table.lifetimeRewards', 'Lifetime Rewards')}</th>
                      <th className="px-4 py-3 font-semibold">{tr('members.table.wallet', 'Wallet')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                          {tr('members.empty', 'No members found.')}
                        </td>
                      </tr>
                    ) : (
                      members.map((member) => (
                        <tr key={member.id} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-950">
                              {member.name || member.email}
                            </div>
                            <div className="text-xs text-slate-500">{member.email}</div>
                          </td>
                          <td className="px-4 py-4 text-slate-600">{roleLabel(member.role)}</td>
                          <td className="px-4 py-4">
                            <Select
                              value={member.memberTier || 'standard'}
                              disabled={updateTierMutation.isPending}
                              onValueChange={(value) =>
                                updateTierMutation.mutate({
                                  userId: member.id,
                                  tier: value as TierKey,
                                })
                              }
                            >
                              <SelectTrigger className={`w-44 ${lightInputClass}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="border-slate-200 bg-white text-slate-900">
                                <SelectItem value="standard">{memberTypeLabel('standard')}</SelectItem>
                                <SelectItem value="gold">{memberTypeLabel('gold')}</SelectItem>
                                <SelectItem value="platinum">{memberTypeLabel('platinum')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-4 font-semibold text-[#168b80]">{money(member.memberRewardBalance)}</td>
                          <td className="px-4 py-4 font-medium text-slate-800">{money(member.memberRewardLifetime)}</td>
                          <td className="px-4 py-4 font-medium text-slate-800">{money(member.walletBalance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-slate-500">
                  {tr('members.showing', 'Showing {shown} of {total} members', {
                    shown: members.length,
                    total: pagination.total || 0,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={lightOutlineButtonClass}
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    {tr('pagination.previous', 'Previous')}
                  </Button>
                  <span className="font-medium text-slate-700">
                    {tr('pagination.page', 'Page {page} / {totalPages}', {
                      page: pagination.page || page,
                      totalPages: pagination.totalPages || 1,
                    })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className={lightOutlineButtonClass}
                    disabled={page >= (pagination.totalPages || 1)}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    {tr('pagination.next', 'Next')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
