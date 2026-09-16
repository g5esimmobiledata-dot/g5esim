import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  Gift,
  Settings,
  Users,
  TrendingUp,
  DollarSign,
  Percent,
  Save,
  Download,
  Check,
  X,
  Search,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useTranslation } from '@/contexts/TranslationContext';
import { formatDisplayValue } from '@/lib/displayText';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getCurrencySymbol } from '@/lib/currency';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Types
interface ReferralSettings {
  id: string;
  enabled: boolean;
  rewardType: string;
  rewardValue: string;
  referredUserDiscount: string;
  minOrderAmount: string;
  expiryDays: number;
  termsAndConditions: string;
}

interface Referral {
  id: string;
  referralCode: string;
  status: string;
  rewardAmount: string | null;
  rewardPaid: boolean;
  completedAt: string | null;
  createdAt: string;
  referrerEmail: string | null;
  referrerName: string | null;
  referredEmail: string | null;
  referredName: string | null;
}

interface ReferralsResponse {
  referrals: Referral[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statistics: {
    totalReferrals: number;
    pending: number;
    completed: number;
    totalRewards: number;
    pendingPayouts: number;
  };
}

interface TopReferrer {
  userId: string;
  userEmail: string;
  userName: string | null;
  referralCode: string;
  totalReferrals: number;
  totalEarnings: string;
}

interface StatusDistributionItem {
  status: string;
  count: number;
}

interface MonthlyGrowthItem {
  month: string;
  count: number;
}

interface AnalyticsData {
  totalReferrals: number;
  completedReferrals: number;
  conversionRate: number;
  topReferrers: TopReferrer[];
  monthlyGrowth: MonthlyGrowthItem[];
  statusDistribution: StatusDistributionItem[];
  averageReward: number;
}

// Form schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  rewardType: z.enum(['percentage', 'fixed']),
  rewardValue: z.string().min(1, 'Reward value is required'),
  referredUserDiscount: z.string().min(1, 'Discount is required'),
  minOrderAmount: z.string().min(1, 'Minimum order amount is required'),
  expiryDays: z.number().min(1, 'Expiry days must be at least 1'),
  termsAndConditions: z.string(),
});

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

type SettingsFormData = z.infer<typeof settingsSchema>;

// // Settings Tab Component
// function SettingsTab() {
//   const { t } = useTranslation();
//   const { toast } = useToast();

//   const { data: settings, isLoading } = useQuery<ReferralSettings>({
//     queryKey: ['/api/admin/referrals/settings'],
//   });

//   const form = useForm<SettingsFormData>({
//     resolver: zodResolver(settingsSchema),
//     defaultValues: {
//       enabled: settings?.enabled || false,
//       rewardType: (settings?.rewardType as 'percentage' | 'fixed') || 'percentage',
//       rewardValue: settings?.rewardValue || '10',
//       referredUserDiscount: settings?.referredUserDiscount || '10',
//       minOrderAmount: settings?.minOrderAmount || '0',
//       expiryDays: settings?.expiryDays || 90,
//       termsAndConditions: settings?.termsAndConditions || '',
//     },
//   });

//   // Update form when settings load
//   useState(() => {
//     if (settings) {
//       form.reset({
//         enabled: settings.enabled,
//         rewardType: settings.rewardType as 'percentage' | 'fixed',
//         rewardValue: settings.rewardValue,
//         referredUserDiscount: settings.referredUserDiscount,
//         minOrderAmount: settings.minOrderAmount,
//         expiryDays: settings.expiryDays,
//         termsAndConditions: settings.termsAndConditions || '',
//       });
//     }
//   });

//   const saveMutation = useMutation({
//     mutationFn: async (data: SettingsFormData) => {
//       return await apiRequest('PUT', '/api/admin/referrals/settings', data);
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: ['/api/admin/referrals/settings'],
//       });
//       toast({
//         title: t('common.success'),
//         description: t('adminPanel.referrals.settingsSaved'),
//       });
//     },
//     onError: (error: any) => {
//       toast({
//         title: t('common.error'),
//         description: error.message || 'Failed to save settings',
//         variant: 'destructive',
//       });
//     },
//   });

