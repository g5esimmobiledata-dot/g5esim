import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRightLeft,
  BadgeDollarSign,
  CheckCircle2,
  Crown,
  Gem,
  Gift,
  Loader2,
  Sparkles,
  Wallet,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type MemberTier = {
  key: 'standard' | 'gold' | 'platinum';
  label: string;
  rewardRatePercent: number;
  conversionThreshold: number;
  color: string;
};

type RewardTransaction = {
  id: string;
  type: 'earned' | 'converted' | 'adjustment';
  tier: string;
  amount: string;
  sourceAmount?: string | null;
  sourceType?: string | null;
  description?: string | null;
  balanceBefore: string;
  balanceAfter: string;
  createdAt: string;
};

type MemberRewardsDashboard = {
  tier: MemberTier;
  tiers: MemberTier[];
  nextTier: MemberTier | null;
  rewardBalance: number;
  lifetimeRewards: number;
  conversionThreshold: number;
  canConvert: boolean;
  progressPercent: number;
  remainingToConvert: number;
  transactions: RewardTransaction[];
};

function money(value: unknown) {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

function formatDate(value: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function tierIcon(tier: string) {
  if (tier === 'gold') return Crown;
  if (tier === 'platinum') return Gem;
  return Sparkles;
}

function transactionLabel(type: string) {
  if (type === 'converted') return 'Converted to Wallet';
  if (type === 'earned') return 'Reward Earned';
  return 'Adjustment';
}

export default function MemberRewards() {
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery<MemberRewardsDashboard>({
    queryKey: ['/api/member-rewards'],
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/member-rewards/convert');
      return res.json();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/member-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });

      const amount = response?.data?.conversion?.amount;
      toast({
        title: 'Rewards converted',
        description: `${money(amount)} was added to your wallet balance.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Conversion not available',
        description: error.message.replace(/^\d+:\s*/, ''),
        variant: 'destructive',
      });
    },
  });

  const currentTierIcon = useMemo(() => tierIcon(data?.tier?.key || 'standard'), [data?.tier?.key]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Member Rewards</CardTitle>
          <CardDescription>Rewards could not be loaded right now.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const CurrentTierIcon = currentTierIcon;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Member Rewards</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Collect rewards from package purchases and convert them to real wallet balance after
            reaching your member threshold.
          </p>
        </div>

        <Button
          className="gap-2"
          disabled={!data.canConvert || convertMutation.isPending}
          onClick={() => convertMutation.mutate()}
        >
          {convertMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRightLeft className="h-4 w-4" />
          )}
          Convert to Wallet
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data.tiers.map((tier) => {
          const Icon = tierIcon(tier.key);
          const active = tier.key === data.tier.key;

          return (
            <Card
              key={tier.key}
              className={cn(
                'overflow-hidden border-border/80',
                active && 'border-primary/50 bg-primary/5 shadow-md shadow-primary/10',
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  {active && (
                    <Badge className="bg-primary text-primary-foreground">
                      Current
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{tier.label}</CardTitle>
                <CardDescription>
                  {tier.rewardRatePercent}% reward on eligible purchases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border bg-background/70 p-3">
                  <div className="text-xs text-muted-foreground">Convert after</div>
                  <div className="mt-1 text-xl font-bold">{money(tier.conversionThreshold)}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CurrentTierIcon className="h-5 w-5 text-primary" />
                  {data.tier.label}
                </CardTitle>
                <CardDescription>
                  {data.tier.rewardRatePercent}% reward rate. Convert when rewards reach{' '}
                  {money(data.conversionThreshold)}.
                </CardDescription>
              </div>
              <Badge variant="outline" className="w-fit">
                {data.progressPercent}% Ready
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border bg-background p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BadgeDollarSign className="h-4 w-4" />
                  Reward Balance
                </div>
                <div className="mt-3 text-3xl font-bold">{money(data.rewardBalance)}</div>
              </div>
              <div className="rounded-xl border bg-background p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  Needed to Convert
                </div>
                <div className="mt-3 text-3xl font-bold">{money(data.remainingToConvert)}</div>
              </div>
              <div className="rounded-xl border bg-background p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  Lifetime Rewards
                </div>
                <div className="mt-3 text-3xl font-bold">{money(data.lifetimeRewards)}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Conversion progress</span>
                <span className="text-muted-foreground">
                  {money(data.rewardBalance)} / {money(data.conversionThreshold)}
                </span>
              </div>
              <Progress value={data.progressPercent} className="h-3" />
              <p className="text-sm text-muted-foreground">
                {data.canConvert
                  ? 'Your rewards are ready. Convert them to wallet balance any time.'
                  : `Collect ${money(data.remainingToConvert)} more rewards to unlock wallet conversion.`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How Rewards Work</CardTitle>
            <CardDescription>Simple rules for the member program.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border bg-background p-4">
              Buy eligible packages and rewards are added based on your tier percentage.
            </div>
            <div className="rounded-lg border bg-background p-4">
              Rewards stay separate from wallet balance until you reach the tier conversion limit.
            </div>
            <div className="rounded-lg border bg-background p-4">
              When converted, rewards become real wallet funds that can be used for top-ups or purchases.
            </div>
            {data.nextTier && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                Next available tier: <span className="font-semibold">{data.nextTier.label}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rewards History</CardTitle>
          <CardDescription>Track rewards earned and converted to wallet funds.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.transactions.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No reward activity yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">Type</th>
                    <th className="py-3 pr-4 font-medium">Description</th>
                    <th className="py-3 pr-4 font-medium">Tier</th>
                    <th className="py-3 pr-4 font-medium">Amount</th>
                    <th className="py-3 pr-4 font-medium">Balance</th>
                    <th className="py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b last:border-0">
                      <td className="py-4 pr-4">
                        <Badge
                          variant={transaction.type === 'converted' ? 'outline' : 'default'}
                          className={transaction.type === 'converted' ? '' : 'bg-emerald-600 text-white'}
                        >
                          {transactionLabel(transaction.type)}
                        </Badge>
                      </td>
                      <td className="py-4 pr-4 text-foreground">
                        {transaction.description || transaction.sourceType || '-'}
                      </td>
                      <td className="py-4 pr-4 capitalize text-muted-foreground">
                        {transaction.tier}
                      </td>
                      <td className="py-4 pr-4 font-semibold">
                        {money(transaction.amount)}
                      </td>
                      <td className="py-4 pr-4 text-muted-foreground">
                        {money(transaction.balanceAfter)}
                      </td>
                      <td className="py-4 text-muted-foreground">
                        {formatDate(transaction.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
