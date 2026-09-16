import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Download,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Mail,
  Plus,
  Printer,
  ReceiptText,
  Send,
  BadgeCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import {
  buildDocumentHtml,
  downloadResponseFile,
  escapeHtml,
  printHtmlDocument,
  rowsToHtmlTable,
  toAbsoluteAssetUrl,
  type DocumentExportFormat,
} from '@/lib/documentExport';

type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

type InvoicePaymentMethod = 'credit_card' | 'voucher' | 'paypal' | 'crypto' | 'wire_transfer';

type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  type: 'manual' | 'monthly';
  status: 'draft' | 'sent' | 'payment_pending' | 'paid';
  customerName: string;
  customerEmail: string;
  issuerUserId?: string;
  issuerName?: string;
  issuerLogoUrl?: string;
  period?: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  tax: number;
  total: number;
  notes?: string;
  paymentMethods?: InvoicePaymentMethod[];
  wireTransferInstructions?: string;
  paymentMethod?: InvoicePaymentMethod | 'manual';
  paymentReference?: string;
  reminderSentAt?: string;
  paidAt?: string;
  lineItems: InvoiceLineItem[];
  sentAt?: string;
  createdAt: string;
};

type InvoiceSettings = {
  autoSendMonthly: boolean;
  sendDay: number;
  defaultDueDays: number;
  recipients: string;
  paymentMethods: InvoicePaymentMethod[];
  wireTransferInstructions: string;
  autoSendReminders: boolean;
  reminderDaysBeforeDue: number;
  lastAutoSentPeriod?: string;
  lastAutoSentAt?: string;
  lastReminderRunAt?: string;
};

type InvoiceIssuer = {
  id: string;
  role: 'agent' | 'reseller' | string;
  name: string;
  email: string;
  storeName: string;
  logoUrl?: string;
};

type InvoiceClient = {
  id: string;
  displayUserId?: number;
  name?: string | null;
  email: string;
  phone?: string | null;
  role: 'customer' | 'agent' | 'reseller' | string;
  walletBalance?: string | number | null;
  resellerStoreName?: string | null;
  resellerLogoUrl?: string | null;
  createdAt?: string;
};

type InvoiceDashboard = {
  settings: InvoiceSettings;
  invoices: InvoiceRecord[];
  statistics: {
    totalInvoices: number;
    sentInvoices: number;
    draftInvoices: number;
    totalAmount: number;
    sentAmount: number;
  };
};

type ManualLineItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type ManualInvoiceForm = {
  customerName: string;
  customerEmail: string;
  dueDate: string;
  currency: string;
  tax: string;
  discountPercent: string;
  notes: string;
  sendNow: boolean;
  issuerUserId: string;
  lineItems: ManualLineItem[];
};

const emptyLineItem = (): ManualLineItem => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: '1',
  unitPrice: '0',
});

const initialManualInvoiceForm = (): ManualInvoiceForm => ({
  customerName: '',
  customerEmail: '',
  dueDate: '',
  currency: 'USD',
  tax: '0',
  discountPercent: '0',
  notes: '',
  sendNow: false,
  issuerUserId: 'platform',
  lineItems: [emptyLineItem()],
});

function dateInputValueFromToday(daysToAdd = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

const defaultSettings: InvoiceSettings = {
  autoSendMonthly: false,
  sendDay: 1,
  defaultDueDays: 14,
  recipients: '',
  paymentMethods: ['credit_card', 'voucher', 'paypal', 'crypto', 'wire_transfer'],
  wireTransferInstructions: 'Contact billing support for wire transfer bank details before sending funds.',
  autoSendReminders: false,
  reminderDaysBeforeDue: 3,
};

const paymentMethodOptions: Array<{ value: InvoicePaymentMethod; label: string }> = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'wire_transfer', label: 'Wire Transfer' },
];

const panelClass = 'overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm';
const primaryButtonClass = 'border-[#58cbbb] bg-[#58cbbb] text-slate-950 hover:bg-[#48bdae]';
const lightButtonClass = 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';
const darkInputClass =
  'border-[#24445f] bg-[#071b35] text-white placeholder:text-slate-400 focus-visible:ring-teal-500';