//   const onSubmit = (data: SettingsFormData) => {
//     saveMutation.mutate(data);
//   };

//   if (isLoading) {
//     return (
//       <div className="space-y-6">
//         {[1, 2, 3, 4].map((i) => (
//           <Skeleton key={i} className="h-24" />
//         ))}
//       </div>
//     );
//   }

//   return (
//     <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
//       <Card>
//         <CardHeader>
//           <CardTitle>{t('adminPanel.admin.referrals.settings.title', 'Refferal Settings')}</CardTitle>
//           <CardDescription>{t('adminPanel.admin.referrals.settings.description', 'Configure the referral program settings')}</CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-6">
//           {/* Enable Program */}
//           <div className="flex items-center justify-between">
//             <div className="space-y-0.5">
//               <Label htmlFor="enabled">{t('adminPanel.referrals.enabled')}</Label>
//               <div className="text-sm text-muted-foreground">
//                 Enable or disable the referral program
//               </div>
//             </div>
//             <Switch
//               id="enabled"
//               checked={form.watch('enabled')}
//               onCheckedChange={(checked) => form.setValue('enabled', checked)}
//               data-testid="switch-enabled"
//             />
//           </div>

//           {/* Reward Type */}
//           <div className="space-y-3">
//             <Label>{t('adminPanel.referrals.rewardType')}</Label>
//             <RadioGroup
//               value={form.watch('rewardType')}
//               onValueChange={(value) =>
//                 form.setValue('rewardType', value as 'percentage' | 'fixed')
//               }
//               data-testid="radio-reward-type"
//             >
//               <div className="flex items-center space-x-2">
//                 <RadioGroupItem value="percentage" id="percentage" />
//                 <Label htmlFor="percentage" className="font-normal">
//                   {t('adminPanel.referrals.percentage')}
//                 </Label>
//               </div>
//               <div className="flex items-center space-x-2">
//                 <RadioGroupItem value="fixed" id="fixed" />
//                 <Label htmlFor="fixed" className="font-normal">
//                   {t('adminPanel.referrals.fixedAmount')}
//                 </Label>
//               </div>
//             </RadioGroup>
//           </div>

//           {/* Reward Value */}
//           <div className="space-y-2">
//             <Label htmlFor="rewardValue">
//               {t('adminPanel.referrals.rewardValue')} (
//               {form.watch('rewardType') === 'percentage' ? '%' : '$'})
//             </Label>
//             <Input
//               id="rewardValue"
//               type="number"
//               step="0.01"
//               {...form.register('rewardValue')}
//               data-testid="input-reward-value"
//             />
//             {form.formState.errors.rewardValue && (
//               <p className="text-sm text-destructive">
//                 {form.formState.errors.rewardValue.message}
//               </p>
//             )}
//           </div>

//           {/* Referred User Discount */}
//           <div className="space-y-2">
//             <Label htmlFor="referredUserDiscount">{t('adminPanel.referrals.referredDiscount')}</Label>
//             <Input
//               id="referredUserDiscount"
//               type="number"
//               step="0.01"
//               {...form.register('referredUserDiscount')}
//               data-testid="input-referred-discount"
//             />
//             {form.formState.errors.referredUserDiscount && (
//               <p className="text-sm text-destructive">
//                 {form.formState.errors.referredUserDiscount.message}
//               </p>
//             )}
//           </div>

//           {/* Min Order Amount */}
//           <div className="space-y-2">
//             <Label htmlFor="minOrderAmount">{t('adminPanel.referrals.minOrderAmount')}</Label>
//             <Input
//               id="minOrderAmount"
//               type="number"
//               step="0.01"
//               {...form.register('minOrderAmount')}
//               data-testid="input-min-order"
//             />
//             {form.formState.errors.minOrderAmount && (
//               <p className="text-sm text-destructive">
//                 {form.formState.errors.minOrderAmount.message}
//               </p>
//             )}
//           </div>

