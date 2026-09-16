import { BarChart3, ClipboardList, Loader2, Phone, Sparkles, Ticket, Wallet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/contexts/TranslationContext';

type TransactionMode = 'vonage' | 'customers' | 'esim' | 'vouchers';

type AdminTransactionsProps = {
  mode?: TransactionMode;
  providerSlug?: string;
  virtualProviderSlug?: string;
};

type CustomerTransaction = {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  type: string;
  status: string;
  amount: string;
  movement: string;
  currency: string;
  provider?: string | null;
  providerPaymentId?: string | null;
  referenceId?: string | null;
  description: string;
  balanceBefore: string;
  balanceAfter: string;
  createdAt: string;
  metadata?: Record<string, any>;
};

type VonageTransaction = CustomerTransaction & {
  msisdn: string;
  usageType: string;
  direction?: string | null;
  chargePoint?: string | null;
  billingRole?: string | null;
  providerCost: string;
  grossProfit: string;
};

type VonageSmsMessage = {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  msisdn: string;
  direction: string;
  fromNumber: string;
  toNumber: string;
  text: string;
  status: string;
  customerCharge: string;
  providerCost: string;
  grossProfit: string;
  createdAt: string;
};

type TransactionReport = {
  customerSummary: {
    totalTransactions: number;
    completedTransactions: number;
    pendingTransactions: number;
    totalCredits: string;
    totalDebits: string;
    netMovement: string;
  };
  vonageSummary: {
    totalTransactions: number;
    smsTransactions: number;
    voiceTransactions: number;
    renewalTransactions: number;
    customerCharges: string;
    providerCost: string;
    grossProfit: string;
  };
  packageSummary: {
    totalTransactions: number;
    packageOrders: number;
    topupTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    customerCharges: string;
    providerCost: string;
    grossProfit: string;
  };
  customerTransactions: CustomerTransaction[];
  vonageTransactions: VonageTransaction[];
  vonageSmsMessages: VonageSmsMessage[];
  packageTransactions: Array<{
    id: string;
    displayOrderId?: number | null;
    userId?: string | null;
    userName?: string | null;
    userEmail?: string | null;
    userRole?: string | null;
    providerName: string;
    providerSlug: string;
    providerOrderId?: string | null;
    packageTitle: string;
    status: string;
    esimStatus?: string | null;
    orderType: string;
    quantity: number;
    dataAmount: string;
    validity: number;
    customerUnitPrice: string;
    providerUnitCost: string;
    customerCharge: string;
    providerCost: string;
    grossProfit: string;
    marginPercent: string;
    currency: string;
    paymentMethod?: string | null;
    orderSource?: string | null;
    iccid?: string | null;
    createdAt: string;
  }>;
  topupTransactions: Array<{
    id: string;
    displayTopupId?: number | null;
    orderId: string;
    userId: string;
    userName?: string | null;
    userEmail?: string | null;
    providerName: string;
    providerSlug: string;
    providerOrderId?: string | null;
    packageTitle: string;
    status: string;
    quantity: number;
    dataAmount: string;
    validity: number;
    customerCharge: string;
    providerCost: string;
    grossProfit: string;
    marginPercent: string;
    currency: string;
    iccid: string;
    createdAt: string;
  }>;
};

type VoucherLog = {
  id: string;
  voucherId?: string | null;
  userId?: string | null;
  orderId?: string | null;
  discountAmount: string;
  usedAt: string;
  voucherCode?: string | null;
  voucherType?: string | null;
  voucherValue?: string | null;
  voucherStatus?: string | null;
  voucherCurrentUses?: number | null;
  voucherMaxUses?: number | null;
  voucherSeriesCode?: string | null;
  voucherSerialNumber?: string | null;
  voucherBatchName?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  userDisplayId?: number | null;
  displayOrderId?: number | null;
};

type VoucherLogReport = {
  logs: VoucherLog[];
  summary: {
    totalRedemptions: number;
    totalRedeemedValue: number;
  };
};

function formatUsd(value: string | number | null | undefined) {
  const amount = Number.parseFloat(String(value || '0'));
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : '$0.00';
}

function formatPercent(value: number) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : '0.0%';
}

function customerLabel(transaction: { userName?: string | null; userEmail?: string | null; userId: string }) {
  return transaction.userName || transaction.userEmail || transaction.userId;
}

function titleCaseWords(value: string | null | undefined, fallback = '-') {
  const text = String(value || '').replace(/[_-]/g, ' ').trim();
  if (!text) return fallback;

  return text
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bSms\b/g, 'SMS')
    .replace(/\bDid\b/g, 'DID')
    .replace(/\bEsim\b/g, 'eSIM');
}

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();
  if (['completed', 'ready', 'active', 'paid'].includes(normalized)) {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  }
  if (['failed', 'cancelled', 'canceled'].includes(normalized)) {
    return 'border-rose-400/30 bg-rose-400/10 text-rose-200';
  }
  if (['pending', 'processing', 'provisioning'].includes(normalized)) {
    return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  }
  return 'border-blue-300/25 bg-blue-400/10 text-blue-100';
}

function reportQuery(mode: TransactionMode, providerSlug?: string, virtualProviderSlug?: string) {
  if (mode === 'vouchers') {
    return ['/api/admin/vouchers/logs', { limit: 2000, view: 'voucher-redemption-log-v2' }];
  }
  return ['/api/admin/transactions/report', { type: mode, providerSlug, virtualProviderSlug, limit: 2000 }];
}

