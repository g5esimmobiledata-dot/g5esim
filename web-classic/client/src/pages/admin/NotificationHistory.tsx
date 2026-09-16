import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Bell,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  Smartphone,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { User } from '@shared/schema';
import { useTranslation } from '@/contexts/TranslationContext';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationHistoryItem {
  id: string;
  iccid: string;
  type: string;
  processed: boolean;
  emailSent: boolean;
  error: string | null;
  webhookPayload: any;
  createdAt: string;
}

interface NotificationHistoryResponse {
  notifications: NotificationHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

type PushAudience = 'all' | 'users' | 'agents' | 'resellers' | 'single';

type PushPricingRule = {
  pricingMode: 'free' | 'paid';
  pricePerNotification: number;
  monthlyFee: number;
};

type PushNotificationSettings = {
  agent: PushPricingRule;
  reseller: PushPricingRule;
};

const defaultPushSettings: PushNotificationSettings = {
  agent: { pricingMode: 'free', pricePerNotification: 0, monthlyFee: 0 },
  reseller: { pricingMode: 'free', pricePerNotification: 0, monthlyFee: 0 },
};

const panelClass = 'border-slate-200 bg-white text-slate-950 shadow-sm';
const statCardClass = 'border-slate-200 bg-white text-slate-950 shadow-sm';
const primaryButtonClass = 'gap-2 bg-teal-300 text-slate-950 hover:bg-teal-200';
const lightButtonClass = 'gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50';
const darkFieldClass =
  'border-slate-700 bg-[#071b33] text-white placeholder:text-slate-400 focus-visible:ring-teal-400';
const darkSelectClass =
  'border-slate-700 bg-[#071b33] text-white focus:ring-teal-400 focus-visible:ring-teal-400';
const darkSelectContentClass = 'border-slate-700 bg-[#071b33] text-white';
const labelClass = 'text-sm text-slate-700';
const tableHeadClass = 'text-slate-500';
const tableCellClass = 'text-slate-800';
const dialogClass = 'max-h-[90vh] overflow-y-auto border-slate-200 bg-white text-slate-950';

// Note: These labels will be translated dynamically in getTypeInfo function

export default function NotificationHistory() {
  const { t, isRTL } = useTranslation();
  const formatText = (text: string, params?: Record<string, string | number>) =>
    params
      ? text.replace(/\{(\w+)\}/g, (match, paramKey) => params[paramKey]?.toString() || match)
      : text;
  const tr = (key: string, english: string, arabic: string, params?: Record<string, string | number>) =>
    isRTL ? formatText(arabic, params) : t(key, english, params);
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [processedFilter, setProcessedFilter] = useState<boolean | null>(null);
  const [emailSentFilter, setEmailSentFilter] = useState<boolean | null>(null);
  const [iccidSearch, setIccidSearch] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<NotificationHistoryItem | null>(
    null,
  );
  const [showCustomNotificationModal, setShowCustomNotificationModal] = useState(false);
  const [open, setOpen] = useState(false);
  const [pushSettingsDraft, setPushSettingsDraft] =
    useState<PushNotificationSettings>(defaultPushSettings);
  // Custom notification form state
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [recipientType, setRecipientType] = useState<PushAudience>('all');
  const [recipientUserId, setRecipientUserId] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [sendInApp, setSendInApp] = useState(true);
  const [sendPush, setSendPush] = useState(true);

  const itemsPerPage = 20;
  const { toast } = useToast();

  const [search, setSearch] = useState('');

  const { data: customersRes } = useQuery<User[]>({
    queryKey: ['/api/admin/customers', search],
    queryFn: () => fetch(`/api/admin/customers?search=${search}`).then((res) => res.json()),
  });

  // console.log(customersRes);

  const customers = customersRes?.data?.data;

  const { data: pushSettingsRes } = useQuery({
    queryKey: ['/api/admin/notifications/push-settings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/notifications/push-settings', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch push notification settings');
      return res.json();
    },
  });

  useEffect(() => {
    if (pushSettingsRes?.data) {
      setPushSettingsDraft({
        agent: { ...defaultPushSettings.agent, ...pushSettingsRes.data.agent },
        reseller: { ...defaultPushSettings.reseller, ...pushSettingsRes.data.reseller },
      });
    }
  }, [pushSettingsRes?.data]);

  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/notifications/stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/notifications/stats');
      if (!res.ok) throw new Error(tr('adminPanel.admin.notifications.error.statsFailed', 'Failed to fetch stats', 'فشل جلب الإحصائيات'));
      return res.json();
    },
  });

  const stats = statsRes?.data;

  const notificationStats = stats?.notifications;
  const customStats = stats?.customNotifications;

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append('page', currentPage.toString());
    params.append('limit', itemsPerPage.toString());

    if (sourceFilter !== 'all') {
      params.append('source', sourceFilter);
    }
    if (typeFilter !== 'all') {
      params.append('type', typeFilter);
    }
    if (iccidSearch) {
      params.append('iccid', iccidSearch);
    }
    if (processedFilter !== null) {
      params.append('processed', processedFilter.toString());
    }
    if (emailSentFilter !== null) {
      params.append('emailSent', emailSentFilter.toString());
    }

    return params.toString();
  };

  const { data: historyData, isLoading } = useQuery<NotificationHistoryResponse>({
    queryKey: [
      '/api/admin/notifications/history',
      currentPage,
      sourceFilter,
      typeFilter,
      iccidSearch,
      processedFilter,
      emailSentFilter,
    ],
    queryFn: async () => {
      const response = await fetch(`/api/admin/notifications/history?${buildQueryParams()}`);
      if (!response.ok)
        throw new Error(
          tr('adminPanel.admin.notifications.error.fetchFailed', 'Failed to fetch notification history', 'فشل جلب سجل الإشعارات'),
        );
      return response.json();
    },
  });

  const savePushSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PUT', '/api/admin/notifications/push-settings', pushSettingsDraft);
      const json = await response.json();
      return json.data || json;
    },
    onSuccess: (settings: PushNotificationSettings) => {
      setPushSettingsDraft(settings);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications/push-settings'] });
      toast({
        title: 'Push settings saved',
        description: 'Agent and reseller push notification pricing was updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Push settings failed',
        description: error.message || 'Could not save push notification settings.',
        variant: 'destructive',
      });
    },
  });

  const sendCustomNotificationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/notifications/send-custom', {
        subject: customSubject,
        message: customMessage,
        audience: recipientType,
        recipientUserId: recipientType === 'single' ? recipientUserId : undefined,
        sendEmail,
        sendInApp,
        sendPush,
      });
      const json = await response.json();
      return json.data || json;
    },
    onSuccess: (data: any) => {
      const parts = [];
      const tokensAttempted = Number(data.tokensAttempted || 0);
      const pushSent = Number(data.pushSent || 0);
      const pushFailed = Number(data.pushFailed || 0);
      const recipients = Number(data.recipients || 0);
      const pushErrors = Array.isArray(data.pushErrors) ? data.pushErrors : [];
      const firstPushError = pushErrors[0];

      if (sendPush) {
        parts.push(`${pushSent} mobile push sent`);
      }
      if (sendEmail && data.emailsSent > 0) {
        parts.push(
          tr('adminPanel.admin.notifications.success.emailsSent', `${data.emailsSent} email(s) sent`, 'تم إرسال {count} بريد إلكتروني', {
            count: data.emailsSent,
          }),
        );
      }
      if (sendInApp && data.inAppSent > 0) {
        parts.push(
          tr(
            'adminPanel.admin.notifications.success.inAppSent',
            `${data.inAppSent} in-app notification(s) sent`,
            'تم إرسال {count} إشعار داخل التطبيق',
            { count: data.inAppSent },
          ),
        );
      }
      if (sendPush && (pushFailed > 0 || (recipients > 0 && tokensAttempted === 0))) {
        const detail = firstPushError
          ? `${firstPushError.code || 'firebase'}: ${firstPushError.message || 'Firebase push failed'}`
          : tokensAttempted === 0
            ? 'No active mobile device token was found. Open the mobile app once on the device to register push.'
            : 'Check Firebase Admin SDK credentials and mobile app FCM registration.';

        toast({
          title: pushSent > 0 ? 'Some mobile pushes failed' : 'Mobile push failed',
          description: `${pushSent} mobile push sent, ${pushFailed} failed. ${detail} In-app notifications were still saved.`,
          variant: 'destructive',
        });
      } else {
        toast({
        title: tr('adminPanel.admin.notifications.success.title', 'Success', 'نجاح'),
        description:
          parts.length > 0
            ? parts.join(', ')
            : tr('adminPanel.admin.notifications.success.sent', 'Notification sent successfully', 'تم إرسال الإشعار بنجاح'),
      });
      }
      setCustomSubject('');
      setCustomMessage('');
      setRecipientUserId('');
      setShowCustomNotificationModal(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: tr('adminPanel.admin.notifications.error.title', 'Error', 'خطأ'),
        description:
          error.message || tr('adminPanel.admin.notifications.error.sendFailed', 'Failed to send notification', 'فشل إرسال الإشعار'),
        variant: 'destructive',
      });
    },
  });

  const notifications = historyData?.notifications || [];
  const totalPages = historyData ? Math.ceil(historyData.total / itemsPerPage) : 1;

  const handleExportCSV = () => {
    if (!notifications || notifications.length === 0) {
      toast({
        title: tr('adminPanel.admin.notifications.export.noData', 'No Data', 'لا توجد بيانات'),
        description: tr('adminPanel.admin.notifications.export.noNotifications', 'No notifications to export', 'لا توجد إشعارات للتصدير'),
        variant: 'destructive',
      });
      return;
    }

    const headers = [
      tr('adminPanel.admin.notifications.table.timestamp', 'Timestamp', 'الوقت'),
      tr('adminPanel.admin.notifications.table.type', 'Type', 'النوع'),
      t('adminPanel.admin.notifications.table.iccid', 'ICCID'),
      tr('adminPanel.admin.notifications.table.processed', 'Processed', 'تمت المعالجة'),
      tr('adminPanel.admin.notifications.table.emailSent', 'Email Sent', 'تم إرسال البريد'),
      tr('adminPanel.admin.notifications.table.error', 'Error', 'الخطأ'),
    ];
    const csvContent = [
      headers.join(','),
      ...notifications.map((n) =>
        [
          new Date(n.createdAt).toISOString(),
          n.type,
          n.iccid,
          n.processed
            ? tr('adminPanel.admin.notifications.csv.yes', 'Yes', 'نعم')
            : tr('adminPanel.admin.notifications.csv.no', 'No', 'لا'),
          n.emailSent
            ? tr('adminPanel.admin.notifications.csv.yes', 'Yes', 'نعم')
            : tr('adminPanel.admin.notifications.csv.no', 'No', 'لا'),
          n.error ? `"${n.error.replace(/"/g, '""')}"` : tr('adminPanel.admin.notifications.csv.none', 'None', 'لا يوجد'),
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-history-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: tr('adminPanel.admin.notifications.export.success', 'Export Successful', 'تم التصدير بنجاح'),
      description: tr(
        'adminPanel.admin.notifications.export.description',
        'Notification history exported to CSV',
        'تم تصدير سجل الإشعارات إلى CSV',
      ),
    });
  };

  const getTypeInfo = (type: string) => {
    const typeMap: Record<
      string,
      { variant: 'default' | 'secondary' | 'outline'; labelKey: string; color: string }
    > = {
      '75': {
        variant: 'outline',
        labelKey: 'adminPanel.admin.notifications.type.lowData75',
        color: 'text-yellow-600 dark:text-yellow-400',
      },
      '90': {
        variant: 'outline',
        labelKey: 'adminPanel.admin.notifications.type.lowData90',
        color: 'text-orange-600 dark:text-orange-400',
      },
      '3days': {
        variant: 'outline',
        labelKey: 'adminPanel.admin.notifications.type.expiring3Days',
        color: 'text-teal-600 dark:text-teal-400',
      },
      '1day': {
        variant: 'outline',
        labelKey: 'adminPanel.admin.notifications.type.expiring1Day',
        color: 'text-red-600 dark:text-red-400',
      },
      custom: {
        variant: 'outline',
        labelKey: 'adminPanel.admin.notifications.type.custom',
        color: 'text-teal-600 dark:text-teal-400',
      },
      push: {
        variant: 'outline',
        labelKey: 'adminPanel.admin.notifications.type.push',
        color: 'text-sky-600 dark:text-sky-400',
      },
    };

    const typeInfo = typeMap[type];
    if (typeInfo) {
      const fallback =
        type === '75'
          ? 'Low Data 75%'
          : type === '90'
            ? 'Low Data 90%'
            : type === '3days'
              ? 'Expiring 3 Days'
              : type === '1day'
                ? 'Expiring 1 Day'
                : type === 'push'
                  ? 'Mobile Push'
                : 'Custom';
      return {
        variant: typeInfo.variant,
        label: tr(
          typeInfo.labelKey,
          fallback,
          type === '75'
            ? 'استهلاك البيانات 75%'
            : type === '90'
              ? 'استهلاك البيانات 90%'
              : type === '3days'
                ? 'ينتهي خلال 3 أيام'
                : type === '1day'
                  ? 'ينتهي خلال يوم واحد'
                  : 'مخصص',
        ),
        color: typeInfo.color,
      };
    }
    return {
      variant: 'secondary' as const,
      label: type,
      color: 'text-gray-600 dark:text-gray-400',
    };
  };

  const updatePushPricing = (role: 'agent' | 'reseller', updates: Partial<PushPricingRule>) => {
    setPushSettingsDraft((current) => ({
      ...current,
      [role]: {
        ...current[role],
        ...updates,
      },
    }));
  };

  return (
    <div className="space-y-6 p-6 lg:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
            {tr('adminPanel.admin.notifications.title', 'Notifications', 'الإشعارات')}
          </h1>
          <p className="mt-1 text-sm leading-snug text-slate-300 sm:text-base">
            {tr(
              'adminPanel.admin.notifications.description',
              'View notification history and send custom notifications to customers',
              'اعرض سجل الإشعارات وأرسل إشعارات مخصصة إلى العملاء',
            )}
          </p>
        </div>

        <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={() => {
              setSendPush(true);
              setSendInApp(true);
              setSendEmail(false);
              setShowCustomNotificationModal(true);
            }}
            className={`order-1 h-11 flex-1 sm:order-none sm:h-10 ${primaryButtonClass}`}
            data-testid="button-send-push-notification"
          >
            <Smartphone className="h-4 w-4 shrink-0" />
            <span className="truncate">Send Push</span>
          </Button>
          <Button
            onClick={() => setShowCustomNotificationModal(true)}
            variant="outline"
            className={`order-1 h-11 flex-1 sm:order-none sm:h-10 ${lightButtonClass}`}
            data-testid="button-new-notification"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="truncate">{tr('adminPanel.admin.notifications.button.new', 'New Notification', 'إشعار جديد')}</span>
          </Button>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className={`order-2 h-11 flex-1 sm:order-none sm:h-10 ${lightButtonClass}`}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span className="truncate">{tr('adminPanel.admin.notifications.button.export', 'Export CSV', 'تصدير CSV')}</span>
          </Button>
        </div>
      </div>


      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Notifications */}
        <Card className={statCardClass}>
          <CardContent className="p-4 flex items-center gap-4">
            <Bell className="h-8 w-8 text-teal-500" />
            <div>
              <p className="text-sm text-teal-700">
                {tr('adminPanel.admin.notifications.stats.total', 'Total Notifications', 'إجمالي الإشعارات')}
              </p>
              <p className="text-2xl font-bold text-slate-950">
                {statsLoading ? '—' : (notificationStats?.total ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Unread */}
        <Card className={statCardClass}>
          <CardContent className="p-4 flex items-center gap-4">
            <AlertCircle className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-slate-600">
                {tr('adminPanel.admin.notifications.stats.unread', 'Unread', 'غير مقروءة')}
              </p>
              <p className="text-2xl font-bold text-slate-950">
                {statsLoading ? '—' : (notificationStats?.unread ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Emails Sent */}
        <Card className={statCardClass}>
          <CardContent className="p-4 flex items-center gap-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-slate-600">
                {tr('adminPanel.admin.notifications.stats.emailsSent', 'Emails Sent', 'رسائل البريد المرسلة')}
              </p>
              <p className="text-2xl font-bold text-slate-950">
                {statsLoading ? '—' : (customStats?.totalEmailsSent ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Emails Failed */}
        <Card className={statCardClass}>
          <CardContent className="p-4 flex items-center gap-4">
            <XCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-sm text-slate-600">
                {tr('adminPanel.admin.notifications.stats.emailsFailed', 'Emails Failed', 'رسائل البريد الفاشلة')}
              </p>
              <p className="text-2xl font-bold text-slate-950">
                {statsLoading ? '—' : (customStats?.totalEmailsFailed ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={panelClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
            <Settings2 className="h-5 w-5 text-teal-500" />
            Push Notification Access & Pricing
          </CardTitle>
          <CardDescription className="text-slate-500">
            Reseller and Agent access is controlled from Modules with the Push Notifications module. These prices apply when they send mobile push campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {(['reseller', 'agent'] as const).map((role) => (
              <div key={role} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold capitalize text-slate-950">{role} Push Notifications</h3>
                    <p className="text-xs text-slate-500">Set free or paid sending for {role} accounts.</p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {pushSettingsDraft[role].pricingMode}
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className={labelClass}>Pricing</Label>
                    <Select
                      value={pushSettingsDraft[role].pricingMode}
                      onValueChange={(value: 'free' | 'paid') => updatePushPricing(role, { pricingMode: value })}
                    >
                      <SelectTrigger className={darkSelectClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={darkSelectContentClass}>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Price / notification</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className={darkFieldClass}
                      value={pushSettingsDraft[role].pricePerNotification}
                      onChange={(event) =>
                        updatePushPricing(role, { pricePerNotification: Number(event.target.value || 0) })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Monthly fee</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className={darkFieldClass}
                      value={pushSettingsDraft[role].monthlyFee}
                      onChange={(event) => updatePushPricing(role, { monthlyFee: Number(event.target.value || 0) })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => savePushSettingsMutation.mutate()}
              disabled={savePushSettingsMutation.isPending}
              className={primaryButtonClass}
            >
              <Smartphone className="h-4 w-4" />
              {savePushSettingsMutation.isPending ? 'Saving...' : 'Save Push Pricing'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters Card */}
      <Card className={panelClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
            <Filter className="h-5 w-5 text-teal-500" />
            {tr('adminPanel.admin.notifications.filters.title', 'Filters', 'الفلاتر')}
          </CardTitle>
          <CardDescription className="text-slate-500">
            {tr(
              'adminPanel.admin.notifications.filters.description',
              'Filter notification history by type, status, and ICCID',
              'صف سجل الإشعارات حسب النوع والحالة وICCID',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Source Filter */}
            <div className="space-y-2">
              <Label className={labelClass}>{tr('adminPanel.admin.notifications.filters.source', 'Notification Source', 'مصدر الإشعار')}</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className={darkSelectClass} data-testid="select-source-filter">
                  <SelectValue
                    placeholder={tr('adminPanel.admin.notifications.filters.allSources', 'All Sources', 'كل المصادر')}
                  />
                </SelectTrigger>
                <SelectContent className={darkSelectContentClass}>
                  <SelectItem value="all">
                    {tr('adminPanel.admin.notifications.filters.allSources', 'All Sources', 'كل المصادر')}
                  </SelectItem>
                  <SelectItem value="airalo">
                    {tr('adminPanel.admin.notifications.filters.airaloWebhook', 'Airalo Webhook', 'Webhook Airalo')}
                  </SelectItem>
                  <SelectItem value="custom">
                    {tr('adminPanel.admin.notifications.filters.customNotification', 'Custom Notification', 'إشعار مخصص')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <Label className={labelClass}>{tr('adminPanel.admin.notifications.filters.typeLabel', 'Notification Type', 'نوع الإشعار')}</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className={darkSelectClass} data-testid="select-type-filter">
                  <SelectValue
                    placeholder={tr('adminPanel.admin.notifications.filters.allTypes', 'All Types', 'كل الأنواع')}
                  />
                </SelectTrigger>
                <SelectContent className={darkSelectContentClass}>
                  <SelectItem value="all">
                    {tr('adminPanel.admin.notifications.filters.allTypes', 'All Types', 'كل الأنواع')}
                  </SelectItem>
                  <SelectItem value="75">
                    {tr('adminPanel.admin.notifications.type.lowData75', 'Low Data 75%', 'استهلاك البيانات 75%')}
                  </SelectItem>
                  <SelectItem value="90">
                    {tr('adminPanel.admin.notifications.type.lowData90', 'Low Data 90%', 'استهلاك البيانات 90%')}
                  </SelectItem>
                  <SelectItem value="3days">
                    {tr('adminPanel.admin.notifications.type.expiring3Days', 'Expiring 3 Days', 'ينتهي خلال 3 أيام')}
                  </SelectItem>
                  <SelectItem value="1day">
                    {tr('adminPanel.admin.notifications.type.expiring1Day', 'Expiring 1 Day', 'ينتهي خلال يوم واحد')}
                  </SelectItem>
                  <SelectItem value="custom">
                    {tr('adminPanel.admin.notifications.type.custom', 'Custom', 'مخصص')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ICCID Search */}
            <div className="space-y-2">
              <Label className={labelClass} htmlFor="iccid-search">
                {t('adminPanel.admin.notifications.filters.iccid', 'ICCID')}
              </Label>
              <Input
                id="iccid-search"
                className={darkFieldClass}
                placeholder={tr(
                  'adminPanel.admin.notifications.filters.iccidPlaceholder',
                  'Search by ICCID...',
                  'ابحث بواسطة ICCID...',
                )}
                value={iccidSearch}
                onChange={(e) => setIccidSearch(e.target.value)}
                data-testid="input-iccid-search"
              />
            </div>

            {/* Processed Filter */}
            <div className="space-y-2">
              <Label className={labelClass}>
                {tr('adminPanel.admin.notifications.filters.processingStatus', 'Processing Status', 'حالة المعالجة')}
              </Label>
              <div className="flex items-center space-x-4 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processed-yes"
                    checked={processedFilter === true}
                    onCheckedChange={(checked) => setProcessedFilter(checked ? true : null)}
                    data-testid="checkbox-processed-yes"
                  />
                  <label
                    htmlFor="processed-yes"
                    className="text-sm font-medium leading-none text-slate-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {tr('adminPanel.admin.notifications.filters.processed', 'Processed', 'تمت المعالجة')}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processed-no"
                    checked={processedFilter === false}
                    onCheckedChange={(checked) => setProcessedFilter(checked ? false : null)}
                    data-testid="checkbox-processed-no"
                  />
                  <label
                    htmlFor="processed-no"
                    className="text-sm font-medium leading-none text-slate-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {tr('adminPanel.admin.notifications.filters.notProcessed', 'Not Processed', 'لم تتم المعالجة')}
                  </label>
                </div>
              </div>
            </div>

            {/* Email Sent Filter */}
            <div className="space-y-2">
              <Label className={labelClass}>{tr('adminPanel.admin.notifications.filters.emailStatus', 'Email Status', 'حالة البريد الإلكتروني')}</Label>
              <div className="flex items-center space-x-4 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email-yes"
                    checked={emailSentFilter === true}
                    onCheckedChange={(checked) => setEmailSentFilter(checked ? true : null)}
                    data-testid="checkbox-email-yes"
                  />
                  <label
                    htmlFor="email-yes"
                    className="text-sm font-medium leading-none text-slate-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {tr('adminPanel.admin.notifications.filters.sent', 'Sent', 'تم الإرسال')}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email-no"
                    checked={emailSentFilter === false}
                    onCheckedChange={(checked) => setEmailSentFilter(checked ? false : null)}
                    data-testid="checkbox-email-no"
                  />
                  <label
                    htmlFor="email-no"
                    className="text-sm font-medium leading-none text-slate-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {tr('adminPanel.admin.notifications.filters.notSent', 'Not Sent', 'لم يتم الإرسال')}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card className={panelClass}>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-teal-500"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto mb-4 h-12 w-12 text-slate-400" />
              <h3 className="mb-1 text-lg font-semibold text-slate-950">
                {tr('adminPanel.admin.notifications.empty.title', 'No Notifications Found', 'لم يتم العثور على إشعارات')}
              </h3>
              <p className="text-sm text-slate-500">
                {tr(
                  'adminPanel.admin.notifications.empty.description',
                  'No notification history matches your current filters',
                  'لا يوجد سجل إشعارات يطابق الفلاتر الحالية',
                )}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={tableHeadClass}>{tr('adminPanel.admin.notifications.table.timestamp', 'Timestamp', 'الوقت')}</TableHead>
                    <TableHead className={tableHeadClass}>{tr('adminPanel.admin.notifications.table.type', 'Type', 'النوع')}</TableHead>
                    <TableHead className={tableHeadClass}>{t('adminPanel.admin.notifications.table.iccid', 'ICCID')}</TableHead>
                    <TableHead className={tableHeadClass}>{tr('adminPanel.admin.notifications.table.processed', 'Processed', 'تمت المعالجة')}</TableHead>
                    {/* <TableHead>{t('adminPanel.admin.notifications.table.emailSent', 'Email Sent')}</TableHead> */}
                    <TableHead className={tableHeadClass}>{tr('adminPanel.admin.notifications.table.error', 'Error', 'الخطأ')}</TableHead>
                    <TableHead className={`text-right ${tableHeadClass}`}>
                      {tr('adminPanel.admin.notifications.table.actions', 'Actions', 'الإجراءات')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => {
                    const typeInfo = getTypeInfo(notification.type);
                    return (
                      <TableRow
                        key={notification.id}
                        className="cursor-pointer border-slate-200 hover:bg-slate-50"
                        data-testid={`row-notification-${notification.id}`}
                      >
                        <TableCell className={`font-mono text-sm ${tableCellClass}`}>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {new Date(notification.createdAt).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeInfo.variant} className={typeInfo.color}>
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-mono text-sm ${tableCellClass}`}>{notification.iccid}</TableCell>
                        <TableCell>
                          {notification.processed ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {tr('adminPanel.admin.notifications.badge.yes', 'Yes', 'نعم')}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              {tr('adminPanel.admin.notifications.badge.no', 'No', 'لا')}
                            </Badge>
                          )}
                        </TableCell>
                        {/* <TableCell>
                          {notification.emailSent ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {tr('adminPanel.admin.notifications.badge.yes', 'Yes', 'نعم')}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              {tr('adminPanel.admin.notifications.badge.no', 'No', 'لا')}
                            </Badge>
                          )}
                        </TableCell> */}
                        <TableCell>
                          {notification.error ? (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-destructive" />
                              <span className="text-sm text-destructive truncate max-w-[200px]">
                                {notification.error}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">
                              {tr('adminPanel.admin.notifications.badge.none', 'None', 'لا يوجد')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedNotification(notification)}
                            className="gap-2 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                            data-testid={`button-view-details-${notification.id}`}
                          >
                            <Eye className="h-4 w-4" />
                            {tr('adminPanel.admin.notifications.button.viewDetails', 'View Details', 'عرض التفاصيل')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                <div className="text-sm text-slate-500">
                  {tr(
                    'adminPanel.admin.notifications.pagination.showing',
                    'Showing {from} to {to} of {total} notifications',
                    'عرض {from} إلى {to} من أصل {total} إشعار',
                    {
                      from: (currentPage - 1) * itemsPerPage + 1,
                      to: Math.min(currentPage * itemsPerPage, historyData?.total || 0),
                      total: historyData?.total || 0,
                    },
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={lightButtonClass}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {tr('adminPanel.admin.notifications.pagination.previous', 'Previous', 'السابق')}
                  </Button>
                  <div className="text-sm font-medium text-slate-700">
                    {tr('adminPanel.admin.notifications.pagination.page', 'Page {current} of {total}', 'صفحة {current} من {total}', {
                      current: currentPage,
                      total: totalPages,
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={lightButtonClass}
                    data-testid="button-next-page"
                  >
                    {tr('adminPanel.admin.notifications.pagination.next', 'Next', 'التالي')}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification Details Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className={`max-w-3xl ${dialogClass}`}>
          <DialogHeader>
            <DialogTitle className="text-slate-950">
              {tr('adminPanel.admin.notifications.details.title', 'Notification Details', 'تفاصيل الإشعار')}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {tr(
                'adminPanel.admin.notifications.details.description',
                'Detailed webhook payload and processing information',
                'تفاصيل بيانات Webhook ومعلومات المعالجة',
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              {/* Summary Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">
                    {tr('adminPanel.admin.notifications.details.timestamp', 'Timestamp', 'الوقت')}
                  </Label>
                  <div className="font-mono text-sm text-slate-800">
                    {new Date(selectedNotification.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">
                    {tr('adminPanel.admin.notifications.details.type', 'Type', 'النوع')}
                  </Label>
                  <div className="mt-1">
                    <Badge variant={getTypeInfo(selectedNotification.type).variant}>
                      {getTypeInfo(selectedNotification.type).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">
                    {t('adminPanel.admin.notifications.details.iccid', 'ICCID')}
                  </Label>
                  <div className="font-mono text-sm text-slate-800">{selectedNotification.iccid}</div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">
                    {tr('adminPanel.admin.notifications.details.status', 'Status', 'الحالة')}
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={selectedNotification.processed ? 'default' : 'secondary'}>
                      {selectedNotification.processed
                        ? tr('adminPanel.admin.notifications.details.processed', 'Processed', 'تمت المعالجة')
                        : tr('adminPanel.admin.notifications.details.notProcessed', 'Not Processed', 'لم تتم المعالجة')}
                    </Badge>
                    <Badge variant={selectedNotification.emailSent ? 'default' : 'secondary'}>
                      {selectedNotification.emailSent
                        ? tr('adminPanel.admin.notifications.details.emailSent', 'Email Sent', 'تم إرسال البريد')
                        : tr('adminPanel.admin.notifications.details.noEmail', 'No Email', 'لا يوجد بريد')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Error (if any) */}
              {selectedNotification.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <Label className="text-xs text-destructive font-semibold">
                    {tr('adminPanel.admin.notifications.details.error', 'Error', 'الخطأ')}
                  </Label>
                  <div className="mt-1 text-sm text-red-700">{selectedNotification.error}</div>
                </div>
              )}

              {/* Webhook Payload */}
              <div>
                <Label className="text-sm font-semibold text-slate-700">
                  {tr('adminPanel.admin.notifications.details.webhookPayload', 'Webhook Payload', 'بيانات Webhook')}
                </Label>
                <div className="mt-2 overflow-x-auto rounded-lg bg-slate-100 p-4 font-mono text-xs text-slate-700">
                  <pre>{JSON.stringify(selectedNotification.webhookPayload, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom Notification Modal */}
      <Dialog open={showCustomNotificationModal} onOpenChange={setShowCustomNotificationModal}>
        <DialogContent className={`max-w-2xl ${dialogClass}`}>
          <DialogHeader>
            <DialogTitle className="text-slate-950">
              {tr('adminPanel.admin.notifications.custom.title', 'Send Custom Notification', 'إرسال إشعار مخصص')}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {tr(
                'adminPanel.admin.notifications.custom.description',
                'Send a branded email notification to your customers',
                'أرسل إشعارا مخصصا بعلامتك التجارية إلى العملاء',
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelClass} htmlFor="modal-subject">
                {tr('adminPanel.admin.notifications.custom.subject', 'Subject', 'الموضوع')}
              </Label>
              <Input
                id="modal-subject"
                className={darkFieldClass}
                placeholder={tr('adminPanel.admin.notifications.custom.subjectPlaceholder', 'Important Update', 'تحديث مهم')}
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                data-testid="input-modal-subject"
              />
            </div>

            <div className="space-y-2">
              <Label className={labelClass} htmlFor="modal-message">
                {tr('adminPanel.admin.notifications.custom.message', 'Message', 'الرسالة')}
              </Label>
              <Textarea
                id="modal-message"
                className={darkFieldClass}
                placeholder={tr(
                  'adminPanel.admin.notifications.custom.messagePlaceholder',
                  'Enter your notification message...',
                  'اكتب رسالة الإشعار...',
                )}
                rows={6}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                data-testid="textarea-modal-message"
              />
            </div>

            <div className="space-y-2">
              <Label className={labelClass} htmlFor="modal-recipient-type">
                {tr('adminPanel.admin.notifications.custom.sendTo', 'Send To', 'إرسال إلى')}
              </Label>
              <Select
                value={recipientType}
                onValueChange={(value: PushAudience) => setRecipientType(value)}
              >
                <SelectTrigger className={darkSelectClass} data-testid="select-modal-recipient-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={darkSelectContentClass}>
                  <SelectItem value="all">
                    {tr('adminPanel.admin.notifications.custom.allCustomers', 'All Customers', 'كل العملاء')}
                  </SelectItem>
                  <SelectItem value="users">Users Only</SelectItem>
                  <SelectItem value="agents">Agents Only</SelectItem>
                  <SelectItem value="resellers">Resellers Only</SelectItem>
                  <SelectItem value="single">
                    {tr('adminPanel.admin.notifications.custom.singleCustomer', 'Single Customer', 'عميل واحد')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recipientType === 'single' && (
              <div className="space-y-2">
                <Label className={labelClass}>{tr('adminPanel.admin.notifications.custom.selectCustomer', 'Select Customer', 'اختر العميل')}</Label>

                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <div
                      role="combobox"
                      className={`${darkFieldClass} flex h-10 cursor-pointer items-center justify-between rounded-md px-3`}
                    >
                      <span>
                        {customers?.find((c) => c.id === recipientUserId)?.name ||
                          tr('adminPanel.admin.notifications.custom.chooseCustomer', 'Choose a customer', 'اختر عميلا')}
                      </span>
                    </div>
                  </PopoverTrigger>

                  <PopoverContent className="w-[300px] border-slate-200 bg-white p-0 text-slate-950">
                    <Command className="bg-white text-slate-950">
                      <CommandInput className="text-white placeholder:text-slate-400" placeholder={tr('adminPanel.admin.notifications.custom.searchCustomer', 'Search customer...', 'ابحث عن عميل...')} onValueChange={setSearch} />
                      <CommandEmpty className="py-6 text-center text-sm text-slate-500">{tr('adminPanel.admin.notifications.custom.noCustomerFound', 'No customer found.', 'لم يتم العثور على عميل.')}</CommandEmpty>

                      <CommandGroup className="text-slate-950">
                        {customers?.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={`${customer.name} ${customer.email}`}
                            onSelect={() => {
                              setRecipientUserId(customer.id);
                              setOpen(false);
                            }}
                          >
                            {customer.name || customer.email} ({customer.email})
                            <Check
                              className={cn(
                                'ml-auto h-4 w-4',
                                customer.id === recipientUserId ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="space-y-3 border-t border-slate-200 pt-2">
              <Label className="text-sm font-medium text-slate-700">
                {tr('adminPanel.admin.notifications.custom.deliveryMethods', 'Delivery Methods', 'طرق الإرسال')}
              </Label>
              {/* <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-email"
                  checked={sendEmail}
                  onCheckedChange={setSendEmail}
                  data-testid="checkbox-send-email"
                />
                <label
                  htmlFor="send-email"
                  className="cursor-pointer text-sm font-medium leading-none text-slate-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {tr('adminPanel.admin.notifications.custom.sendEmail', 'Send Email', 'إرسال بريد إلكتروني')}
                </label>
              </div> */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-push"
                  checked={sendPush}
                  onCheckedChange={(checked) => setSendPush(Boolean(checked))}
                  data-testid="checkbox-send-push"
                />
                <label
                  htmlFor="send-push"
                  className="cursor-pointer text-sm font-medium leading-none text-slate-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Send Mobile Push Notification
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-in-app"
                  checked={sendInApp}
                  onCheckedChange={setSendInApp}
                  data-testid="checkbox-send-in-app"
                />
                <label
                  htmlFor="send-in-app"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {tr('adminPanel.admin.notifications.custom.sendInApp', 'Send In-App Notification', 'إرسال إشعار داخل التطبيق')}
                </label>
              </div>
              <p className="text-xs text-slate-500">
                {tr(
                  'adminPanel.admin.notifications.custom.methodRequired',
                  'At least one delivery method must be selected',
                  'يجب اختيار طريقة إرسال واحدة على الأقل',
                )}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCustomNotificationModal(false)}
                className={lightButtonClass}
                data-testid="button-cancel-notification"
              >
                {tr('adminPanel.admin.notifications.custom.cancel', 'Cancel', 'إلغاء')}
              </Button>
              <Button
                onClick={() => sendCustomNotificationMutation.mutate()}
                disabled={
                  !customSubject ||
                  !customMessage ||
                  (!sendEmail && !sendInApp && !sendPush) ||
                  sendCustomNotificationMutation.isPending ||
                  (recipientType === 'single' && !recipientUserId)
                }
                className={primaryButtonClass}
                data-testid="button-send-modal-notification"
              >
                <Bell className="h-4 w-4" />
                {sendCustomNotificationMutation.isPending
                  ? tr('adminPanel.admin.notifications.custom.sending', 'Sending...', 'جار الإرسال...')
                  : tr(
                    'adminPanel.admin.notifications.custom.sendButton',
                    `Send to ${recipientType === 'all' ? 'All Customers' : 'Customer'}`,
                    'إرسال إلى {recipient}',
                    {
                      recipient:
                        recipientType === 'all'
                          ? tr('adminPanel.admin.notifications.custom.allCustomers', 'All Customers', 'كل العملاء')
                          : tr('adminPanel.admin.notifications.custom.singleCustomerShort', 'Customer', 'العميل'),
                    },
                  )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