//           {/* Expiry Days */}
//           <div className="space-y-2">
//             <Label htmlFor="expiryDays">{t('adminPanel.referrals.expiryDays')}</Label>
//             <Input
//               id="expiryDays"
//               type="number"
//               {...form.register('expiryDays', { valueAsNumber: true })}
//               data-testid="input-expiry-days"
//             />
//             {form.formState.errors.expiryDays && (
//               <p className="text-sm text-destructive">{form.formState.errors.expiryDays.message}</p>
//             )}
//           </div>

//           {/* Terms & Conditions */}
//           <div className="space-y-2">
//             <Label htmlFor="termsAndConditions">{t('adminPanel.referrals.termsAndConditions')}</Label>
//             <Textarea
//               id="termsAndConditions"
//               rows={6}
//               placeholder="Enter terms and conditions..."
//               {...form.register('termsAndConditions')}
//               data-testid="textarea-terms"
//             />
//           </div>

//           <Button
//             type="submit"
//             disabled={saveMutation.isPending}
//             data-testid="button-save-settings"
//           >
//             <Save className="h-4 w-4 mr-2" />
//             {saveMutation.isPending ? t('common.loading') : t('adminPanel.referrals.saveSettings')}
//           </Button>
//         </CardContent>
//       </Card>
//     </form>
//   );
// }