const dialogFieldScope =
  '[&_input]:border-[#24445f] [&_input]:bg-[#071b35] [&_input]:text-white [&_input::placeholder]:text-slate-400 [&_textarea]:border-[#24445f] [&_textarea]:bg-[#071b35] [&_textarea]:text-white [&_textarea::placeholder]:text-slate-400';

function formatCurrency(value: number | undefined, currency = 'USD') {
  const safeCurrency = /^[A-Z]{3}$/.test(currency || '') ? currency : 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: safeCurrency,
  }).format(Number(value || 0));
}

function formatDate(value: string | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function jsonData<T>(response: Response): Promise<T> {
  const json = await response.json();
  return json.data || json;
}

function statusBadgeClass(status: InvoiceRecord['status']) {
  if (status === 'paid') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (status === 'payment_pending') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  return status === 'sent'
    ? 'bg-teal-50 text-teal-700 border-teal-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';
}

function paymentMethodLabel(method: InvoicePaymentMethod | 'manual' | undefined) {
  if (!method) return 'Not selected';
  return paymentMethodOptions.find((item) => item.value === method)?.label || 'Manual';
}

function fallbackCustomerName(customerName: string, customerEmail: string) {
  const trimmedName = customerName.trim();
  if (trimmedName) return trimmedName;
  const emailName = customerEmail.trim().split('@')[0];
  return emailName || 'Customer';
}

function clientRoleLabel(role: string) {
  if (role === 'customer') return 'User';
  if (role === 'agent') return 'Agent';
  if (role === 'reseller') return 'Reseller';
  return role || 'Client';
}

function clientDisplayName(client: InvoiceClient) {
  return client.name?.trim() || client.resellerStoreName?.trim() || client.email;
}

type AdminInvoicesProps = {
  mode?: 'admin' | 'account';
  title?: string;
  description?: string;
  [key: string]: unknown;
};

export default function AdminInvoices({
  mode = 'admin',
  title,
  description,
}: AdminInvoicesProps = {}) {
  const { toast } = useToast();
  const isAdminMode = mode === 'admin';
  const invoiceApiBase = isAdminMode ? '/api/admin/invoices' : '/api/account/invoices';
  const [settingsForm, setSettingsForm] = useState<InvoiceSettings>(defaultSettings);
  const [manualForm, setManualForm] = useState<ManualInvoiceForm>(initialManualInvoiceForm);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [debouncedClientSearch, setDebouncedClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [monthlyPeriod, setMonthlyPeriod] = useState(currentMonthValue());
  const [sendMonthlyNow, setSendMonthlyNow] = useState(false);

  const { data, isLoading } = useQuery<InvoiceDashboard>({
    queryKey: [invoiceApiBase],
  });
  const { data: issuers = [] } = useQuery<InvoiceIssuer[]>({
    queryKey: [`${invoiceApiBase}/issuers`],
    enabled: isAdminMode,
  });
  const { data: invoiceClients = [], isFetching: isFetchingInvoiceClients } = useQuery<InvoiceClient[]>({
    queryKey: [`${invoiceApiBase}/clients`, { search: debouncedClientSearch || undefined, limit: 20 }],
    enabled: createDialogOpen && clientDropdownOpen,
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedClientSearch(clientSearch.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [clientSearch]);

  useEffect(() => {
    if (data?.settings) {
      setSettingsForm({
        ...defaultSettings,
        ...data.settings,
      });
    }
  }, [data?.settings]);

  const statistics = data?.statistics;
  const invoices = data?.invoices || [];
  const canCreateManualInvoice =
    Boolean(manualForm.customerEmail.trim()) &&
    manualForm.lineItems.every(
      (item) =>
        item.description.trim() &&
        Number(item.quantity) > 0 &&
        Number.isFinite(Number(item.unitPrice)),
    );

  const manualSubtotal = useMemo(
    () =>
      manualForm.lineItems.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        0,
      ),
    [manualForm.lineItems],
  );
  const manualDiscountPercent = Math.min(100, Math.max(0, Number(manualForm.discountPercent) || 0));
  const manualDiscountAmount = manualSubtotal * (manualDiscountPercent / 100);
  const manualTotal = Math.max(manualSubtotal - manualDiscountAmount + (Number(manualForm.tax) || 0), 0);

  const handleCreateDialogOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
    if (open) {
      setManualForm((current) => ({
        ...current,
        dueDate: current.dueDate || dateInputValueFromToday(settingsForm.defaultDueDays || 14),
      }));
    }
    if (!open) {
      setClientSearch('');
      setDebouncedClientSearch('');
      setSelectedClientId('');
      setClientDropdownOpen(false);
    }
  };

  const applyInvoiceClient = (client: InvoiceClient) => {
    setSelectedClientId(client.id);
    setClientSearch('');
    setDebouncedClientSearch('');
    setClientDropdownOpen(false);
    setManualForm((current) => ({
      ...current,
      customerName: clientDisplayName(client),
      customerEmail: client.email,
    }));
  };

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PUT', `${invoiceApiBase}/settings`, settingsForm);
      return jsonData<InvoiceSettings>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invoiceApiBase] });
      toast({ title: 'Invoice settings saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save invoice settings', description: error.message, variant: 'destructive' });
    },
  });

  const generateMonthlyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `${invoiceApiBase}/generate-monthly`, {
        period: monthlyPeriod,
        recipientEmail: settingsForm.recipients,
        sendNow: sendMonthlyNow,
      });
      return jsonData<InvoiceRecord>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invoiceApiBase] });
      toast({ title: sendMonthlyNow ? 'Monthly invoice generated and sent' : 'Monthly invoice generated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to generate monthly invoice', description: error.message, variant: 'destructive' });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const customerEmail = manualForm.customerEmail.trim();
      const response = await apiRequest('POST', invoiceApiBase, {
        customerName: fallbackCustomerName(manualForm.customerName, customerEmail),
        customerEmail,
        dueDate: manualForm.dueDate || undefined,
        currency: manualForm.currency,
        tax: Number(manualForm.tax || 0),
        discountPercent: manualDiscountPercent,
        notes: manualForm.notes,
        sendNow: manualForm.sendNow,
        ...(isAdminMode
          ? { issuerUserId: manualForm.issuerUserId === 'platform' ? undefined : manualForm.issuerUserId }
          : {}),
        paymentMethods: settingsForm.paymentMethods,
        wireTransferInstructions: settingsForm.wireTransferInstructions,
        lineItems: manualForm.lineItems.map((item) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0),
        })),
      });
      return jsonData<InvoiceRecord>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invoiceApiBase] });
      setManualForm(initialManualInvoiceForm());
      setClientSearch('');
      setDebouncedClientSearch('');
      setSelectedClientId('');
      setClientDropdownOpen(false);
      setCreateDialogOpen(false);
      toast({ title: manualForm.sendNow ? 'Invoice created and sent' : 'Invoice created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create invoice', description: error.message, variant: 'destructive' });
    },
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await apiRequest('POST', `${invoiceApiBase}/${invoiceId}/send`, {});
      return jsonData<InvoiceRecord>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invoiceApiBase] });
      toast({ title: 'Invoice sent' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to send invoice', description: error.message, variant: 'destructive' });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await apiRequest('POST', `${invoiceApiBase}/${invoiceId}/remind`, {});
      return jsonData<InvoiceRecord>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invoiceApiBase] });
      toast({ title: 'Invoice reminder sent' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to send reminder', description: error.message, variant: 'destructive' });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await apiRequest('POST', `${invoiceApiBase}/${invoiceId}/mark-paid`, {});
      return jsonData<InvoiceRecord>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invoiceApiBase] });
      toast({ title: 'Invoice marked paid' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to mark invoice paid', description: error.message, variant: 'destructive' });
    },
  });

  const updateLineItem = (id: string, field: keyof ManualLineItem, value: string) => {
    setManualForm((current) => ({
      ...current,
      lineItems: current.lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeLineItem = (id: string) => {
    setManualForm((current) => ({
      ...current,
      lineItems: current.lineItems.length === 1 ? current.lineItems : current.lineItems.filter((item) => item.id !== id),
    }));
  };

  const togglePaymentMethod = (method: InvoicePaymentMethod) => {
    setSettingsForm((current) => {
      const hasMethod = current.paymentMethods.includes(method);
      const paymentMethods = hasMethod
        ? current.paymentMethods.filter((item) => item !== method)
        : [...current.paymentMethods, method];

      return {
        ...current,
        paymentMethods: paymentMethods.length > 0 ? paymentMethods : current.paymentMethods,
      };
    });
  };

  const buildPrintableInvoiceHtml = (invoice: InvoiceRecord) => {
    const payUrl = `${window.location.origin}/invoice/${invoice.id}`;
    const methods = invoice.paymentMethods?.length ? invoice.paymentMethods : defaultSettings.paymentMethods;
    const logoUrl = toAbsoluteAssetUrl(invoice.issuerLogoUrl);
    const isPaid = invoice.status === 'paid';
    const detailsRows = [
      ['Field', 'Value'],
      ['Customer', invoice.customerName],
      ['Email', invoice.customerEmail],
      ['Status', invoice.status],
      ['Issue Date', formatDate(invoice.issueDate)],
      ['Due Date', formatDate(invoice.dueDate)],
      ['Payment Method', paymentMethodLabel(invoice.paymentMethod)],
      ...(!isPaid ? [['Payment Link', payUrl]] : []),
      ['Subtotal', formatCurrency(invoice.subtotal, invoice.currency)],
      ['Discount', `${Number(invoice.discountPercent || 0)}% (${formatCurrency(invoice.discountAmount || 0, invoice.currency)})`],
      ['Tax', formatCurrency(invoice.tax, invoice.currency)],
      ['Total', formatCurrency(invoice.total, invoice.currency)],
    ];

    return buildDocumentHtml({
      title: `Invoice ${invoice.invoiceNumber}`,
      subtitle: `${invoice.issuerName || 'AYA eSIM Mobile'} - ${invoice.customerName} - ${formatDate(invoice.issueDate)}`,
      sections: [
        {
          html: `
            <div style="padding:14px;border-radius:14px;background:#0f172a;color:#fff;">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" style="max-height:48px;max-width:130px;background:#fff;border-radius:10px;padding:6px;object-fit:contain;" />` : ''}
              <h2 style="margin:12px 0 5px;font-size:17px;">${escapeHtml(invoice.issuerName || 'AYA eSIM Mobile')} Invoice</h2>
              ${isPaid
                ? '<p style="color:#cbd5e1;font-size:12px;">Payment completed. This invoice has been marked as paid.</p>'
                : `<p style="color:#cbd5e1;font-size:12px;">Pay online using: ${escapeHtml(methods.map(paymentMethodLabel).join(', '))}</p>
              <a href="${escapeHtml(payUrl)}" style="display:inline-block;margin-top:9px;padding:8px 13px;border-radius:8px;background:#bef264;color:#0f172a;text-decoration:none;font-weight:800;font-size:12px;">Pay Now</a>`}
            </div>
          `,
        },
        {
          title: 'Invoice Details',
          html: rowsToHtmlTable(detailsRows),
        },
        {
          title: 'Line Items',
          html: rowsToHtmlTable([
            ['Description', 'Quantity', 'Unit Price', 'Amount'],
            ...invoice.lineItems.map((item) => [
              item.description,
              item.quantity,
              formatCurrency(item.unitPrice, invoice.currency),
              formatCurrency(item.amount, invoice.currency),
            ]),
          ]),
        },
      ],
    });
  };

  const downloadInvoice = async (invoice: InvoiceRecord, format: DocumentExportFormat) => {
    try {
      const response = await apiRequest('GET', `${invoiceApiBase}/${invoice.id}/download/${format}`);
      const extension = format === 'pdf' ? 'pdf' : format === 'word' ? 'doc' : 'xls';
      await downloadResponseFile(response, `invoice-${invoice.invoiceNumber}.${extension}`);
      toast({ title: 'Invoice downloaded' });
    } catch (error: any) {
      toast({
        title: 'Failed to download invoice',
        description: error.message || 'Could not create the invoice file',
        variant: 'destructive',
      });
    }
  };

  const printInvoice = (invoice: InvoiceRecord) => {
    const printed = printHtmlDocument(buildPrintableInvoiceHtml(invoice));
    if (!printed) {
      toast({
        title: 'Unable to open print window',
        description: 'Please allow popups for this site and try again.',
        variant: 'destructive',
      });
    }
  };

  const selectedClientLabel = selectedClientId
    ? fallbackCustomerName(manualForm.customerName, manualForm.customerEmail)
    : '';

  return (
    <div className="space-y-6 p-6">
      <div className="w-full max-w-[1680px] space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <ReceiptText className="h-7 w-7 text-[#58cbbb]" />
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title || 'Invoicing'}</h1>
                <p className="mt-1 text-sm text-slate-300">
                  {description || 'Manage monthly invoices, manual invoices, and customer billing exports.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {isAdminMode && (
              <Button
                type="button"
                variant="outline"
                className={`gap-2 ${lightButtonClass}`}
                onClick={() => generateMonthlyMutation.mutate()}
                disabled={generateMonthlyMutation.isPending}
              >
                <CalendarClock className="h-4 w-4" />
                Generate Monthly
              </Button>
            )}
            <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogOpenChange}>
              <DialogTrigger asChild>
                <Button className={`gap-2 ${primaryButtonClass}`}>
                  <FilePlus2 className="h-4 w-4" />
                  Create New Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className={cn('max-h-[90vh] max-w-4xl overflow-y-auto border border-slate-200 bg-white text-slate-950 shadow-2xl [&>button]:text-slate-500 [&_label]:text-slate-700', dialogFieldScope)}>
                <DialogHeader>
                  <DialogTitle className="text-slate-950">Create New Invoice</DialogTitle>
                </DialogHeader>

                <div className="grid gap-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    {isAdminMode && (
                      <div className="space-y-2 md:col-span-2">
                        <Label>Invoice Brand / Issuer</Label>
                        <select
                          value={manualForm.issuerUserId}
                          onChange={(event) => setManualForm((current) => ({ ...current, issuerUserId: event.target.value }))}
                          className={`h-10 w-full rounded-md px-3 py-2 text-sm ${darkInputClass}`}
                        >
                          <option value="platform">Platform Logo</option>
                          {issuers.map((issuer) => (
                            <option key={issuer.id} value={issuer.id}>
                              {issuer.storeName || issuer.name} ({issuer.role})
                              {issuer.logoUrl ? ' - logo uploaded' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-3 md:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label>Search Client</Label>
                        {selectedClientId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                            onClick={() => {
                              setSelectedClientId('');
                              setClientSearch('');
                            }}
                          >
                            <X className="h-4 w-4" />
                            Clear
                          </Button>
                        )}
                      </div>
                      <Popover open={clientDropdownOpen} onOpenChange={setClientDropdownOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={clientDropdownOpen}
                            className={`h-auto min-h-11 w-full justify-between gap-3 px-3 py-2 text-left hover:bg-[#102642] ${darkInputClass}`}
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-950/80 text-blue-100">
                                <UserRound className="h-5 w-5" />
                              </span>
                              <span className="min-w-0">
                                <span className={cn('block truncate font-semibold', !selectedClientLabel && 'text-slate-400')}>
                                  {selectedClientLabel || 'Select client from dropdown'}
                                </span>
                                <span className="block truncate text-xs text-slate-400">
                                  {selectedClientId ? manualForm.customerEmail : 'Search Users, Agents, or Resellers'}
                                </span>
                              </span>
                            </span>
                            <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-[var(--radix-popover-trigger-width)] border-slate-200 bg-white p-0 text-slate-950"
                        >
                          <Command shouldFilter={false} className="bg-white text-slate-950">
                            <CommandInput
                              value={clientSearch}
                              onValueChange={setClientSearch}
                              placeholder="Search name, email, phone, or ID"
                            />
                            <CommandList className="max-h-72 p-2">
                              {isFetchingInvoiceClients ? (
                                <div className="px-3 py-6 text-center text-sm text-slate-500">Loading clients...</div>
                              ) : invoiceClients.length === 0 ? (
                                <CommandEmpty>No clients found.</CommandEmpty>
                              ) : (
                                <CommandGroup>
                                  {invoiceClients.map((client) => {
                                    const selected = selectedClientId === client.id;
                                    return (
                                      <CommandItem
                                        key={client.id}
                                        value={`${client.id} ${clientDisplayName(client)} ${client.email} ${client.phone || ''}`}
                                        onSelect={() => applyInvoiceClient(client)}
                                        className={cn(
                                          'mb-1 cursor-pointer rounded-md border p-3 aria-selected:bg-teal-50',
                                          selected
                                            ? 'border-[#58cbbb] bg-teal-50 text-slate-950 aria-selected:bg-teal-50'
                                            : 'border-transparent text-slate-950 hover:border-[#58cbbb]',
                                        )}
                                      >
                                        <div
                                          className={cn(
                                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                                            selected ? 'bg-[#58cbbb] text-slate-950' : 'bg-slate-100 text-slate-600',
                                          )}
                                        >
                                          <UserRound className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="truncate font-semibold">{clientDisplayName(client)}</span>
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                'h-5 rounded-full px-2 text-[11px]',
                                                selected
                                                  ? 'border-slate-950/20 bg-white/40 text-slate-950'
                                                  : 'border-slate-200 text-slate-500',
                                              )}
                                            >
                                              {clientRoleLabel(client.role)}
                                            </Badge>
                                          </div>
                                          <div className={cn('mt-1 truncate text-xs', selected ? 'text-slate-800' : 'text-slate-500')}>
                                            {client.email}
                                            {client.phone ? ` - ${client.phone}` : ''}
                                          </div>
                                          <div className={cn('mt-1 text-xs', selected ? 'text-slate-800' : 'text-slate-500')}>
                                            Wallet {formatCurrency(Number(client.walletBalance || 0))}
                                            {client.displayUserId ? ` - UID${String(client.displayUserId).padStart(3, '0')}` : ''}
                                          </div>
                                        </div>
                                        {selected && <Check className="h-5 w-5 shrink-0" />}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Customer Name</Label>
                      <Input
                        value={manualForm.customerName}
                        onChange={(event) => {
                          setSelectedClientId('');
                          setManualForm((current) => ({ ...current, customerName: event.target.value }));
                        }}
                        placeholder="Optional, uses email name if blank"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Customer Email</Label>
                      <Input
                        type="email"
                        value={manualForm.customerEmail}
                        onChange={(event) => {
                          setSelectedClientId('');
                          setManualForm((current) => ({ ...current, customerEmail: event.target.value }));
                        }}
                        placeholder="billing@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={manualForm.dueDate}
                        onChange={(event) => setManualForm((current) => ({ ...current, dueDate: event.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Input
                          value={manualForm.currency}
                          onChange={(event) => setManualForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Discount %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={manualForm.discountPercent}
                          onChange={(event) => setManualForm((current) => ({ ...current, discountPercent: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tax</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={manualForm.tax}
                          onChange={(event) => setManualForm((current) => ({ ...current, tax: event.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between border-b border-slate-200 p-4">
                      <h3 className="font-semibold text-slate-950">Line Items</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`gap-2 ${lightButtonClass}`}
                        onClick={() =>
                          setManualForm((current) => ({
                            ...current,
                            lineItems: [...current.lineItems, emptyLineItem()],
                          }))
                        }
                      >
                        <Plus className="h-4 w-4" />
                        Add Item
                      </Button>
                    </div>
                    <div className="space-y-3 p-4">
                      {manualForm.lineItems.map((item) => (
                        <div key={item.id} className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_110px_140px_44px]">
                          <Input
                            value={item.description}
                            onChange={(event) => updateLineItem(item.id, 'description', event.target.value)}
                            placeholder="Description"
                          />
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) => updateLineItem(item.id, 'quantity', event.target.value)}
                            placeholder="Qty"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(event) => updateLineItem(item.id, 'unitPrice', event.target.value)}
                            placeholder="Unit price"
                          />
                          <Button type="button" variant="ghost" size="icon" className="hover:bg-red-50" onClick={() => removeLineItem(item.id)} aria-label="Remove item">
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_260px]">
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={manualForm.notes}
                        onChange={(event) => setManualForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Optional invoice notes"
                      />
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-slate-950">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Subtotal</span>
                        <strong>{formatCurrency(manualSubtotal, manualForm.currency)}</strong>
                      </div>
                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-slate-500">Discount ({manualDiscountPercent}%)</span>
                        <strong>-{formatCurrency(manualDiscountAmount, manualForm.currency)}</strong>
                      </div>
                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-slate-500">Tax</span>
                        <strong>{formatCurrency(Number(manualForm.tax || 0), manualForm.currency)}</strong>
                      </div>
                      <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-lg font-bold">
                        <span>Total</span>
                        <span>{formatCurrency(manualTotal, manualForm.currency)}</span>
                      </div>
                      <label className="mt-5 flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white p-3">
                        <span className="text-sm font-medium text-slate-800">Send Now</span>
                        <Switch
                          checked={manualForm.sendNow}
                          onCheckedChange={(checked) => setManualForm((current) => ({ ...current, sendNow: checked }))}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" className={lightButtonClass} onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className={primaryButtonClass}
                    onClick={() => createInvoiceMutation.mutate()}
                    disabled={createInvoiceMutation.isPending || !canCreateManualInvoice}
                  >
                    Create Invoice
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Invoices" value={statistics?.totalInvoices || 0} icon={ReceiptText} />
          <StatCard title="Sent Invoices" value={statistics?.sentInvoices || 0} icon={CheckCircle2} accent="emerald" />
          <StatCard title="Draft Invoices" value={statistics?.draftInvoices || 0} icon={FileText} accent="amber" />
          <StatCard title="Total Amount" value={formatCurrency(statistics?.totalAmount || 0)} icon={FileSpreadsheet} accent="lime" />
        </div>

        <div className={cn('grid gap-6', isAdminMode && 'xl:grid-cols-[minmax(0,1fr)_390px]')}>
          <Card className={panelClass}>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-slate-950">Invoices</CardTitle>
              <Badge variant="outline" className="border-slate-200 text-slate-600">
                {isLoading ? 'Loading' : `${invoices.length} Records`}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <Table className="min-w-[1080px]">
                  <TableHeader>
                    <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-slate-700">Invoice</TableHead>
                      <TableHead className="text-slate-700">Customer</TableHead>
                      <TableHead className="text-slate-700">Type</TableHead>
                      <TableHead className="text-slate-700">Due Date</TableHead>
                      <TableHead className="text-slate-700">Total</TableHead>
                      <TableHead className="text-slate-700">Status</TableHead>
                      <TableHead className="text-slate-700">Mark</TableHead>
                      <TableHead className="text-right text-slate-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length > 0 ? (
                      invoices.map((invoice) => (
                        <TableRow key={invoice.id} className="border-slate-200 text-slate-900 hover:bg-slate-50">
                          <TableCell>
                            <div className="font-semibold">{invoice.invoiceNumber}</div>
                            <div className="text-xs text-slate-500">{formatDate(invoice.issueDate)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{invoice.customerName}</div>
                            <div className="max-w-[210px] truncate text-xs text-slate-500">{invoice.customerEmail}</div>
                          </TableCell>
                          <TableCell className="capitalize">{invoice.type}</TableCell>
                          <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(invoice.total, invoice.currency)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('capitalize', statusBadgeClass(invoice.status))}>
                              {invoice.status.replace(/_/g, ' ')}
                            </Badge>
                            {invoice.paymentMethod && (
                              <div className="mt-1 text-xs text-slate-500">
                                {paymentMethodLabel(invoice.paymentMethod)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {invoice.status === 'paid' ? (
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                PAID
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                                UNPAID
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" variant="outline" size="sm" className={`gap-2 ${lightButtonClass}`} aria-label="Download invoice">
                                    <Download className="h-4 w-4" />
                                    Download
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => void downloadInvoice(invoice, 'pdf')}>
                                    <ReceiptText className="mr-2 h-4 w-4" />
                                    PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => void downloadInvoice(invoice, 'word')}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Word
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => void downloadInvoice(invoice, 'excel')}>
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    Excel
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={`gap-2 ${lightButtonClass}`}
                                onClick={() => printInvoice(invoice)}
                              >
                                <Printer className="h-4 w-4" />
                                Print Invoice
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={`gap-2 ${lightButtonClass}`}
                                onClick={() => sendInvoiceMutation.mutate(invoice.id)}
                                disabled={sendInvoiceMutation.isPending}
                              >
                                <Send className="h-4 w-4" />
                                Send
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={`gap-2 ${lightButtonClass}`}
                                onClick={() => sendReminderMutation.mutate(invoice.id)}
                                disabled={sendReminderMutation.isPending || invoice.status === 'paid'}
                              >
                                <Mail className="h-4 w-4" />
                                Reminder
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-2 border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
                                onClick={() => markPaidMutation.mutate(invoice.id)}
                                disabled={markPaidMutation.isPending || invoice.status === 'paid'}
                              >
                                <BadgeCheck className="h-4 w-4" />
                                Mark Paid
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-slate-500">
                          No invoices created yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {isAdminMode && (
          <div className="space-y-6">
            <Card className={panelClass}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
                  <CalendarClock className="h-5 w-5 text-[#58cbbb]" />
                  Monthly Automation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 p-4">
                  <span className="font-medium">Send Automatically</span>
                  <Switch
                    checked={settingsForm.autoSendMonthly}
                    onCheckedChange={(checked) => setSettingsForm((current) => ({ ...current, autoSendMonthly: checked }))}
                  />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 p-4">
                  <span>
                    <span className="block font-medium">Auto Send Payment Reminders</span>
                    <span className="mt-1 block text-xs text-slate-500">Sends reminders for unpaid invoices near or after due date.</span>
                  </span>
                  <Switch
                    checked={settingsForm.autoSendReminders}
                    onCheckedChange={(checked) => setSettingsForm((current) => ({ ...current, autoSendReminders: checked }))}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Monthly Day</Label>
                    <Input
                      className={darkInputClass}
                      type="number"
                      min="1"
                      max="28"
                      value={settingsForm.sendDay}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, sendDay: Number(event.target.value || 1) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Due Days</Label>
                    <Input
                      className={darkInputClass}
                      type="number"
                      min="1"
                      max="90"
                      value={settingsForm.defaultDueDays}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, defaultDueDays: Number(event.target.value || 14) }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Reminder Days Before Due</Label>
                  <Input
                    className={darkInputClass}
                    type="number"
                    min="0"
                    max="30"
                    value={settingsForm.reminderDaysBeforeDue}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, reminderDaysBeforeDue: Number(event.target.value || 0) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Recipients</Label>
                  <Textarea
                    value={settingsForm.recipients}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, recipients: event.target.value }))}
                    placeholder="billing@example.com, admin@example.com"
                    className={`${darkInputClass} min-h-24`}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700">Payment Options</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethodOptions.map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => togglePaymentMethod(method.value)}
                        className={cn(
                          'rounded-xl border px-3 py-2 text-left text-sm font-semibold transition',
                          settingsForm.paymentMethods.includes(method.value)
                            ? 'border-[#58cbbb] bg-[#58cbbb] text-slate-950'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
                        )}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Wire Transfer Instructions</Label>
                  <Textarea
                    value={settingsForm.wireTransferInstructions}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, wireTransferInstructions: event.target.value }))}
                    placeholder="Bank name, IBAN/account number, SWIFT, and reference instructions"
                    className={`${darkInputClass} min-h-28`}
                  />
                </div>
                <Button
                  type="button"
                  className={`w-full ${primaryButtonClass}`}
                  onClick={() => saveSettingsMutation.mutate()}
                  disabled={saveSettingsMutation.isPending}
                >
                  Save Invoice Settings
                </Button>
                {settingsForm.lastAutoSentPeriod && (
                  <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                    Last automatic invoice: {settingsForm.lastAutoSentPeriod}
                  </div>
                )}
                {settingsForm.lastReminderRunAt && (
                  <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                    Last reminder run: {formatDate(settingsForm.lastReminderRunAt)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={panelClass}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
                  <Mail className="h-5 w-5 text-[#58cbbb]" />
                  Manual Monthly Run
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-slate-700">Invoice Month</Label>
                  <Input
                    className={darkInputClass}
                    type="month"
                    value={monthlyPeriod}
                    onChange={(event) => setMonthlyPeriod(event.target.value)}
                  />
                </div>
                <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 p-4">
                  <span className="font-medium">Send After Generation</span>
                  <Switch checked={sendMonthlyNow} onCheckedChange={setSendMonthlyNow} />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full gap-2 ${lightButtonClass}`}
                  onClick={() => generateMonthlyMutation.mutate()}
                  disabled={generateMonthlyMutation.isPending}
                >
                  <CalendarClock className="h-4 w-4" />
                  Generate Monthly Invoice
                </Button>
              </CardContent>
            </Card>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  accent = 'slate',
}: {
  title: string;
  value: string | number;
  icon: typeof ReceiptText;
  accent?: 'slate' | 'emerald' | 'amber' | 'lime';
}) {
  const accentClass = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    lime: 'bg-[#58cbbb] text-slate-950',
  }[accent];

  return (
    <Card className={panelClass}>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-teal-700">{title}</p>
          <div className="mt-3 text-2xl font-semibold tracking-normal text-slate-950">{value}</div>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-md', accentClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
