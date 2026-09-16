import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft,
  BarChart3,
  Copy,
  Download,
  DollarSign,
  Eye,
  FileText,
  Percent,
  Plus,
  Printer,
  QrCode,
  Search,
  Ticket,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useSettingByKey } from '@/hooks/useSettings';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { VoucherCode } from '@shared/schema';
import {
  buildDocumentHtml,
  downloadResponseFile,
  escapeHtml,
  exportHtmlDocument,
  printHtmlDocument,
  rowsToHtmlTable,
  toAbsoluteAssetUrl,
  type DocumentExportFormat,
} from '@/lib/documentExport';
import { useLocation } from 'wouter';

type VoucherType = 'percentage' | 'fixed' | 'wallet_credit';
type VoucherAssignmentRole = 'all' | 'agent' | 'reseller';

type AdminVoucher = VoucherCode & {
  qrCode?: string | null;
  qrPayload?: string | null;
  batchName?: string | null;
  assignedRole?: VoucherAssignmentRole | null;
  assignedUserId?: string | null;
};

type VoucherAssignee = {
  id: string;
  name?: string | null;
  email: string;
  role: 'agent' | 'reseller';
};

const VOUCHER_CODE_PATTERN = /^\d{4}-\d{4}-\d{4}-\d{4}$/;

interface VoucherFormData {
  code: string;
  quantity: string;
  batchName: string;
  assignedRole: VoucherAssignmentRole;
  assignedUserId: string;
  type: VoucherType;
  value: string;
  description: string;
  minPurchaseAmount: string;
  maxDiscountAmount: string;
  maxUses: string;
  perUserLimit: string;
  validityMonths: string;
  validFrom: string;
  validUntil: string;
  firstTimeOnly: boolean;
  isStackable: boolean;
  status: 'active' | 'inactive';
}

const initialFormData: VoucherFormData = {
  code: '',
  quantity: '1',
  batchName: '',
  assignedRole: 'all',
  assignedUserId: '',
  type: 'wallet_credit',
  value: '',
  description: '',
  minPurchaseAmount: '0',
  maxDiscountAmount: '',
  maxUses: '1',
  perUserLimit: '1',
  validityMonths: '12',
  validFrom: new Date().toISOString().slice(0, 16),
  validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  firstTimeOnly: false,
  isStackable: false,
  status: 'active',
};

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

function generateVoucherCode() {
  let code = '';
  for (let i = 0; i < 16; i += 1) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return formatVoucherCode(code);
}

function formatVoucherCode(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1-');
}

function displayVoucherSeries(value?: string | null) {
  return value || 'S-0000000000';
}

function displayVoucherSerial(value?: string | null) {
  return value || 'SN-0000000000';
}

function displayVoucherCode(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 16 && /^[\d-]+$/.test(value)) {
    return formatVoucherCode(value);
  }
  return value;
}

function getStatusBadge(status: string) {
  if (status === 'active') {
    return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Active</Badge>;
  }
  if (status === 'inactive') {
    return <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-700">Inactive</Badge>;
  }
  if (status === 'expired') {
    return <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">Expired</Badge>;
  }
  return <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-700">{status}</Badge>;
}

function isVoucherFullyRedeemed(voucher: AdminVoucher) {
  return Boolean(voucher.maxUses && voucher.currentUses >= voucher.maxUses);
}

function getVoucherStatusBadge(voucher: AdminVoucher) {
  if (isVoucherFullyRedeemed(voucher)) {
    return (
      <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
        Redeemed
      </Badge>
    );
  }
  return getStatusBadge(voucher.status);
}

function getTypeLabel(type: string) {
  if (type === 'wallet_credit') return 'Wallet Top-up';
  if (type === 'percentage') return 'Percentage Discount';
  if (type === 'fixed') return 'Fixed Discount';
  return type;
}

function getTypeBadge(type: string) {
  if (type === 'wallet_credit') {
    return <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">Wallet Top-up</Badge>;
  }
  if (type === 'percentage') {
    return <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">Percentage</Badge>;
  }
  return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Fixed Discount</Badge>;
}

function formatVoucherValue(voucher: AdminVoucher) {
  if (voucher.type === 'wallet_credit') return `$${voucher.value} wallet credit`;
  if (voucher.type === 'percentage') return `${voucher.value}% off`;
  return `$${voucher.value} off`;
}

function getRoleLabel(role?: string | null) {
  if (role === 'agent') return 'Agent';
  if (role === 'reseller') return 'Reseller';
  return 'All Customers';
}

function getAssigneeName(user?: Pick<VoucherAssignee, 'name' | 'email'> | null) {
  return user?.name?.trim() || user?.email || 'Selected Account';
}

function getVoucherAssignmentLabel(voucher: AdminVoucher, assigneeById: Map<string, VoucherAssignee>) {
  if (voucher.assignedUserId) {
    const assignee = assigneeById.get(voucher.assignedUserId);
    return `${getRoleLabel(voucher.assignedRole)}: ${getAssigneeName(assignee)}`;
  }
  return getRoleLabel(voucher.assignedRole);
}

function getValueIcon(type: string) {
  if (type === 'wallet_credit') return <Wallet className="h-4 w-4 text-teal-600" />;
  if (type === 'percentage') return <Percent className="h-4 w-4 text-cyan-600" />;
  return <DollarSign className="h-4 w-4 text-amber-600" />;
}

function formatExportDate(value: Date | string | null | undefined, pattern = 'yyyy-MM-dd HH:mm') {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : format(date, pattern);
}

function toDateTimeLocalInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function addValidityMonths(dateTimeValue: string, months: number) {
  const startDate = dateTimeValue ? new Date(dateTimeValue) : new Date();
  const safeStartDate = Number.isNaN(startDate.getTime()) ? new Date() : startDate;
  const endDate = new Date(safeStartDate);
  endDate.setMonth(endDate.getMonth() + months);
  return toDateTimeLocalInputValue(endDate);
}

type AdminVouchersProps = {
  mode?: 'admin' | 'account';
  createOnly?: boolean;
  listPath?: string;
  createPath?: string;
  title?: string;
  description?: string;
  [key: string]: unknown;
};