const pageClass = 'min-h-full rounded-[1.75rem] bg-[#07152e] p-4 text-slate-100 md:p-6';
const heroClass = 'overflow-hidden rounded-[1.75rem] border border-blue-300/15 bg-[linear-gradient(120deg,#1f3478_0%,#10284c_42%,#0a1833_100%)] shadow-[0_22px_70px_rgba(2,8,23,0.32)]';
const heroMetricClass = 'rounded-2xl border border-blue-300/10 bg-[#07142b]/82 p-5 shadow-inner shadow-blue-950/30';
const heroRuleClass = 'border-blue-300/15 bg-[#0d1c3d] p-5 md:p-7';
const summaryRailClass = 'rounded-[1.35rem] border border-blue-300/15 bg-[#0a1935] p-5 text-slate-100 shadow-[0_14px_45px_rgba(2,8,23,0.2)] xl:sticky xl:top-6 xl:self-start';
const summaryItemClass = 'rounded-2xl border border-blue-300/10 bg-[#07142b]/75 p-4';
const metricCardClass = 'rounded-[1.35rem] border-blue-300/15 bg-[#0d1d3f] text-slate-100 shadow-[0_14px_45px_rgba(2,8,23,0.22)]';
const panelCardClass = 'rounded-[1.35rem] border-blue-300/15 bg-[#0a1935] text-slate-100 shadow-[0_14px_45px_rgba(2,8,23,0.2)]';
const tableWrapClass = 'overflow-x-auto rounded-2xl border border-blue-300/10 bg-[#07142b]';
const tableRowClass = 'border-blue-300/10 hover:bg-blue-400/5';
const heroLabelClass = 'text-sm font-semibold tracking-wide text-slate-400';
const summaryLabelClass = 'text-xs font-semibold tracking-wide text-slate-400';