// Settings Tab Component
function SettingsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<ReferralSettings>({
    queryKey: ['/api/admin/referrals/settings'],
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      enabled: settings?.enabled || false,
      rewardType: (settings?.rewardType as 'percentage' | 'fixed') || 'percentage',
      rewardValue: settings?.rewardValue || '10',
      referredUserDiscount: settings?.referredUserDiscount || '10',
      minOrderAmount: settings?.minOrderAmount || '0',
      expiryDays: settings?.expiryDays || 90,
      termsAndConditions: settings?.termsAndConditions || '',
    },
  });

  useState(() => {
    if (settings) {
      form.reset({
        enabled: settings.enabled,
        rewardType: settings.rewardType as 'percentage' | 'fixed',
        rewardValue: settings.rewardValue,
        referredUserDiscount: settings.referredUserDiscount,
        minOrderAmount: settings.minOrderAmount,
        expiryDays: settings.expiryDays,
        termsAndConditions: settings.termsAndConditions || '',
      });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      return await apiRequest('PUT', '/api/admin/referrals/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/admin/referrals/settings'],
      });
      toast({
        title: t('common.success', 'Success'),
        description: t('adminPanel.admin.referrals.settingsSaved', 'Settings saved successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('adminPanel.admin.referrals.saveFailed', 'Failed to save settings'),
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 text-slate-900">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card className="rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-950">
            {t('adminPanel.admin.referrals.settings.title', 'Referral Settings')}
          </CardTitle>

          <CardDescription className="text-slate-500">
            {t(
              'adminPanel.admin.referrals.settings.description',
              'Configure the referral program settings'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Enable Program */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled" className="text-slate-700">
                {t('adminPanel.admin.referrals.enabled', 'Enable Referral Program')}
              </Label>

              <div className="text-sm text-slate-500">
                {t(
                  'adminPanel.admin.referrals.enabledDescription',
                  'Enable or disable the referral program'
                )}
              </div>
            </div>

            <Switch
              id="enabled"
              checked={form.watch('enabled')}
              onCheckedChange={(checked) => form.setValue('enabled', checked)}
              className={tableSwitchClass}
              data-testid="switch-enabled"
            />
          </div>

          {/* Reward Type */}
          <div className="space-y-3">
            <Label className="text-slate-700">
              {t('adminPanel.admin.referrals.rewardType', 'Reward Type')}
            </Label>

            <RadioGroup
              value={form.watch('rewardType')}
              onValueChange={(value) =>
                form.setValue('rewardType', value as 'percentage' | 'fixed')
              }
              data-testid="radio-reward-type"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage" className="font-normal text-slate-700">
                  {t('adminPanel.admin.referrals.percentage', 'Percentage')}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="font-normal text-slate-700">
                  {t('adminPanel.admin.referrals.fixedAmount', 'Fixed Amount')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Reward Value */}
          <div className="space-y-2">
            <Label htmlFor="rewardValue" className="text-slate-700">
              {t('adminPanel.admin.referrals.rewardValue', 'Reward Value')} (
              {form.watch('rewardType') === 'percentage' ? '%' : '$'})
            </Label>

            <Input
              id="rewardValue"
              type="number"
              step="0.01"
              className={lightInputClass}
              {...form.register('rewardValue')}
              data-testid="input-reward-value"
            />

            {form.formState.errors.rewardValue && (
              <p className="text-sm text-destructive">
                {form.formState.errors.rewardValue.message}
              </p>
            )}
          </div>

          {/* Referred User Discount */}
          <div className="space-y-2">
            <Label htmlFor="referredUserDiscount" className="text-slate-700">
              {t('adminPanel.admin.referrals.referredDiscount', 'Referred User Discount')}
            </Label>

            <Input
              id="referredUserDiscount"
              type="number"
              step="0.01"
              className={lightInputClass}
              {...form.register('referredUserDiscount')}
              data-testid="input-referred-discount"
            />

            {form.formState.errors.referredUserDiscount && (
              <p className="text-sm text-destructive">
                {form.formState.errors.referredUserDiscount.message}
              </p>
            )}
          </div>

          {/* Minimum Order Amount */}
          <div className="space-y-2">
            <Label htmlFor="minOrderAmount" className="text-slate-700">
              {t('adminPanel.admin.referrals.minOrderAmount', 'Minimum Order Amount')}
            </Label>

            <Input
              id="minOrderAmount"
              type="number"
              step="0.01"
              className={lightInputClass}
              {...form.register('minOrderAmount')}
              data-testid="input-min-order"
            />

            {form.formState.errors.minOrderAmount && (
              <p className="text-sm text-destructive">
                {form.formState.errors.minOrderAmount.message}
              </p>
            )}
          </div>

          {/* Expiry Days */}
          <div className="space-y-2">
            <Label htmlFor="expiryDays" className="text-slate-700">
              {t('adminPanel.admin.referrals.expiryDays', 'Expiry Days')}
            </Label>

            <Input
              id="expiryDays"
              type="number"
              className={lightInputClass}
              {...form.register('expiryDays', { valueAsNumber: true })}
              data-testid="input-expiry-days"
            />

            {form.formState.errors.expiryDays && (
              <p className="text-sm text-destructive">
                {form.formState.errors.expiryDays.message}
              </p>
            )}
          </div>

          {/* Terms */}
          <div className="space-y-2">
            <Label htmlFor="termsAndConditions" className="text-slate-700">
              {t('adminPanel.admin.referrals.termsAndConditions', 'Terms & Conditions')}
            </Label>

            <Textarea
              id="termsAndConditions"
              rows={6}
              placeholder={t(
                'adminPanel.admin.referrals.termsPlaceholder',
                'Enter terms and conditions...'
              )}
              className={lightInputClass}
              {...form.register('termsAndConditions')}
              data-testid="textarea-terms"
            />
          </div>

          <Button
            type="submit"
            className={primaryButtonClass}
            disabled={saveMutation.isPending}
            data-testid="button-save-settings"
          >
            <Save className="h-4 w-4 mr-2" />

            {saveMutation.isPending
              ? t('adminPanel.common.loading', 'Saving...')
              : t('adminPanel.admin.referrals.saveSettings', 'Save Settings')}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

// Referrals Tab Component
function ReferralsTab() {
  const { t } = useTranslation();
  const { currencies } = useCurrency();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: referralsData, isLoading } = useQuery<ReferralsResponse>({
    queryKey: ['/api/admin/referrals'],
  });

  const referrals: Referral[] = referralsData?.referrals || [];

  const markPaidMutation = useMutation({
    mutationFn: async (referralId: string) => {
      return await apiRequest('POST', `/api/admin/referrals/${referralId}/mark-paid`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/referrals'] });
      toast({
        title: t('common.success', 'Success'),
        description: t('adminPanel.admin.referrals.markedPaid', 'Referral marked as paid'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('adminPanel.admin.referrals.markPaidFailed', 'Failed to mark as paid'),
        variant: 'destructive',
      });
    },
  });

  // Filter referrals
  const filteredReferrals = referrals.filter((ref: Referral) => {
    const matchesStatus = statusFilter === 'all' || ref.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      ref.referrerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.referredEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.referralCode.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Calculate stats - use API statistics if available, otherwise calculate locally
  const totalReferrals = referralsData?.statistics?.totalReferrals ?? referrals.length;
  const completedReferrals =
    referralsData?.statistics?.completed ??
    referrals.filter((r: Referral) => r.status === 'completed').length;
  const conversionRate = totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0;
  const totalRewardsPaid =
    referralsData?.statistics?.totalRewards ??
    referrals
      .filter((r: Referral) => r.rewardPaid && r.rewardAmount)
      .reduce((sum: number, r: Referral) => sum + parseFloat(r.rewardAmount || '0'), 0);
  const pendingPayouts =
    referralsData?.statistics?.pendingPayouts ??
    referrals
      .filter((r: Referral) => r.status === 'completed' && !r.rewardPaid && r.rewardAmount)
      .reduce((sum: number, r: Referral) => sum + parseFloat(r.rewardAmount || '0'), 0);
  const referralStatusLabel = (status: string) => {
    if (status === 'completed') return t('adminPanel.admin.referrals.completed', 'Completed');
    if (status === 'pending') return t('adminPanel.admin.referrals.pending', 'Pending');
    return formatDisplayValue(status);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Referrer Email',
      'Referred Email',
      'Code',
      'Status',
      'Reward Amount',
      'Paid',
      'Date',
    ];
    const rows = filteredReferrals.map((ref: Referral) => [
      ref.referrerEmail || '',
      ref.referredEmail || '',
      ref.referralCode,
      ref.status,
      ref.rewardAmount || '0',
      ref.rewardPaid ? 'Yes' : 'No',
      format(new Date(ref.createdAt), 'yyyy-MM-dd'),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row: string[]) => row.join(','))].join(
      '\n',
    );

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referrals-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: t('common.success', 'Success'),
      description: t('adminPanel.admin.referrals.exportSuccess', 'Exported referrals to CSV'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#168b80]">
              {t('adminPanel.admin.referrals.totalReferrals', 'Total Referrals')}
            </CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-950">{totalReferrals}</div>
          </CardContent>
        </Card>

        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-teal-700">
              {t('adminPanel.admin.referrals.conversionRate', 'Conversion Rate')}
            </CardTitle>
            <Percent className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-950">{conversionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">
              {t('adminPanel.admin.referrals.totalRewards', 'Total Rewards')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-950">
              {getCurrencySymbol('USD', currencies)}
              {totalRewardsPaid.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">
              {t('adminPanel.admin.referrals.pendingPayouts', 'Pending Payouts')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-950">
              {getCurrencySymbol('USD', currencies)}
              {pendingPayouts.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-slate-950">{t('adminPanel.admin.referrals.referralList', 'Referral List')}</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className={lightOutlineButtonClass}
                onClick={exportToCSV}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('adminPanel.admin.referrals.exportCSV', 'Export CSV')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder={t('adminPanel.admin.referrals.searchPlaceholder',"Search by email or code...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 ${lightInputClass}`}
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={`w-full sm:w-[180px] ${lightInputClass}`} data-testid="select-status-filter">
                <SelectValue placeholder={t('adminPanel.admin.referrals.filterStatus', 'Filter by status')} />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-900">
                <SelectItem value="all">{t('adminPanel.admin.referrals.allStatuses','All Statuses')}</SelectItem>
                <SelectItem value="pending">{t('adminPanel.admin.referrals.pending', 'Pending')}</SelectItem>
                <SelectItem value="completed"> {t('adminPanel.admin.referrals.completed', 'Completed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Referrals Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-950">{t('adminPanel.admin.referrals.noReferralsFound', 'No referrals found')}</h3>
              <p className="text-slate-500">
                {searchQuery || statusFilter !== 'all'
                  ? t('adminPanel.admin.referrals.adjustFilters', 'Try adjusting your filters')
                  : t('adminPanel.admin.referrals.waitingForReferrals', 'Referrals will appear here when users start sharing')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('adminPanel.admin.referrals.table.referrer', 'Referrer')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('adminPanel.admin.referrals.table.referredUser','Referred User')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('adminPanel.admin.referrals.table.code','Code')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('adminPanel.admin.referrals.table.status','Status')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('adminPanel.admin.referrals.table.reward',  'Reward' )}</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('adminPanel.admin.referrals.table.paid', 'Paid')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('adminPanel.admin.referrals.table.date', 'Date')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('adminPanel.admin.referrals.table.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferrals.map((referral: Referral, index: number) => (
                    <tr
                      key={referral.id}
                      className="border-b border-slate-200 hover:bg-slate-50"
                      data-testid={`row-referral-${index}`}
                    >
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <div className="font-semibold text-slate-950">{referral.referrerName || t('adminPanel.admin.referrals.unknown', 'Unknown')}</div>
                          <div className="text-slate-500">{referral.referrerEmail}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <div className="font-semibold text-slate-950">{referral.referredName || t('adminPanel.admin.referrals.unknown', 'Unknown')}</div>
                          <div className="text-slate-500">{referral.referredEmail}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <code className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {referral.referralCode}
                        </code>
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          variant={referral.status === 'completed' ? 'default' : 'secondary'}
                          className={
                            referral.status === 'completed'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }
                        >
                          {referralStatusLabel(referral.status)}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 font-semibold text-[#168b80]">
                        {referral.rewardAmount
                          ? `${getCurrencySymbol(
                            'USD',
                            currencies,
                          )}${parseFloat(referral.rewardAmount).toFixed(2)}`
                          : '-'}
                      </td>
                      <td className="py-4 px-4">
                        {referral.rewardPaid ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-slate-400" />
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-slate-600">
                        {format(new Date(referral.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="py-4 px-4">
                        {referral.status === 'completed' && !referral.rewardPaid && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={lightOutlineButtonClass}
                            onClick={() => markPaidMutation.mutate(referral.id)}
                            disabled={markPaidMutation.isPending}
                            data-testid={`button-mark-paid-${index}`}
                          >
                            {t('adminPanel.admin.referrals.markPaid', 'Mark Paid')}
                          </Button>
                        )}
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

// Analytics Tab Component
// function AnalyticsTab() {
//   const { t } = useTranslation();
//   const { currencies } = useCurrency();

//   const { data: analytics, isLoading } = useQuery<AnalyticsData>({
//     queryKey: ['/api/admin/referrals/analytics'],
//   });

//   console.log(analytics);

//   const COLORS = ['#14b8a6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

//   if (isLoading) {
//     return (
//       <div className="space-y-6">
//         {[1, 2, 3].map((i) => (
//           <Skeleton key={i} className="h-96" />
//         ))}
//       </div>
//     );
//   }

//   if (!analytics) {
//     return <div>No analytics data available</div>;
//   }

//   return (
//     <div className="space-y-6">
//       {/* Key Metrics */}
//       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
//             <Percent className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-3xl font-bold">
//               {Number(analytics?.conversionRate).toFixed(1)}%
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Avg Reward</CardTitle>
//             <DollarSign className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-3xl font-bold">
//               {getCurrencySymbol('USD', currencies)}
//               {analytics.averageReward.toFixed(2)}
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Avg Time to Convert</CardTitle>
//             <TrendingUp className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             {/* <div className="text-3xl font-bold">{analytics.avgTimeToConversion.toFixed(0)}d</div> */}
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Most Active Month</CardTitle>
//             <Gift className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             {/* <div className="text-2xl font-bold">{analytics.mostActiveMonth}</div> */}
//           </CardContent>
//         </Card>
//       </div>

//       {/* Monthly Growth Chart */}
//       <Card>
//         <CardHeader>
//           <CardTitle>{t('adminPanel.referrals.monthlyGrowth')}</CardTitle>
//           <CardDescription>Referral trends over time</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <ResponsiveContainer width="100%" height={300}>
//             <LineChart data={analytics.monthlyGrowth}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="month" />
//               <YAxis />
//               <Tooltip />
//               <Legend />
//               <Line type="monotone" dataKey="count" stroke="#14b8a6" name="Total Referrals" />
//             </LineChart>
//           </ResponsiveContainer>
//         </CardContent>
//       </Card>

//       <div className="grid gap-6 md:grid-cols-2">
//         {/* Top Referrers Chart */}
//         <Card>
//           <CardHeader>
//             <CardTitle>{t('adminPanel.referrals.topReferrers')}</CardTitle>
//             <CardDescription>Top 10 referrers by successful referrals</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={analytics.topReferrers.slice(0, 10)}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="userEmail" angle={-45} textAnchor="end" height={100} />
//                 <YAxis />
//                 <Tooltip />
//                 <Bar dataKey="totalReferrals" fill="#14b8a6" name="Referrals" />
//               </BarChart>
//             </ResponsiveContainer>
//           </CardContent>
//         </Card>

//         {/* Status Distribution Chart */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Status Distribution</CardTitle>
//             <CardDescription>Referral status breakdown</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <ResponsiveContainer width="100%" height={300}>
//               <PieChart>
//                 <Pie
//                   data={analytics.statusDistribution}
//                   cx="50%"
//                   cy="50%"
//                   labelLine={false}
//                   label={({ status, percent }: { status: string; percent: number }) =>
//                     `${status} (${(percent * 100).toFixed(0)}%)`
//                   }
//                   outerRadius={80}
//                   fill="#8884d8"
//                   dataKey="count"
//                   nameKey="status"
//                 >
//                   {analytics.statusDistribution.map(
//                     (entry: StatusDistributionItem, index: number) => (
//                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                     ),
//                   )}
//                 </Pie>
//                 <Tooltip />
//               </PieChart>
//             </ResponsiveContainer>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }


// Analytics Tab Component
function AnalyticsTab() {
  const { t } = useTranslation();
  const { currencies } = useCurrency();

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/admin/referrals/analytics'],
  });

  console.log(analytics);

  const COLORS = ['#14b8a6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const analyticsStatusLabel = (status: string) => {
    if (status === 'completed') return t('adminPanel.admin.referrals.completed', 'Completed');
    if (status === 'pending') return t('adminPanel.admin.referrals.pending', 'Pending');
    return formatDisplayValue(status);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-96" />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return <div>{t('adminPanel.admin.referrals.noAnalytics', 'No analytics data available')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#168b80]">
              {t('adminPanel.admin.referrals.conversionRate', 'Conversion Rate')}
            </CardTitle>
            <Percent className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-950">
              {Number(analytics?.conversionRate).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">
              {t('adminPanel.admin.referrals.avgReward', 'Avg Reward')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-950">
              {getCurrencySymbol('USD', currencies)}
              {analytics.averageReward.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cyan-700">
              {t('adminPanel.admin.referrals.avgTimeToConvert', 'Avg Time to Convert')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            {/* <div className="text-3xl font-bold">{analytics.avgTimeToConversion.toFixed(0)}d</div> */}
          </CardContent>
        </Card>

        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">
              {t('adminPanel.admin.referrals.mostActiveMonth', 'Most Active Month')}
            </CardTitle>
            <Gift className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            {/* <div className="text-2xl font-bold">{analytics.mostActiveMonth}</div> */}
          </CardContent>
        </Card>

      </div>

      {/* Monthly Growth Chart */}
      <Card className="rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-950">
            {t('adminPanel.admin.referrals.monthlyGrowth', 'Monthly Growth')}
          </CardTitle>
          <CardDescription className="text-slate-500">
            {t('adminPanel.admin.referrals.trendsOverTime', 'Referral trends over time')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.monthlyGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#14b8a6"
                name={t('adminPanel.admin.referrals.totalReferrals', 'Total Referrals')}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">

        {/* Top Referrers Chart */}
        <Card className="rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-950">
              {t('adminPanel.admin.referrals.topReferrers', 'Top Referrers')}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {t(
                'adminPanel.admin.referrals.topReferrersDesc',
                'Top 10 referrers by successful referrals'
              )}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topReferrers.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="userEmail" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="totalReferrals"
                  fill="#14b8a6"
                  name={t('adminPanel.admin.referrals.referrals', 'Referrals')}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution Chart */}
        <Card className="rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-950">
              {t('adminPanel.admin.referrals.statusDistribution', 'Status Distribution')}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {t('adminPanel.admin.referrals.statusBreakdown', 'Referral status breakdown')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percent }: { status: string; percent: number }) =>
                    `${analyticsStatusLabel(status)} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                >
                  {analytics.statusDistribution.map(
                    (entry: StatusDistributionItem, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ),
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

// Main Component
export default function AdminReferrals() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>
          {String(t('adminPanel.admin.referrals.title', 'Referral Program'))} - Admin - eSIM Global
        </title>
        <meta
          name="description"
          content={String(t('adminPanel.admin.referrals.metaDescription', 'Manage the referral program'))}
        />
      </Helmet>

      <div className="space-y-6 p-6 text-slate-900 dark:text-slate-100 lg:p-8">
        <div className="flex flex-col items-start gap-3 md:flex-row">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-50 text-[#168b80]">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {t('adminPanel.admin.referrals.title', 'Referral Program')}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t('adminPanel.admin.referrals.description', 'Manage and track your referral program')}
            </p>
          </div>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="flex w-full gap-1 bg-white p-1 text-slate-600 shadow-sm">
            <TabsTrigger
              value="settings"
              className="flex-1 gap-1 data-[state=active]:bg-[#58cbbb] data-[state=active]:text-slate-950 sm:gap-2"
              data-testid="tab-settings"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden xs:inline text-sm">{t('adminPanel.admin.referrals.settings', 'Settings')}</span>
              <span className="xs:hidden text-xs">{t("adminPanel.admin.referrals.settings", "Settings")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="referrals"
              className="flex-1 gap-1 data-[state=active]:bg-[#58cbbb] data-[state=active]:text-slate-950 sm:gap-2"
              data-testid="tab-referrals"
            >
              <Users className="h-4 w-4" />
              <span className="hidden xs:inline text-sm">{t('adminPanel.admin.referrals.referrals', 'Referrals')}</span>
              <span className="xs:hidden text-xs">{t('adminPanel.admin.referrals.referrals', 'Referrals')}</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="flex-1 gap-1 data-[state=active]:bg-[#58cbbb] data-[state=active]:text-slate-950 sm:gap-2"
              data-testid="tab-analytics"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden xs:inline text-sm">{t('adminPanel.admin.referrals.analytics', 'Analytics')}</span>
              <span className="xs:hidden text-xs">{t('adminPanel.admin.referrals.analytics', 'Analytics')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>

          <TabsContent value="referrals">
            <ReferralsTab />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