type VoucherLimitData = {
  limit: string;
  used: string;
  remaining: string | null;
  unlimited: boolean;
  applies: boolean;
};

export default function AdminVouchers({
  mode = 'admin',
  createOnly = false,
  listPath,
  createPath,
  title,
  description,
}: AdminVouchersProps = {}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const platformName = useSettingByKey('platform_name') || 'AYA eSIM Mobile';
  const lightLogo = useSettingByKey('logo');
  const darkLogo = useSettingByKey('dark_logo');
  const isAdminMode = mode === 'admin';
  const voucherApiBase = isAdminMode ? '/api/admin/vouchers' : '/api/account/vouchers';
  const voucherListPath = listPath || (isAdminMode ? '/admin/vouchers' : '/account/vouchers');
  const voucherCreatePath = createPath || (isAdminMode ? '/admin/vouchers/create' : '/account/vouchers/create');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<AdminVoucher | null>(null);
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<VoucherFormData>(initialFormData);

  const { data: vouchersData, isLoading } = useQuery<{
    vouchers: AdminVoucher[];
    statistics?: {
      totalVouchers: number;
      activeVouchers: number;
      totalUsage: number;
      totalDiscount: number;
    };
  }>({
    queryKey: [voucherApiBase],
  });

  const vouchers = vouchersData?.vouchers || [];

  const { data: assignableUsers = [] } = useQuery<VoucherAssignee[]>({
    queryKey: ['/api/admin/voucher-assignees'],
    enabled: isAdminMode,
    queryFn: async () => {
      const fetchRole = async (role: 'agent' | 'reseller') => {
        const response = await apiRequest('GET', `/api/admin/customers?role=${role}&limit=200`);
        const json = await response.json();
        const rows = json?.data?.data || json?.data || [];
        return Array.isArray(rows) ? rows : [];
      };

      const [agents, resellers] = await Promise.all([fetchRole('agent'), fetchRole('reseller')]);
      return [...agents, ...resellers].map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }));
    },
  });

  const assigneeById = useMemo(
    () => new Map(assignableUsers.map((user) => [user.id, user])),
    [assignableUsers],
  );

  const { data: voucherLimit } = useQuery<VoucherLimitData>({
    queryKey: ['/api/wallet/voucher-limit'],
    enabled: !isAdminMode,
  });

  const filteredVouchers = vouchers.filter((voucher) => {
    const matchesSearch =
      voucher.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (voucher.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || voucher.status === statusFilter;
    const matchesType = typeFilter === 'all' || voucher.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const selectedVoucherSet = useMemo(() => new Set(selectedVoucherIds), [selectedVoucherIds]);
  const selectedVouchers = useMemo(
    () => vouchers.filter((voucher) => selectedVoucherSet.has(voucher.id)),
    [selectedVoucherSet, vouchers],
  );
  const filteredVoucherIds = useMemo(() => filteredVouchers.map((voucher) => voucher.id), [filteredVouchers]);
  const allFilteredSelected =
    filteredVoucherIds.length > 0 && filteredVoucherIds.every((id) => selectedVoucherSet.has(id));
  const someFilteredSelected =
    filteredVoucherIds.some((id) => selectedVoucherSet.has(id)) && !allFilteredSelected;

  useEffect(() => {
    setSelectedVoucherIds((current) => {
      const availableIds = new Set(vouchers.map((voucher) => voucher.id));
      const next = current.filter((id) => availableIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [vouchers]);

  const stats = useMemo(() => {
    const walletVouchers = vouchers.filter((voucher) => voucher.type === 'wallet_credit');
    const discountVouchers = vouchers.filter((voucher) => voucher.type !== 'wallet_credit');
    const redeemedWalletValue = walletVouchers.reduce(
      (total, voucher) => total + Number(voucher.value || 0) * (voucher.currentUses || 0),
      0,
    );

    return {
      total: vouchers.length,
      active: vouchers.filter((voucher) => voucher.status === 'active').length,
      wallet: walletVouchers.length,
      discounts: discountVouchers.length,
      redeemedWalletValue,
    };
  }, [vouchers]);

  const createMutation = useMutation({
    mutationFn: async (data: VoucherFormData) => {
      const isWallet = !isAdminMode || data.type === 'wallet_credit';
      const quantity = data.quantity ? parseInt(data.quantity, 10) : 1;
      const response = await apiRequest('POST', voucherApiBase, {
        code: quantity > 1 ? undefined : data.code || undefined,
        quantity,
        batchName: data.batchName || undefined,
        assignedRole: data.assignedRole,
        assignedUserId: isAdminMode ? data.assignedUserId || undefined : undefined,
        type: isAdminMode ? data.type : 'wallet_credit',
        value: parseFloat(data.value),
        description: data.description || undefined,
        minPurchaseAmount: isWallet ? 0 : parseFloat(data.minPurchaseAmount || '0'),
        maxDiscountAmount: !isWallet && data.maxDiscountAmount ? parseFloat(data.maxDiscountAmount) : null,
        maxUses: data.maxUses ? parseInt(data.maxUses, 10) : null,
        perUserLimit: data.perUserLimit ? parseInt(data.perUserLimit, 10) : 1,
        validFrom: new Date(data.validFrom).toISOString(),
        validUntil: new Date(data.validUntil).toISOString(),
        targetCountries: [],
        targetRegions: [],
        targetPackages: [],
        firstTimeOnly: isWallet ? false : data.firstTimeOnly,
        isStackable: isWallet ? false : data.isStackable,
        status: data.status,
      });
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: [voucherApiBase] });
      await queryClient.invalidateQueries({ queryKey: ['/api/wallet/voucher-limit'] });
      setFormData(initialFormData);
      toast({ title: data?.message || 'Voucher created' });
      if (createOnly) {
        setLocation(voucherListPath);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating voucher',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `${voucherApiBase}/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [voucherApiBase] });
      await queryClient.invalidateQueries({ queryKey: ['/api/wallet/voucher-limit'] });
      toast({ title: 'Voucher deleted' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting voucher',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const copyText = async (text: string, label = 'Copied') => {
    await navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  const toggleVoucherSelection = (voucherId: string, checked: boolean | 'indeterminate') => {
    setSelectedVoucherIds((current) => {
      const next = new Set(current);
      if (checked === true) {
        next.add(voucherId);
      } else {
        next.delete(voucherId);
      }
      return Array.from(next);
    });
  };

  const toggleFilteredSelection = (checked: boolean | 'indeterminate') => {
    setSelectedVoucherIds((current) => {
      const next = new Set(current);
      if (checked === true) {
        filteredVoucherIds.forEach((id) => next.add(id));
      } else {
        filteredVoucherIds.forEach((id) => next.delete(id));
      }
      return Array.from(next);
    });
  };

  const exportVouchers = (exportFormat: DocumentExportFormat) => {
    if (!selectedVouchers.length) {
      toast({
        title: 'Select vouchers to export',
        description: 'Choose vouchers from the table or use Select All before exporting.',
        variant: 'destructive',
      });
      return;
    }

    const rows = [
      [
        'Series#',
        'Serial#',
        'Batch',
        'Applies To',
        'Voucher Code',
        'Type',
        'Value',
        'Status',
        'Usage',
        'Valid From',
        'Valid Until',
        'Created At',
        'Description',
        'Redeem Link',
      ],
      ...selectedVouchers.map((voucher) => [
        displayVoucherSeries(voucher.seriesCode),
        displayVoucherSerial(voucher.serialNumber),
        voucher.batchName || displayVoucherSeries(voucher.seriesCode),
        getVoucherAssignmentLabel(voucher, assigneeById),
        displayVoucherCode(voucher.code),
        getTypeLabel(voucher.type),
        formatVoucherValue(voucher),
        voucher.status,
        `${voucher.currentUses}${voucher.maxUses ? ` / ${voucher.maxUses}` : ''}`,
        formatExportDate(voucher.validFrom),
        formatExportDate(voucher.validUntil),
        formatExportDate(voucher.createdAt),
        voucher.description || '',
        voucher.qrPayload || '',
      ]),
    ];

    const html = buildDocumentHtml({
      title: 'Voucher Codes Export',
      subtitle: `Generated ${format(new Date(), 'PPP p')} | ${selectedVouchers.length} selected voucher codes`,
      sections: [
        {
          title: 'Selected Voucher Codes',
          html: rowsToHtmlTable(rows),
        },
      ],
    });

    exportHtmlDocument(html, `voucher-codes-${format(new Date(), 'yyyy-MM-dd')}`, exportFormat);
    toast({
      title: 'Voucher export ready',
      description: `Exported ${selectedVouchers.length} voucher codes.`,
    });
  };

  const buildSingleVoucherHtml = (voucher: AdminVoucher) => {
    const voucherCode = displayVoucherCode(voucher.code);
    const series = displayVoucherSeries(voucher.seriesCode);
    const serial = displayVoucherSerial(voucher.serialNumber);
    const assignment = getVoucherAssignmentLabel(voucher, assigneeById);
    const validFrom = formatExportDate(voucher.validFrom, 'yyyy-MM-dd');
    const validUntil = formatExportDate(voucher.validUntil, 'yyyy-MM-dd');
    const usage = `${voucher.currentUses}${voucher.maxUses ? ` / ${voucher.maxUses}` : ''}`;
    const redeemLink =
      voucher.qrPayload ||
      (voucher.type === 'wallet_credit'
        ? `${window.location.origin}/redeem-voucher?code=${encodeURIComponent(voucher.code)}`
        : '');
    const logoUrl = toAbsoluteAssetUrl(lightLogo || darkLogo);
    const brandInitials = platformName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'AM';
    const instructions =
      voucher.type === 'wallet_credit'
        ? [
            'Sign in to your account wallet.',
            'Scan the QR code or open the redeem link shown on this voucher.',
            'If you redeem manually, enter the voucher code exactly as printed.',
            'After successful redemption, the wallet balance will be updated automatically.',
          ]
        : [
            'Choose a package or top-up and continue to checkout.',
            'Enter the voucher code in the voucher or promo code field.',
            'Review the discount before completing payment.',
            'Use this voucher before the expiry date shown on this form.',
          ];

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(`Voucher ${voucherCode}`)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 22px;
        color: #0f172a;
        background: #eef4f0;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13px;
        line-height: 1.45;
      }
      .voucher-page {
        max-width: 780px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #d8e3dc;
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12);
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 20px 24px;
        background: #0f172a;
        color: #ffffff;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .logo {
        max-width: 150px;
        max-height: 54px;
        object-fit: contain;
        border-radius: 10px;
        background: #ffffff;
        padding: 7px;
      }
      .logo-fallback {
        display: inline-flex;
        width: 54px;
        height: 54px;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        background: #bef264;
        color: #0f172a;
        font-size: 20px;
        font-weight: 800;
      }
      .brand-name {
        margin: 0;
        font-size: 20px;
        font-weight: 800;
      }
      .brand-subtitle {
        margin: 3px 0 0;
        color: #cbd5e1;
        font-size: 12px;
      }
      .status {
        border-radius: 999px;
        background: #bef264;
        color: #0f172a;
        padding: 7px 12px;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 180px;
        gap: 18px;
        padding: 24px;
        border-bottom: 1px solid #e2e8f0;
      }
      .label {
        margin: 0 0 6px;
        color: #64748b;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .value {
        margin: 0;
        color: #0f172a;
        font-size: 36px;
        font-weight: 800;
      }
      .code {
        display: inline-block;
        margin-top: 12px;
        padding: 12px 14px;
        border: 1px dashed #94a3b8;
        border-radius: 12px;
        background: #f8fafc;
        color: #0f172a;
        font-family: "Courier New", monospace;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: .04em;
      }
      .qr-card {
        display: flex;
        min-height: 172px;
        align-items: center;
        justify-content: center;
        border: 1px solid #dbe3ea;
        border-radius: 14px;
        background: #f8fafc;
        padding: 12px;
        text-align: center;
      }
      .qr-card img {
        width: 150px;
        height: 150px;
        object-fit: contain;
        border-radius: 8px;
        background: #ffffff;
      }
      .content {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 18px;
        padding: 24px;
      }
      .panel {
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: #ffffff;
        padding: 16px;
      }
      .panel h2 {
        margin: 0 0 12px;
        color: #0f172a;
        font-size: 15px;
      }
      .detail-row {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 10px;
        padding: 8px 0;
        border-bottom: 1px solid #edf2f7;
      }
      .detail-row:last-child { border-bottom: 0; }
      .detail-key {
        color: #64748b;
        font-size: 12px;
        font-weight: 700;
      }
      .detail-value {
        color: #0f172a;
        font-size: 12.5px;
        font-weight: 700;
        word-break: break-word;
      }
      ol {
        margin: 0;
        padding-left: 18px;
      }
      li {
        margin: 0 0 9px;
        color: #334155;
      }
      .link-box {
        margin-top: 12px;
        border-radius: 10px;
        background: #f1f5f9;
        padding: 10px;
        color: #334155;
        font-size: 11.5px;
        word-break: break-all;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 24px 18px;
        color: #64748b;
        border-top: 1px solid #e2e8f0;
        font-size: 11px;
      }
      @media print {
        @page { size: A4; margin: 10mm; }
        body {
          padding: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .voucher-page {
          max-width: none;
          border-radius: 14px;
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="voucher-page">
      <section class="header">
        <div class="brand">
          ${
            logoUrl
              ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(platformName)} logo" />`
              : `<span class="logo-fallback">${escapeHtml(brandInitials)}</span>`
          }
          <div>
            <h1 class="brand-name">${escapeHtml(platformName)}</h1>
            <p class="brand-subtitle">Official voucher form</p>
          </div>
        </div>
        <span class="status">${escapeHtml(voucher.status)}</span>
      </section>

      <section class="hero">
        <div>
          <p class="label">${escapeHtml(getTypeLabel(voucher.type))}</p>
          <p class="value">${escapeHtml(formatVoucherValue(voucher))}</p>
          <div class="code">${escapeHtml(voucherCode)}</div>
        </div>
        <div>
          <p class="label">Scan to Redeem</p>
          <div class="qr-card">
            ${
              voucher.qrCode
                ? `<img src="${escapeHtml(voucher.qrCode)}" alt="${escapeHtml(voucherCode)} QR code" />`
                : '<span>No QR code available</span>'
            }
          </div>
        </div>
      </section>

      <section class="content">
        <div class="panel">
          <h2>Voucher Details</h2>
          <div class="detail-row"><span class="detail-key">Series#</span><span class="detail-value">${escapeHtml(series)}</span></div>
          <div class="detail-row"><span class="detail-key">Serial#</span><span class="detail-value">${escapeHtml(serial)}</span></div>
          <div class="detail-row"><span class="detail-key">Batch</span><span class="detail-value">${escapeHtml(voucher.batchName || series)}</span></div>
          <div class="detail-row"><span class="detail-key">Assigned To</span><span class="detail-value">${escapeHtml(assignment)}</span></div>
          <div class="detail-row"><span class="detail-key">Valid From</span><span class="detail-value">${escapeHtml(validFrom || '-')}</span></div>
          <div class="detail-row"><span class="detail-key">Valid Until</span><span class="detail-value">${escapeHtml(validUntil || '-')}</span></div>
          <div class="detail-row"><span class="detail-key">Usage</span><span class="detail-value">${escapeHtml(usage)}</span></div>
          <div class="detail-row"><span class="detail-key">Per User</span><span class="detail-value">${escapeHtml(voucher.perUserLimit || 'Unlimited')}</span></div>
        </div>

        <div class="panel">
          <h2>Instructions</h2>
          <ol>
            ${instructions.map((instruction) => `<li>${escapeHtml(instruction)}</li>`).join('')}
          </ol>
          ${
            redeemLink
              ? `<div class="link-box"><strong>Redeem link:</strong><br />${escapeHtml(redeemLink)}</div>`
              : ''
          }
        </div>
      </section>

      <section class="footer">
        <span>${escapeHtml(voucher.description || 'Keep this voucher code private until it is redeemed.')}</span>
        <span>Printed ${escapeHtml(format(new Date(), 'yyyy-MM-dd HH:mm'))}</span>
      </section>
    </main>
  </body>
</html>`;
  };

  const downloadSingleVoucher = async (voucher: AdminVoucher, exportFormat: DocumentExportFormat) => {
    try {
      const response = await apiRequest('GET', `${voucherApiBase}/${voucher.id}/download/${exportFormat}`);
      const extension = exportFormat === 'pdf' ? 'pdf' : exportFormat === 'word' ? 'doc' : 'xls';
      await downloadResponseFile(
        response,
        `voucher-${displayVoucherSerial(voucher.serialNumber)}-${displayVoucherCode(voucher.code)}.${extension}`,
      );
      toast({
        title: 'Voucher downloaded',
        description: `${displayVoucherCode(voucher.code)} saved as ${exportFormat.toUpperCase()}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to download voucher',
        description: error.message || 'Could not create the voucher file.',
        variant: 'destructive',
      });
    }
  };

  const printSingleVoucher = (voucher: AdminVoucher) => {
    if (!printHtmlDocument(buildSingleVoucherHtml(voucher))) {
      toast({
        title: 'Print blocked',
        description: 'Allow popups for this site and try again.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Print voucher',
      description: 'Voucher print window opened.',
    });
  };

  const openVoucher = (voucher: AdminVoucher) => {
    setSelectedVoucher(voucher);
    setIsViewDialogOpen(true);
  };

  if (createOnly) {
    return (
      <div className="space-y-6 p-6 text-slate-900 dark:text-slate-100 lg:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <Button
              type="button"
              variant="outline"
              className={`w-fit gap-2 ${lightOutlineButtonClass}`}
              onClick={() => setLocation(voucherListPath)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Create a New Batch Voucher
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {isAdminMode
                  ? 'Generate one voucher or a bulk batch and assign it to all customers, Agents, or Resellers.'
                  : 'Generate one wallet top-up voucher or a bulk batch using your wallet balance.'}
              </p>
            </div>
          </div>
        </div>

        <Card className="rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-950">Voucher Details</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Complete the batch settings below. Voucher codes are generated automatically for bulk batches.
            </p>
          </CardHeader>
          <CardContent>
            <VoucherForm
              formData={formData}
              setFormData={setFormData}
              assignableUsers={assignableUsers}
              isAccountMode={!isAdminMode}
              voucherLimit={voucherLimit}
              onCancel={() => setLocation(voucherListPath)}
              onSubmit={() => createMutation.mutate(formData)}
              isSubmitting={createMutation.isPending}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 text-slate-900 dark:text-slate-100 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white" data-testid="text-page-title">
            {title || 'Voucher Management'}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {description || 'Create checkout discount vouchers and wallet top-up voucher batches with QR links.'}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className={`w-full md:w-auto ${lightOutlineButtonClass}`} data-testid="button-export-vouchers">
                <Download className="mr-2 h-4 w-4" />
                Export Selected
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-slate-200 bg-white text-slate-900">
              <div className="px-2 py-1.5 text-xs text-slate-500">
                {selectedVouchers.length} selected
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportVouchers('excel')}>
                <Download className="mr-2 h-4 w-4" />
                Excel (.xls)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportVouchers('word')}>
                <FileText className="mr-2 h-4 w-4" />
                Word (.doc)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportVouchers('pdf')}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            className={`w-full md:w-auto ${primaryButtonClass}`}
            onClick={() => setLocation(voucherCreatePath)}
            data-testid="button-create-voucher"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create a New Batch Voucher
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-[#168b80]">Total Vouchers</CardTitle>
            <Ticket className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Active</CardTitle>
            <BarChart3 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-emerald-700">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-cyan-700">Discount Vouchers</CardTitle>
            <Percent className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{stats.discounts}</div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-teal-700">Wallet Vouchers</CardTitle>
            <Wallet className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{stats.wallet}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-slate-950">Voucher Codes</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                {selectedVouchers.length} selected for export
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={lightOutlineButtonClass}
                onClick={() => setSelectedVoucherIds(vouchers.map((voucher) => voucher.id))}
                disabled={vouchers.length === 0}
                data-testid="button-select-all-vouchers"
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                onClick={() => setSelectedVoucherIds([])}
                disabled={selectedVouchers.length === 0}
                data-testid="button-clear-voucher-selection"
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search by code or note..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className={`pl-10 ${lightInputClass}`}
                data-testid="input-search-vouchers"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={`w-[150px] ${lightInputClass}`} data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-900">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className={`w-[180px] ${lightInputClass}`} data-testid="select-type-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-900">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="percentage">Percentage Discount</SelectItem>
                <SelectItem value="fixed">Fixed Discount</SelectItem>
                <SelectItem value="wallet_credit">Wallet Top-up</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-slate-500">Loading vouchers...</div>
          ) : filteredVouchers.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center py-8 text-center text-slate-500">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Ticket className="h-8 w-8 text-slate-400" />
              </div>
              <p className="font-medium text-slate-950">No vouchers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full min-w-[1180px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-700">
                    <th className="w-12 px-4 py-3 font-semibold">
                      <Checkbox
                        checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                        onCheckedChange={(checked) => toggleFilteredSelection(checked)}
                        aria-label="Select all visible vouchers"
                        data-testid="checkbox-select-all-vouchers"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Series#</th>
                    <th className="px-4 py-3 font-semibold">Serial#</th>
                    <th className="px-4 py-3 font-semibold">Batch</th>
                    <th className="px-4 py-3 font-semibold">Applies To</th>
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Value</th>
                    <th className="px-4 py-3 font-semibold">QR</th>
                    <th className="px-4 py-3 font-semibold">Usage</th>
                    <th className="px-4 py-3 font-semibold">Validity</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVouchers.map((voucher, index) => {
                    const fullyRedeemed = isVoucherFullyRedeemed(voucher);
                    return (
                    <tr
                      key={voucher.id}
                      className={
                        fullyRedeemed
                          ? 'border-b border-rose-200 bg-rose-50 text-slate-900'
                          : 'border-b border-slate-200 text-slate-900 hover:bg-slate-50'
                      }
                      data-testid={`row-voucher-${index}`}
                    >
                      <td className="px-4 py-4">
                        <Checkbox
                          checked={selectedVoucherSet.has(voucher.id)}
                          onCheckedChange={(checked) => toggleVoucherSelection(voucher.id, checked)}
                          aria-label={`Select voucher ${displayVoucherCode(voucher.code)}`}
                          data-testid={`checkbox-voucher-${index}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <code className="rounded bg-slate-100 px-2 py-1 font-mono text-sm font-medium text-slate-700">
                          {displayVoucherSeries(voucher.seriesCode)}
                        </code>
                      </td>
                      <td className="px-4 py-4">
                        <code className="rounded bg-slate-100 px-2 py-1 font-mono text-sm font-medium text-slate-700">
                          {displayVoucherSerial(voucher.serialNumber)}
                        </code>
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-[180px] truncate text-sm font-semibold text-slate-950">
                          {voucher.batchName || displayVoucherSeries(voucher.seriesCode)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="whitespace-nowrap border-slate-200 bg-slate-100 text-slate-700">
                          <Users className="mr-1 h-3 w-3" />
                          {getVoucherAssignmentLabel(voucher, assigneeById)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-slate-100 px-2 py-1 font-mono text-sm font-medium text-slate-700">
                            {displayVoucherCode(voucher.code)}
                          </code>
                          <Button
                            size="icon"
                            variant="outline"
                            className={lightOutlineButtonClass}
                            onClick={() => copyText(displayVoucherCode(voucher.code), 'Voucher code copied')}
                            data-testid={`button-copy-${index}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {voucher.description && (
                          <p className="mt-1 text-xs text-slate-500">{voucher.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">{getTypeBadge(voucher.type)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 font-semibold text-slate-950">
                          {getValueIcon(voucher.type)}
                          <span>{formatVoucherValue(voucher)}</span>
                        </div>
                        {voucher.type !== 'wallet_credit' && voucher.minPurchaseAmount && Number(voucher.minPurchaseAmount) > 0 && (
                          <p className="text-xs text-slate-500">Min: ${voucher.minPurchaseAmount}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {voucher.type === 'wallet_credit' ? (
                          <div className="flex items-center gap-2">
                            {voucher.qrCode ? (
                              <img
                                src={voucher.qrCode}
                                alt={`${voucher.code} QR`}
                                className="h-12 w-12 rounded border bg-white p-1"
                              />
                            ) : (
                              <QrCode className="h-6 w-6 text-slate-400" />
                            )}
                            <Button
                              size="icon"
                              variant="outline"
                              className={lightOutlineButtonClass}
                              onClick={() => copyText(voucher.qrPayload || voucher.code, 'Redeem link copied')}
                              title="Copy redeem link"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-800">
                        <span>{voucher.currentUses}</span>
                        {voucher.maxUses && <span className="text-slate-500"> / {voucher.maxUses}</span>}
                        {fullyRedeemed && (
                          <div className="mt-1 text-xs font-medium text-rose-700">Not reusable</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-slate-800">
                          <div>{format(new Date(voucher.validFrom), 'MMM d, yyyy')}</div>
                          <div className="text-slate-500">
                            to {format(new Date(voucher.validUntil), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">{getVoucherStatusBadge(voucher)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className={lightOutlineButtonClass}
                            onClick={() => openVoucher(voucher)}
                            title="View voucher"
                            data-testid={`button-view-${index}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                className={lightOutlineButtonClass}
                                title="Download voucher"
                                data-testid={`button-download-${index}`}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="border-slate-200 bg-white text-slate-900">
                              <DropdownMenuItem onClick={() => downloadSingleVoucher(voucher, 'excel')}>
                                <FileText className="mr-2 h-4 w-4" />
                                Excel
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadSingleVoucher(voucher, 'word')}>
                                <FileText className="mr-2 h-4 w-4" />
                                Word
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadSingleVoucher(voucher, 'pdf')}>
                                <FileText className="mr-2 h-4 w-4" />
                                PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            size="icon"
                            variant="outline"
                            className={lightOutlineButtonClass}
                            onClick={() => printSingleVoucher(voucher)}
                            title="Print voucher"
                            data-testid={`button-print-${index}`}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className={lightOutlineButtonClass}
                            onClick={() => deleteMutation.mutate(voucher.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl border-slate-200 bg-white text-slate-950">
          <DialogHeader>
            <DialogTitle className="text-slate-950">Voucher Details</DialogTitle>
          </DialogHeader>
          {selectedVoucher && (
            <div className="space-y-5">
              <div className="flex flex-wrap justify-end gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className={lightOutlineButtonClass}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border-slate-200 bg-white text-slate-900">
                    <DropdownMenuItem onClick={() => downloadSingleVoucher(selectedVoucher, 'excel')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadSingleVoucher(selectedVoucher, 'word')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Word
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadSingleVoucher(selectedVoucher, 'pdf')}>
                      <FileText className="mr-2 h-4 w-4" />
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button type="button" variant="outline" size="sm" className={lightOutlineButtonClass} onClick={() => printSingleVoucher(selectedVoucher)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Batch</Label>
                  <p className="font-medium text-slate-950">{selectedVoucher.batchName || displayVoucherSeries(selectedVoucher.seriesCode)}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Applies To</Label>
                  <p className="font-medium text-slate-950">{getVoucherAssignmentLabel(selectedVoucher, assigneeById)}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Series#</Label>
                  <p className="font-mono text-slate-950">{displayVoucherSeries(selectedVoucher.seriesCode)}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Serial#</Label>
                  <p className="font-mono text-slate-950">{displayVoucherSerial(selectedVoucher.serialNumber)}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Code</Label>
                  <p className="font-mono text-slate-950">{displayVoucherCode(selectedVoucher.code)}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Status</Label>
                  <div>{getStatusBadge(selectedVoucher.status)}</div>
                </div>
                <div>
                  <Label className="text-slate-500">Type</Label>
                  <div>{getTypeBadge(selectedVoucher.type)}</div>
                </div>
                <div>
                  <Label className="text-slate-500">Value</Label>
                  <p className="font-semibold text-slate-950">{formatVoucherValue(selectedVoucher)}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Usage</Label>
                  <p className="font-medium text-slate-950">
                    {selectedVoucher.currentUses}
                    {selectedVoucher.maxUses ? ` / ${selectedVoucher.maxUses}` : ''}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Per User Limit</Label>
                  <p className="font-medium text-slate-950">{selectedVoucher.perUserLimit || 'Unlimited'}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Valid From</Label>
                  <p className="font-medium text-slate-950">{format(new Date(selectedVoucher.validFrom), 'PPP')}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Valid Until</Label>
                  <p className="font-medium text-slate-950">{format(new Date(selectedVoucher.validUntil), 'PPP')}</p>
                </div>
              </div>

              {selectedVoucher.type !== 'wallet_credit' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Minimum Purchase</Label>
                    <p className="font-medium text-slate-950">${selectedVoucher.minPurchaseAmount || '0'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Maximum Discount</Label>
                    <p className="font-medium text-slate-950">{selectedVoucher.maxDiscountAmount ? `$${selectedVoucher.maxDiscountAmount}` : 'No cap'}</p>
                  </div>
                </div>
              )}

              {selectedVoucher.description && (
                <div>
                  <Label className="text-slate-500">Note</Label>
                  <p className="text-slate-700">{selectedVoucher.description}</p>
                </div>
              )}

              {selectedVoucher.type === 'wallet_credit' && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <Label className="text-slate-500">Redeem QR Code</Label>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                    {selectedVoucher.qrCode ? (
                      <img
                        src={selectedVoucher.qrCode}
                        alt={`${selectedVoucher.code} QR`}
                        className="h-32 w-32 rounded border bg-white p-2"
                      />
                    ) : (
                      <div className="flex h-32 w-32 items-center justify-center rounded border border-slate-200 bg-white">
                        <QrCode className="h-10 w-10 text-slate-400" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">
                        Users can scan this QR or redeem the voucher code on the wallet page.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className={lightOutlineButtonClass}
                        onClick={() => copyText(selectedVoucher.qrPayload || selectedVoucher.code, 'Redeem link copied')}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Redeem Link
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VoucherForm({
  formData,
  setFormData,
  assignableUsers,
  isAccountMode = false,
  voucherLimit,
  onCancel,
  onSubmit,
  isSubmitting,
}: {
  formData: VoucherFormData;
  setFormData: (data: VoucherFormData) => void;
  assignableUsers: VoucherAssignee[];
  isAccountMode?: boolean;
  voucherLimit?: VoucherLimitData;
  onCancel?: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const quantity = Math.max(1, Number(formData.quantity || 1));
  const isBulk = quantity > 1;
  const isWallet = isAccountMode || formData.type === 'wallet_credit';
  const quantityInvalid = quantity < 1 || quantity > 200;
  const filteredAssignees = assignableUsers.filter((user) => user.role === formData.assignedRole);
  const maxUses = Math.max(1, Number(formData.maxUses || 1));
  const batchTotalValue = (Number(formData.value) || 0) * quantity * maxUses;
  const remainingLimit = Number(voucherLimit?.remaining ?? 0);
  const voucherLimitExceeded = Boolean(
    isAccountMode &&
      voucherLimit?.applies &&
      !voucherLimit.unlimited &&
      batchTotalValue > remainingLimit + 0.001,
  );

  const updateAssignmentRole = (assignedRole: VoucherAssignmentRole) => {
    setFormData({
      ...formData,
      assignedRole,
      assignedUserId: '',
    });
  };

  const updateType = (type: VoucherType) => {
    setFormData({
      ...formData,
      type,
      code: '',
      maxUses: type === 'wallet_credit' ? '1' : formData.maxUses,
      minPurchaseAmount: type === 'wallet_credit' ? '0' : formData.minPurchaseAmount,
      maxDiscountAmount: type === 'wallet_credit' ? '' : formData.maxDiscountAmount,
      firstTimeOnly: type === 'wallet_credit' ? false : formData.firstTimeOnly,
      isStackable: type === 'wallet_credit' ? false : formData.isStackable,
    });
  };

  const updateValidFrom = (validFrom: string) => {
    const validityMonths = Number(formData.validityMonths);
    setFormData({
      ...formData,
      validFrom,
      validUntil: validityMonths > 0 ? addValidityMonths(validFrom, validityMonths) : formData.validUntil,
    });
  };

  const updateValidityMonths = (validityMonths: string) => {
    const months = Number(validityMonths);
    setFormData({
      ...formData,
      validityMonths,
      validUntil: months > 0 ? addValidityMonths(formData.validFrom, months) : formData.validUntil,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="batchName" className="text-slate-700">Batch Name</Label>
          <Input
            id="batchName"
            className={lightInputClass}
            value={formData.batchName}
            onChange={(event) => setFormData({ ...formData, batchName: event.target.value })}
            placeholder="Create a New Batch Voucher"
            data-testid="input-voucher-batch-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="assignedRole" className="text-slate-700">Batch Applies To</Label>
          <Select
            value={formData.assignedRole}
            onValueChange={(value) => updateAssignmentRole(value as VoucherAssignmentRole)}
          >
            <SelectTrigger className={lightInputClass} data-testid="select-voucher-assigned-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white text-slate-900">
              <SelectItem value="all">All Customers</SelectItem>
              <SelectItem value="agent">Agents</SelectItem>
              <SelectItem value="reseller">Resellers</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isAccountMode && formData.assignedRole !== 'all' && (
        <div className="space-y-2">
          <Label htmlFor="assignedUserId" className="text-slate-700">Assign Specific {getRoleLabel(formData.assignedRole)} Account</Label>
          <Select
            value={formData.assignedUserId || 'any'}
            onValueChange={(value) => setFormData({ ...formData, assignedUserId: value === 'any' ? '' : value })}
          >
            <SelectTrigger className={lightInputClass} data-testid="select-voucher-assigned-user">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white text-slate-900">
              <SelectItem value="any">Any {getRoleLabel(formData.assignedRole)}</SelectItem>
              {filteredAssignees.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {getAssigneeName(user)} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            Choose Any to let any {getRoleLabel(formData.assignedRole)} redeem this batch, or select one account.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type" className="text-slate-700">Voucher Type</Label>
          {isAccountMode ? (
            <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
              Wallet Top-up
            </div>
          ) : (
            <Select value={formData.type} onValueChange={(value) => updateType(value as VoucherType)}>
              <SelectTrigger className={lightInputClass} data-testid="select-voucher-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-900">
                <SelectItem value="wallet_credit">Wallet Top-up</SelectItem>
                <SelectItem value="percentage">Percentage Discount</SelectItem>
                <SelectItem value="fixed">Fixed Discount</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="status" className="text-slate-700">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value as VoucherFormData['status'] })}
          >
            <SelectTrigger className={lightInputClass} data-testid="select-voucher-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white text-slate-900">
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code" className="text-slate-700">Voucher Code</Label>
          <div className="flex gap-2">
            <Input
              id="code"
              className={lightInputClass}
              value={formData.code}
              onChange={(event) =>
                setFormData({ ...formData, code: formatVoucherCode(event.target.value) })
              }
              placeholder={isBulk ? 'Auto-generated for each voucher' : '0000-0000-0000-0000'}
              disabled={isBulk}
              maxLength={19}
              inputMode="numeric"
              data-testid="input-voucher-code"
            />
            {!isBulk && (
              <Button
                type="button"
                variant="outline"
                className={lightOutlineButtonClass}
                onClick={() => setFormData({ ...formData, code: generateVoucherCode() })}
                data-testid="button-generate-code"
              >
                Generate
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Voucher codes are numeric, exactly 16 digits, and grouped as 0000-0000-0000-0000.
            Bulk vouchers are generated automatically.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity" className="text-slate-700">Quantity</Label>
          <Input
            id="quantity"
            className={lightInputClass}
            type="number"
            min="1"
            max="200"
            value={formData.quantity}
            onChange={(event) => {
              const nextQuantity = Number(event.target.value || 1);
              setFormData({
                ...formData,
                quantity: event.target.value,
                code: nextQuantity > 1 ? '' : formData.code,
              });
            }}
            placeholder="1"
            data-testid="input-voucher-quantity"
          />
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
        Each batch receives one Series# in the format S-0000000001, and every voucher receives its own Serial# in the format SN-0000000001.
      </div>

      {isAccountMode && voucherLimit?.applies && (
        <div className="rounded-md border border-lime-300 bg-lime-50 px-3 py-2 text-sm text-lime-950 dark:border-lime-400/30 dark:bg-lime-400/10 dark:text-lime-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">Voucher Limit</span>
            <span>
              {voucherLimit.unlimited
                ? 'Unlimited'
                : `$${voucherLimit.remaining || '0.00'} remaining of $${voucherLimit.limit}`}
            </span>
          </div>
          <p className="mt-1 text-xs opacity-80">
            This batch will reserve ${batchTotalValue.toFixed(2)} from your wallet limit.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="value" className="text-slate-700">{isWallet ? 'Wallet Top-up Amount' : 'Discount Value'}</Label>
          <Input
            id="value"
            className={lightInputClass}
            type="number"
            min="0.01"
            step="0.01"
            value={formData.value}
            onChange={(event) => setFormData({ ...formData, value: event.target.value })}
            placeholder={formData.type === 'percentage' ? '20' : '10.00'}
            data-testid="input-voucher-value"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxUses" className="text-slate-700">{isWallet ? 'Redeem Limit Per Voucher' : 'Total Usage Limit'}</Label>
          <Input
            id="maxUses"
            className={lightInputClass}
            type="number"
            min="1"
            value={formData.maxUses}
            onChange={(event) => setFormData({ ...formData, maxUses: event.target.value })}
            placeholder="1"
            data-testid="input-max-uses"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="perUserLimit" className="text-slate-700">Redeem Limit Per User</Label>
          <Input
            id="perUserLimit"
            className={lightInputClass}
            type="number"
            min="1"
            value={formData.perUserLimit}
            onChange={(event) => setFormData({ ...formData, perUserLimit: event.target.value })}
            placeholder="1"
            data-testid="input-per-user-limit"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700">Voucher Use</Label>
          <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
            {isWallet ? 'User wallet balance' : 'Checkout cart discount'}
          </div>
        </div>
      </div>

      {!isWallet && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minPurchaseAmount" className="text-slate-700">Minimum Purchase Amount</Label>
            <Input
              id="minPurchaseAmount"
              className={lightInputClass}
              type="number"
              min="0"
              step="0.01"
              value={formData.minPurchaseAmount}
              onChange={(event) => setFormData({ ...formData, minPurchaseAmount: event.target.value })}
              placeholder="0"
              data-testid="input-min-purchase"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxDiscountAmount" className="text-slate-700">Maximum Discount Cap</Label>
            <Input
              id="maxDiscountAmount"
              className={lightInputClass}
              type="number"
              min="0"
              step="0.01"
              value={formData.maxDiscountAmount}
              onChange={(event) => setFormData({ ...formData, maxDiscountAmount: event.target.value })}
              placeholder="Leave empty for no cap"
              data-testid="input-max-discount"
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="validFrom" className="text-slate-700">Valid From</Label>
          <Input
            id="validFrom"
            className={lightInputClass}
            type="datetime-local"
            value={formData.validFrom}
            onChange={(event) => updateValidFrom(event.target.value)}
            data-testid="input-valid-from"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="validityMonths" className="text-slate-700">Auto Validity</Label>
          <Select value={formData.validityMonths} onValueChange={updateValidityMonths}>
            <SelectTrigger id="validityMonths" className={lightInputClass} data-testid="select-voucher-validity-months">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white text-slate-900">
              <SelectItem value="3">3 Months</SelectItem>
              <SelectItem value="6">6 Months</SelectItem>
              <SelectItem value="9">9 Months</SelectItem>
              <SelectItem value="12">12 Months</SelectItem>
              <SelectItem value="custom">Custom Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="validUntil" className="text-slate-700">Valid Until</Label>
          <Input
            id="validUntil"
            className={lightInputClass}
            type="datetime-local"
            value={formData.validUntil}
            onChange={(event) => setFormData({ ...formData, validUntil: event.target.value, validityMonths: 'custom' })}
            data-testid="input-valid-until"
          />
        </div>
      </div>

      {!isWallet && (
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="firstTimeOnly"
              checked={formData.firstTimeOnly}
              onCheckedChange={(checked) => setFormData({ ...formData, firstTimeOnly: checked })}
              className={tableSwitchClass}
              data-testid="switch-first-time-only"
            />
            <Label htmlFor="firstTimeOnly" className="text-slate-700">First-time Customers only</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="isStackable"
              checked={formData.isStackable}
              onCheckedChange={(checked) => setFormData({ ...formData, isStackable: checked })}
              className={tableSwitchClass}
              data-testid="switch-stackable"
            />
            <Label htmlFor="isStackable" className="text-slate-700">Stackable with other offers</Label>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description" className="text-slate-700">Admin Note</Label>
        <Textarea
          id="description"
          className={lightInputClass}
          value={formData.description}
          onChange={(event) => setFormData({ ...formData, description: event.target.value })}
          placeholder={isWallet ? 'Optional note for this top-up voucher' : 'Optional note for this discount voucher'}
          data-testid="input-description"
        />
      </div>

      <DialogFooter>
        {voucherLimitExceeded && (
          <p className="mr-auto text-sm text-destructive">
            This batch exceeds your remaining voucher limit of ${voucherLimit?.remaining || '0.00'}.
          </p>
        )}
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className={lightOutlineButtonClass}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          className={primaryButtonClass}
          onClick={onSubmit}
          disabled={
            isSubmitting ||
            !formData.value ||
            Number(formData.value) <= 0 ||
            quantityInvalid
            || voucherLimitExceeded
            || (!isBulk && Boolean(formData.code) && !VOUCHER_CODE_PATTERN.test(formData.code))
          }
          data-testid="button-submit-voucher"
        >
          {isSubmitting
            ? 'Creating...'
            : isBulk
              ? `Create Batch (${quantity} ${isWallet ? 'Wallet' : 'Discount'} Vouchers)`
              : `Create Batch (${isWallet ? 'Wallet Top-up' : 'Discount'} Voucher)`}
        </Button>
      </DialogFooter>
    </div>
  );
}