export default function AdminTransactions({ mode = 'vonage', providerSlug = 'all', virtualProviderSlug = 'vonage' }: AdminTransactionsProps) {
  const isVonageMode = mode === 'vonage';
  const isEsimMode = mode === 'esim';
  const isVoucherMode = mode === 'vouchers';
  const { t, isRTL } = useTranslation();
  const formatText = (text: string, params?: Record<string, string | number>) =>
    params ? text.replace(/\{(\w+)\}/g, (match, key) => params[key]?.toString() || match) : text;
  const tr = (key: string, english: string, arabic: string, params?: Record<string, string | number>) =>
    isRTL ? formatText(arabic, params) : t(key, english, params);
  const { data, isLoading } = useQuery<TransactionReport | VoucherLogReport>({
    queryKey: reportQuery(mode, providerSlug, virtualProviderSlug),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl bg-[#07152e]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
      </div>
    );
  }

  if (isVoucherMode) {
    const report = (data as VoucherLogReport | undefined) || {
      logs: [],
      summary: { totalRedemptions: 0, totalRedeemedValue: 0 },
    };

    return (
      <div className={pageClass} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="space-y-6">
          <div className={heroClass}>
            <div className="grid gap-6 p-6 md:grid-cols-[1fr_1.45fr] md:p-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/20 bg-blue-950/25 px-4 py-2 text-sm font-semibold text-blue-100">
                  <Ticket className="h-4 w-4 text-cyan-200" />
                  {tr('adminPanel.admin.transactions.vouchers.badge', 'Voucher Transaction Reporting', 'تقارير معاملات القسائم')}
                </div>
                <h1 className="mt-5 text-4xl font-bold tracking-tight text-white md:text-5xl">
                  {tr('adminPanel.admin.transactions.vouchers.title', 'Voucher Logs', 'سجلات القسائم')}
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                  {tr(
                    'adminPanel.admin.transactions.vouchers.description',
                    'Every Redeemed Voucher, The Customer Who Used It, Redemption Value, Order Link, And Usage Status.',
                    'كل قسيمة مستخدمة والعميل الذي استخدمها وقيمة الاسترداد ورابط الطلب وحالة الاستخدام.',
                  )}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 md:content-center">
                <div className={heroMetricClass}>
                  <div className={heroLabelClass}>{tr('adminPanel.admin.transactions.vouchers.redemptions', 'Redemptions', 'عمليات الاستخدام')}</div>
                  <div className="mt-3 truncate text-2xl font-bold text-white">{report.summary.totalRedemptions}</div>
                </div>
                <div className={heroMetricClass}>
                  <div className={heroLabelClass}>{tr('adminPanel.admin.transactions.vouchers.redeemedValue', 'Redeemed Value', 'القيمة المستخدمة')}</div>
                  <div className="mt-3 truncate text-2xl font-bold text-white">{formatUsd(report.summary.totalRedeemedValue)}</div>
                </div>
                <div className={heroMetricClass}>
                  <div className={heroLabelClass}>{tr('adminPanel.admin.transactions.vouchers.logRows', 'Log Rows', 'صفوف السجل')}</div>
                  <div className="mt-3 truncate text-2xl font-bold text-white">{report.logs.length}</div>
                </div>
              </div>
            </div>
          </div>

          <Card className={panelCardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-cyan-300" />
                {tr('adminPanel.admin.transactions.vouchers.redeemedLogs', 'Redeemed Voucher Logs', 'سجلات القسائم المستخدمة')}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {tr(
                  'adminPanel.admin.transactions.vouchers.redeemedLogsDesc',
                  'Shows All Vouchers That Have Been Used And The User Account That Used Each Voucher.',
                  'يعرض كل القسائم التي تم استخدامها وحساب المستخدم الذي استخدم كل قسيمة.',
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={tableWrapClass}>
                <Table>
                  <TableHeader>
                    <TableRow className={tableRowClass}>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.date', 'Date', 'التاريخ')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.user', 'User', 'المستخدم')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.voucher', 'Voucher', 'القسيمة')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.batchSerial', 'Batch / Serial', 'الدفعة / الرقم التسلسلي')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.order', 'Order', 'الطلب')}</TableHead>
                      <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.vouchers.redeemedValue', 'Redeemed Value', 'القيمة المستخدمة')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.usage', 'Usage', 'الاستخدام')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.logs.map((log) => {
                      const fullyRedeemed = Boolean(log.voucherMaxUses && Number(log.voucherCurrentUses || 0) >= Number(log.voucherMaxUses));
                      return (
                        <TableRow key={log.id} className={fullyRedeemed ? 'border-rose-400/20 bg-rose-500/10 hover:bg-rose-500/15' : tableRowClass}>
                          <TableCell className="whitespace-nowrap text-xs text-slate-400">
                            {new Date(log.usedAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{log.userName || log.userEmail || log.userId || 'Unknown User'}</div>
                            <div className="text-xs text-slate-400">
                              {log.userEmail || '-'} {log.userDisplayId ? ` / UID${String(log.userDisplayId).padStart(3, '0')}` : ''}
                            </div>
                            <Badge variant="outline" className="mt-1">{titleCaseWords(log.userRole || 'user')}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-sm text-white">{log.voucherCode || '-'}</div>
                            <div className="text-xs text-slate-400">{titleCaseWords(log.voucherType || 'voucher')}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{log.voucherBatchName || log.voucherSeriesCode || '-'}</div>
                            <div className="font-mono text-xs text-slate-400">{log.voucherSerialNumber || '-'}</div>
                          </TableCell>
                          <TableCell>{log.displayOrderId ? `OID${String(log.displayOrderId).padStart(3, '0')}` : log.orderId || '-'}</TableCell>
                          <TableCell className="text-right font-medium text-emerald-300">{formatUsd(log.discountAmount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={fullyRedeemed ? 'border-rose-400/40 bg-rose-500/15 text-rose-200' : statusBadgeClass(log.voucherStatus || 'completed')}>
                              {fullyRedeemed ? tr('adminPanel.admin.transactions.vouchers.notReusable', 'Redeemed / Not Reusable', 'مستخدمة / غير قابلة لإعادة الاستخدام') : titleCaseWords(log.voucherStatus || 'used')}
                            </Badge>
                            <div className="mt-1 text-xs text-slate-400">
                              {tr('adminPanel.admin.transactions.vouchers.uses', '{count}{max} Uses', '{count}{max} استخدامات', {
                                count: log.voucherCurrentUses || 0,
                                max: log.voucherMaxUses ? ` / ${log.voucherMaxUses}` : '',
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {report.logs.length === 0 && (
                      <TableRow className={tableRowClass}>
                        <TableCell colSpan={7} className="py-8 text-center text-slate-400">
                          {tr('adminPanel.admin.transactions.vouchers.empty', 'No Voucher Redemptions Found Yet.', 'لم يتم العثور على استخدامات قسائم بعد.')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const report = (data as TransactionReport | undefined) || {
    customerSummary: {
      totalTransactions: 0,
      completedTransactions: 0,
      pendingTransactions: 0,
      totalCredits: '0.00',
      totalDebits: '0.00',
      netMovement: '0.00',
    },
    vonageSummary: {
      totalTransactions: 0,
      smsTransactions: 0,
      voiceTransactions: 0,
      renewalTransactions: 0,
      customerCharges: '0.00',
      providerCost: '0.00',
      grossProfit: '0.00',
    },
    packageSummary: {
      totalTransactions: 0,
      packageOrders: 0,
      topupTransactions: 0,
      completedTransactions: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
      customerCharges: '0.00',
      providerCost: '0.00',
      grossProfit: '0.00',
    },
    customerTransactions: [],
    vonageTransactions: [],
    vonageSmsMessages: [],
    packageTransactions: [],
    topupTransactions: [],
  };
  const providerTitle =
    providerSlug === 'airalo'
      ? 'Airalo'
      : providerSlug === 'esim-go'
        ? 'eSIM Go'
        : providerSlug === 'esim-access'
          ? 'eSIM Access'
          : 'All eSIM Providers';
  const virtualProviderTitle = virtualProviderSlug === 'all'
    ? tr('adminPanel.admin.transactions.eroaming.title', "eRoaming's", 'التجوال الإلكتروني')
    : virtualProviderSlug === 'vonage'
      ? 'Vonage'
      : virtualProviderSlug.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const pageTitle = isVonageMode
    ? virtualProviderTitle
    : isEsimMode
      ? tr('adminPanel.admin.transactions.esim.pageTitle', '{provider} Package Transactions', 'معاملات باقات {provider}', { provider: providerTitle })
      : tr('adminPanel.admin.transactions.customers.pageTitle', 'Customers', 'العملاء');
  const pageDescription = isVonageMode
    ? tr(
        'adminPanel.admin.transactions.eroaming.description',
        'All eRoaming/DID Wallet Charges, Estimated Provider Costs, SMS Records, And Gross Margin.',
        'كل رسوم محفظة التجوال الإلكتروني وأرقام DID وتكاليف المزود المقدرة وسجلات SMS والهامش الإجمالي.',
      )
    : isEsimMode
      ? tr(
          'adminPanel.admin.transactions.esim.description',
          'All Package Purchases, Provider Cost, Customer Charge, Profit, Top-Ups, And Fulfillment Status.',
          'كل مشتريات الباقات وتكلفة المزود ورسوم العميل والربح والشحنات وحالة التنفيذ.',
        )
      : tr(
          'adminPanel.admin.transactions.customers.description',
          'All Customer Wallet Transactions, Top-Ups, Purchases, Voucher Activity, Refunds, And Balance Movement.',
          'كل معاملات محفظة العملاء والشحنات والمشتريات ونشاط القسائم والمبالغ المستردة وحركة الرصيد.',
        );
  const heroMetrics = isVonageMode
    ? [
        { label: tr('adminPanel.admin.transactions.label.customerCharges', 'Customer Charges', 'رسوم العميل'), value: formatUsd(report.vonageSummary.customerCharges) },
        { label: tr('adminPanel.admin.transactions.label.providerCost', 'Provider Cost', 'تكلفة المزود'), value: formatUsd(report.vonageSummary.providerCost) },
        { label: tr('adminPanel.admin.transactions.label.usage', 'Usage', 'الاستخدام'), value: `${report.vonageSummary.totalTransactions}` },
      ]
    : isEsimMode
      ? [
          { label: tr('adminPanel.admin.transactions.label.customerPaidCaps', 'CUSTOMER PAID', 'دفع العميل'), value: formatUsd(report.packageSummary.customerCharges) },
          { label: tr('adminPanel.admin.transactions.label.myCostCaps', 'MY COST', 'تكلفتي'), value: formatUsd(report.packageSummary.providerCost) },
          { label: tr('adminPanel.admin.transactions.label.ordersCaps', 'ORDERS', 'الطلبات'), value: `${report.packageSummary.totalTransactions}` },
        ]
      : [
          { label: tr('adminPanel.admin.transactions.label.totalCredits', 'Total Credits', 'إجمالي الإضافات'), value: formatUsd(report.customerSummary.totalCredits) },
          { label: tr('adminPanel.admin.transactions.label.totalDebits', 'Total Debits', 'إجمالي الخصومات'), value: formatUsd(report.customerSummary.totalDebits) },
          { label: tr('adminPanel.admin.transactions.label.transactions', 'Transactions', 'المعاملات'), value: `${report.customerSummary.totalTransactions}` },
        ];
  const heroRules = isVonageMode
    ? [
        { label: tr('adminPanel.admin.transactions.label.usageSource', 'Usage Source', 'مصدر الاستخدام'), value: tr('adminPanel.admin.transactions.label.voiceSmsRenewals', 'Voice, SMS, Renewals', 'الصوت وSMS والتجديدات') },
        { label: tr('adminPanel.admin.transactions.label.chargeView', 'Charge View', 'عرض الرسوم'), value: tr('adminPanel.admin.transactions.label.customerProviderCost', 'Customer And Provider Cost', 'تكلفة العميل والمزود') },
        { label: tr('adminPanel.admin.transactions.label.margin', 'Margin', 'الهامش'), value: tr('adminPanel.admin.transactions.label.grossProfitTracked', 'Gross Profit Tracked', 'تتبع الربح الإجمالي') },
      ]
    : isEsimMode
      ? [
          { label: tr('adminPanel.admin.transactions.label.orderStatusCaps', 'ORDER STATUS', 'حالة الطلب'), value: tr('adminPanel.admin.transactions.label.completedFailedPending', 'Completed, Failed, Pending', 'مكتمل، فاشل، معلق') },
          { label: tr('adminPanel.admin.transactions.label.providerViewCaps', 'PROVIDER VIEW', 'عرض المزود'), value: tr('adminPanel.admin.transactions.label.worksEveryProvider', 'Works With Every Provider', 'يعمل مع كل مزود') },
          { label: tr('adminPanel.admin.transactions.label.packageCostCaps', 'PACKAGE COST', 'تكلفة الباقة'), value: tr('adminPanel.admin.transactions.label.buySellPrice', 'Buy Cost And Sell Price', 'تكلفة الشراء وسعر البيع') },
        ]
      : [
          { label: tr('adminPanel.admin.transactions.label.walletView', 'Wallet View', 'عرض المحفظة'), value: tr('adminPanel.admin.transactions.label.creditsDebits', 'Credits And Debits', 'الإضافات والخصومات') },
          { label: tr('adminPanel.admin.transactions.label.customerReport', 'Customer Report', 'تقرير العميل'), value: tr('adminPanel.admin.transactions.label.fullBalanceMovement', 'Full Balance Movement', 'حركة الرصيد الكاملة') },
          { label: tr('adminPanel.admin.transactions.label.status', 'Status', 'الحالة'), value: tr('adminPanel.admin.transactions.label.completedPending', 'Completed And Pending', 'مكتمل ومعلق') },
        ];
  const vonageCharges = Number.parseFloat(report.vonageSummary.customerCharges || '0');
  const vonageProfit = Number.parseFloat(report.vonageSummary.grossProfit || '0');
  const vonageMarginPercent = vonageCharges > 0 ? (vonageProfit / vonageCharges) * 100 : 0;
  const vonageSummaryItems = [
    { label: tr('adminPanel.admin.transactions.label.profitMargin', 'Profit Margin', 'هامش الربح'), value: formatPercent(vonageMarginPercent), tone: 'text-emerald-300' },
    { label: tr('adminPanel.admin.transactions.label.smsUsage', 'SMS Usage', 'استخدام SMS'), value: `${report.vonageSummary.smsTransactions}`, tone: 'text-cyan-200' },
    { label: tr('adminPanel.admin.transactions.label.voiceUsage', 'Voice Usage', 'استخدام الصوت'), value: `${report.vonageSummary.voiceTransactions}`, tone: 'text-blue-200' },
    { label: tr('adminPanel.admin.transactions.label.renewals', 'Renewals', 'التجديدات'), value: `${report.vonageSummary.renewalTransactions}`, tone: 'text-amber-200' },
    { label: tr('adminPanel.admin.transactions.label.smsRecords', 'SMS Records', 'سجلات SMS'), value: `${report.vonageSmsMessages.length}`, tone: 'text-slate-100' },
    { label: tr('adminPanel.admin.transactions.label.providerCost', 'Provider Cost', 'تكلفة المزود'), value: formatUsd(report.vonageSummary.providerCost), tone: 'text-rose-200' },
  ];

  return (
    <div className={pageClass} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="space-y-6">
      <div className={heroClass}>
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_1.45fr] md:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/20 bg-blue-950/25 px-4 py-2 text-sm font-semibold text-blue-100">
              <Sparkles className="h-4 w-4 text-cyan-200" />
              {tr('adminPanel.admin.transactions.badge', 'Transaction Reporting', 'تقارير المعاملات')}
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white md:text-5xl">
              {pageTitle}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
              {pageDescription}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 md:content-center">
            {heroMetrics.map((metric) => (
              <div key={metric.label} className={heroMetricClass}>
                <div className={heroLabelClass}>{metric.label}</div>
                <div className="mt-3 truncate text-2xl font-bold text-white">{metric.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid border-t border-blue-300/15 md:grid-cols-3">
          {heroRules.map((rule) => (
            <div key={rule.label} className={heroRuleClass}>
              <div className={heroLabelClass}>{rule.label}</div>
              <div className="mt-3 text-xl font-bold text-white">{rule.value}</div>
            </div>
          ))}
        </div>
      </div>

      {isEsimMode ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className={metricCardClass}>
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">{tr('adminPanel.admin.transactions.label.customerPackageSalesCaps', 'CUSTOMER PACKAGE SALES', 'مبيعات باقات العملاء')}</CardDescription>
                <CardTitle className="text-white">{formatUsd(report.packageSummary.customerCharges)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className={metricCardClass}>
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">{tr('adminPanel.admin.transactions.label.providerPackageCostCaps', 'PROVIDER PACKAGE COST', 'تكلفة باقات المزود')}</CardDescription>
                <CardTitle className="text-white">{formatUsd(report.packageSummary.providerCost)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className={metricCardClass}>
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">{tr('adminPanel.admin.transactions.label.packageProfitCaps', 'PACKAGE PROFIT', 'ربح الباقات')}</CardDescription>
                <CardTitle className="text-white">{formatUsd(report.packageSummary.grossProfit)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className={metricCardClass}>
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">{tr('adminPanel.admin.transactions.label.transactionsCaps', 'TRANSACTIONS', 'المعاملات')}</CardDescription>
                <CardTitle className="text-white">{report.packageSummary.totalTransactions}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-400">
                {report.packageSummary.packageOrders} Packages / {report.packageSummary.topupTransactions} Top-Ups
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className={metricCardClass}>
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">{tr('adminPanel.admin.transactions.label.completedOrdersCaps', 'COMPLETED ORDERS', 'الطلبات المكتملة')}</CardDescription>
                <CardTitle className="text-emerald-300">{report.packageSummary.completedTransactions}</CardTitle>
              </CardHeader>
            </Card>
            <Card className={metricCardClass}>
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">{tr('adminPanel.admin.transactions.label.failedOrdersCaps', 'FAILED ORDERS', 'الطلبات الفاشلة')}</CardDescription>
                <CardTitle className="text-rose-300">{report.packageSummary.failedTransactions}</CardTitle>
              </CardHeader>
            </Card>
            <Card className={metricCardClass}>
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">{tr('adminPanel.admin.transactions.label.pendingProcessingCaps', 'PENDING / PROCESSING', 'معلق / قيد المعالجة')}</CardDescription>
                <CardTitle className="text-amber-300">{report.packageSummary.pendingTransactions}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className={panelCardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-cyan-300" />
                {tr('adminPanel.admin.transactions.esim.packagePurchasesTitle', 'eSIM Package Purchase Transactions', 'معاملات شراء باقات eSIM')}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {tr(
                  'adminPanel.admin.transactions.esim.packagePurchasesDesc',
                  'Full Package Purchase Report With Your Provider Cost And Customer Selling Price.',
                  'تقرير كامل لمشتريات الباقات مع تكلفة المزود وسعر بيع العميل.',
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={tableWrapClass}>
                <Table>
                  <TableHeader>
                    <TableRow className={tableRowClass}>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.date', 'Date', 'التاريخ')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.customer', 'Customer', 'العميل')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.provider', 'Provider', 'المزود')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.package', 'Package', 'الباقة')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.label.status', 'Status', 'الحالة')}</TableHead>
                      <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.label.customerPaid', 'Customer Paid', 'دفع العميل')}</TableHead>
                      <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.label.myCost', 'My Cost', 'تكلفتي')}</TableHead>
                      <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.label.profit', 'Profit', 'الربح')}</TableHead>
                      <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.label.unitCost', 'Unit Cost', 'تكلفة الوحدة')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.packageTransactions.map((transaction) => (
                      <TableRow key={transaction.id} className={tableRowClass}>
                        <TableCell className="whitespace-nowrap text-xs text-slate-400">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{customerLabel({ userName: transaction.userName, userEmail: transaction.userEmail, userId: transaction.userId || 'guest' })}</div>
                          <div className="text-xs text-slate-400">{titleCaseWords(transaction.paymentMethod || transaction.orderSource || 'order')}</div>
                        </TableCell>
                        <TableCell>{transaction.providerName}</TableCell>
                        <TableCell>
                          <div className="font-medium">{transaction.packageTitle}</div>
                          <div className="text-xs text-slate-400">
                            {transaction.dataAmount} / {transaction.validity} {tr('adminPanel.admin.transactions.label.days', 'Days', 'أيام')} / {tr('adminPanel.admin.transactions.label.qty', 'Qty', 'الكمية')} {transaction.quantity}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClass(transaction.status)}>
                            Order: {titleCaseWords(transaction.status)}
                          </Badge>
                          <div className="mt-1 text-xs text-slate-400">
                            eSIM: {titleCaseWords(transaction.esimStatus)}
                          </div>
                          <div className="text-xs text-slate-400">
                            {tr('adminPanel.admin.transactions.table.providerColon', 'Provider:', 'المزود')} {transaction.providerOrderId || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatUsd(transaction.customerCharge)}</TableCell>
                        <TableCell className="text-right text-rose-300">{formatUsd(transaction.providerCost)}</TableCell>
                        <TableCell className="text-right text-emerald-300">
                          {formatUsd(transaction.grossProfit)}
                          <div className="text-xs text-slate-400">{transaction.marginPercent}%</div>
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-400">
                          {formatUsd(transaction.providerUnitCost)} {tr('adminPanel.admin.transactions.label.cost', 'Cost', 'التكلفة')} / {formatUsd(transaction.customerUnitPrice)} {tr('adminPanel.admin.transactions.label.sell', 'Sell', 'البيع')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className={panelCardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-cyan-300" />
                {tr('adminPanel.admin.transactions.esim.topupsTitle', 'eSIM Top-Up Transactions', 'معاملات شحن eSIM')}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {tr(
                  'adminPanel.admin.transactions.esim.topupsDesc',
                  'Top-Up Sales With Provider Cost And Profit.',
                  'مبيعات الشحن مع تكلفة المزود والربح.',
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={tableWrapClass}>
                <Table>
                  <TableHeader>
                    <TableRow className={tableRowClass}>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.date', 'Date', 'التاريخ')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.customer', 'Customer', 'العميل')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.provider', 'Provider', 'المزود')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.topup', 'Top-Up', 'الشحن')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.label.status', 'Status', 'الحالة')}</TableHead>
                      <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.label.customerPaid', 'Customer Paid', 'دفع العميل')}</TableHead>
                      <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.label.myCost', 'My Cost', 'تكلفتي')}</TableHead>
                      <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.label.profit', 'Profit', 'الربح')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.topupTransactions.map((transaction) => (
                      <TableRow key={transaction.id} className={tableRowClass}>
                        <TableCell className="whitespace-nowrap text-xs text-slate-400">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>{customerLabel(transaction)}</TableCell>
                        <TableCell>{transaction.providerName}</TableCell>
                        <TableCell>
                          <div className="font-medium">{transaction.dataAmount}</div>
                          <div className="text-xs text-slate-400">{transaction.validity} Days / {transaction.iccid}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClass(transaction.status)}>
                            {titleCaseWords(transaction.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatUsd(transaction.customerCharge)}</TableCell>
                        <TableCell className="text-right text-rose-300">{formatUsd(transaction.providerCost)}</TableCell>
                        <TableCell className="text-right text-emerald-300">{formatUsd(transaction.grossProfit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : isVonageMode ? (
        <>
          <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
            <aside className={summaryRailClass}>
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-cyan-200/15 bg-cyan-400/10 p-2">
                  <BarChart3 className="h-5 w-5 text-cyan-200" />
                </div>
                <div>
                  <div className={summaryLabelClass}>{tr('adminPanel.admin.transactions.label.liveSummary', 'Live Summary', 'ملخص مباشر')}</div>
                  <div className="mt-1 text-xl font-bold text-white">{tr('adminPanel.admin.transactions.eroaming.snapshot', 'eRoaming Snapshot', 'لمحة عن التجوال الإلكتروني')}</div>
                </div>
              </div>

              <div className="mt-5">
                <div className={`flex items-center justify-between ${summaryLabelClass}`}>
                  <span>{tr('adminPanel.admin.transactions.label.grossMargin', 'Gross Margin', 'الهامش الإجمالي')}</span>
                  <span className="text-emerald-300">{formatPercent(vonageMarginPercent)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950/70">
                  <div
                    className="h-full rounded-full bg-emerald-300"
                    style={{ width: `${Math.max(0, Math.min(vonageMarginPercent, 100))}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {vonageSummaryItems.map((item) => (
                  <div key={item.label} className={summaryItemClass}>
                    <div className={summaryLabelClass}>{item.label}</div>
                    <div className={`mt-2 text-2xl font-bold ${item.tone}`}>{item.value}</div>
                  </div>
                ))}
              </div>
            </aside>

            <div className="space-y-4 md:space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <Card className={metricCardClass}>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-slate-400">{tr('adminPanel.admin.transactions.label.customerCharges', 'Customer Charges', 'رسوم العميل')}</CardDescription>
                    <CardTitle className="text-white">{formatUsd(report.vonageSummary.customerCharges)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className={metricCardClass}>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-slate-400">{tr('adminPanel.admin.transactions.label.providerCost', 'Provider Cost', 'تكلفة المزود')}</CardDescription>
                    <CardTitle className="text-white">{formatUsd(report.vonageSummary.providerCost)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className={metricCardClass}>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-slate-400">{tr('adminPanel.admin.transactions.label.grossProfit', 'Gross Profit', 'الربح الإجمالي')}</CardDescription>
                    <CardTitle className="text-white">{formatUsd(report.vonageSummary.grossProfit)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className={metricCardClass}>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-slate-400">{tr('adminPanel.admin.transactions.label.usageCount', 'Usage Count', 'عدد الاستخدامات')}</CardDescription>
                    <CardTitle className="text-white">{report.vonageSummary.totalTransactions}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-400">
                    {tr('adminPanel.admin.transactions.eroaming.smsVoiceCount', '{sms} SMS / {voice} Voice', '{sms} SMS / {voice} صوت', {
                      sms: report.vonageSummary.smsTransactions,
                      voice: report.vonageSummary.voiceTransactions,
                    })}
                  </CardContent>
                </Card>
              </div>

              <Card className={panelCardClass}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-cyan-300" />
                    {tr('adminPanel.admin.transactions.eroaming.walletTransactions', 'eRoaming Wallet Transactions', 'معاملات محفظة التجوال الإلكتروني')}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {tr(
                      'adminPanel.admin.transactions.eroaming.walletTransactionsDesc',
                      'All Wallet Debits And Renewals Related To Virtual/eRoaming Numbers.',
                      'كل خصومات وتجديدات المحفظة المتعلقة بأرقام التجوال الإلكتروني والافتراضية.',
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={tableWrapClass}>
                    <Table>
                      <TableHeader>
                        <TableRow className={tableRowClass}>
                          <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.date', 'Date', 'التاريخ')}</TableHead>
                          <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.customer', 'Customer', 'العميل')}</TableHead>
                          <TableHead className="text-slate-300">DID</TableHead>
                          <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.usage', 'Usage', 'الاستخدام')}</TableHead>
                          <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.label.customerCharge', 'Customer Charge', 'رسوم العميل')}</TableHead>
                          <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.label.providerCost', 'Provider Cost', 'تكلفة المزود')}</TableHead>
                          <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.label.profit', 'Profit', 'الربح')}</TableHead>
                          <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.label.wallet', 'Wallet', 'المحفظة')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.vonageTransactions.map((transaction) => (
                          <TableRow key={transaction.id} className={tableRowClass}>
                            <TableCell className="whitespace-nowrap text-xs text-slate-400">
                              {new Date(transaction.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{customerLabel(transaction)}</div>
                              <div className="text-xs text-slate-400">{titleCaseWords(transaction.userRole || transaction.billingRole || 'customer')}</div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{transaction.msisdn || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {titleCaseWords(transaction.usageType)}{transaction.direction ? ` / ${titleCaseWords(transaction.direction)}` : ''}
                              </Badge>
                              <div className="mt-1 max-w-[260px] truncate text-xs text-slate-400">{transaction.description}</div>
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatUsd(transaction.amount)}</TableCell>
                            <TableCell className="text-right text-rose-300">{formatUsd(transaction.providerCost)}</TableCell>
                            <TableCell className="text-right text-emerald-300">{formatUsd(transaction.grossProfit)}</TableCell>
                            <TableCell className="text-right text-xs text-slate-400">
                              {formatUsd(transaction.balanceBefore)} {tr('adminPanel.common.to', 'To', 'إلى')} {formatUsd(transaction.balanceAfter)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className={panelCardClass}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-cyan-300" />
                    {tr('adminPanel.admin.transactions.eroaming.smsRecordsTitle', 'eRoaming SMS Usage Records', 'سجلات استخدام SMS للتجوال الإلكتروني')}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {tr(
                      'adminPanel.admin.transactions.eroaming.smsRecordsDesc',
                      'Inbound And Outbound SMS Records With Customer Charge And Estimated Provider Cost.',
                      'سجلات SMS الواردة والصادرة مع رسوم العميل وتكلفة المزود المقدرة.',
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={tableWrapClass}>
                    <Table>
                      <TableHeader>
                        <TableRow className={tableRowClass}>
                          <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.date', 'Date', 'التاريخ')}</TableHead>
                          <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.customer', 'Customer', 'العميل')}</TableHead>
                          <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.route', 'Route', 'المسار')}</TableHead>
                          <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.label.status', 'Status', 'الحالة')}</TableHead>
                          <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.label.charge', 'Charge', 'الرسوم')}</TableHead>
                          <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.label.providerCost', 'Provider Cost', 'تكلفة المزود')}</TableHead>
                          <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.message', 'Message', 'الرسالة')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.vonageSmsMessages.map((message) => (
                          <TableRow key={message.id} className={tableRowClass}>
                            <TableCell className="whitespace-nowrap text-xs text-slate-400">
                              {new Date(message.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{customerLabel(message)}</div>
                              <div className="text-xs text-slate-400">{message.msisdn || '-'}</div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>{message.fromNumber}</div>
                              <div className="text-xs text-slate-400">{tr('adminPanel.common.to', 'To', 'إلى')} {message.toNumber}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{titleCaseWords(`${message.direction} ${message.status}`)}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatUsd(message.customerCharge)}</TableCell>
                            <TableCell className="text-right text-rose-300">{formatUsd(message.providerCost)}</TableCell>
                            <TableCell className="max-w-[320px] truncate text-sm text-slate-400">{message.text}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className={metricCardClass}>
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">{tr('adminPanel.admin.transactions.label.totalCredits', 'Total Credits', 'إجمالي الإضافات')}</CardDescription>
                <CardTitle className="text-white">{formatUsd(report.customerSummary.totalCredits)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className={metricCardClass}>
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">{tr('adminPanel.admin.transactions.label.totalDebits', 'Total Debits', 'إجمالي الخصومات')}</CardDescription>
                <CardTitle className="text-white">{formatUsd(report.customerSummary.totalDebits)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className={metricCardClass}>
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">{tr('adminPanel.admin.transactions.label.netMovement', 'Net Movement', 'صافي الحركة')}</CardDescription>
                <CardTitle className="text-white">{formatUsd(report.customerSummary.netMovement)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className={metricCardClass}>
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">{tr('adminPanel.admin.transactions.label.transactions', 'Transactions', 'المعاملات')}</CardDescription>
                <CardTitle className="text-white">{report.customerSummary.totalTransactions}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-400">
                {report.customerSummary.completedTransactions} {tr('adminPanel.admin.transactions.label.completed', 'Completed', 'مكتمل')} / {report.customerSummary.pendingTransactions} {tr('adminPanel.admin.transactions.label.pending', 'Pending', 'معلق')}
              </CardContent>
            </Card>
          </div>

          <Card className={panelCardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-cyan-300" />
                {tr('adminPanel.admin.transactions.customers.walletTransactionsTitle', 'Customer Wallet Transactions', 'معاملات محفظة العملاء')}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {tr(
                  'adminPanel.admin.transactions.customers.walletTransactionsDesc',
                  'Full Customer Transaction Report Across Wallet Top-Ups, Purchases, Vouchers, Refunds, And Adjustments.',
                  'تقرير كامل لمعاملات العملاء يشمل شحن المحفظة والمشتريات والقسائم والمبالغ المستردة والتعديلات.',
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={tableWrapClass}>
                <Table>
                  <TableHeader>
                    <TableRow className={tableRowClass}>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.date', 'Date', 'التاريخ')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.customer', 'Customer', 'العميل')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.type', 'Type', 'النوع')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.provider', 'Provider', 'المزود')}</TableHead>
                      <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.table.amount', 'Amount', 'المبلغ')}</TableHead>
                      <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.table.movement', 'Movement', 'الحركة')}</TableHead>
                      <TableHead className="text-right text-slate-300">{tr('adminPanel.admin.transactions.table.balance', 'Balance', 'الرصيد')}</TableHead>
                      <TableHead className="text-slate-300">{tr('adminPanel.admin.transactions.table.description', 'Description', 'الوصف')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.customerTransactions.map((transaction) => (
                      <TableRow key={transaction.id} className={tableRowClass}>
                        <TableCell className="whitespace-nowrap text-xs text-slate-400">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{customerLabel(transaction)}</div>
                          <div className="text-xs text-slate-400">{titleCaseWords(transaction.userRole || 'customer')}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{titleCaseWords(transaction.type)}</Badge>
                          <div className="mt-1 text-xs text-slate-400">{titleCaseWords(transaction.status)}</div>
                        </TableCell>
                        <TableCell>{transaction.provider || '-'}</TableCell>
                        <TableCell className="text-right font-medium">{formatUsd(transaction.amount)}</TableCell>
                        <TableCell className={Number(transaction.movement) < 0 ? 'text-right text-rose-300' : 'text-right text-emerald-300'}>
                          {formatUsd(transaction.movement)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-400">
                          {formatUsd(transaction.balanceBefore)} {tr('adminPanel.common.to', 'To', 'إلى')} {formatUsd(transaction.balanceAfter)}
                        </TableCell>
                        <TableCell className="max-w-[320px] truncate text-sm text-slate-400">{transaction.description || transaction.referenceId || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      </div>
    </div>
  );
}
