import { useState } from 'react';
import type React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import {
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  Landmark,
  Printer,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/lib/documentExport';

type InvoicePaymentMethod = 'credit_card' | 'voucher' | 'paypal' | 'crypto' | 'wire_transfer';

type InvoiceView = {
  invoice: {
    id: string;
    invoiceNumber: string;
    status: 'draft' | 'sent' | 'payment_pending' | 'paid';
    customerName: string;
    customerEmail: string;
    issueDate: string;
    dueDate: string;
    currency: string;
    subtotal: number;
    tax: number;
    total: number;
    notes?: string;
    paymentMethods: InvoicePaymentMethod[];
    wireTransferInstructions?: string;
    paymentMethod?: InvoicePaymentMethod | 'manual';
    lineItems: Array<{
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
  };
  branding: {
    platformName: string;
    issuerName: string;
    logoUrl?: string;
    paymentUrl: string;
  };
};

const methodMeta: Record<InvoicePaymentMethod, { label: string; icon: typeof CreditCard; note: string }> = {
  credit_card: { label: 'Credit Card', icon: CreditCard, note: 'Pay securely using a card gateway.' },
  voucher: { label: 'Voucher', icon: BadgeDollarSign, note: 'Redeem a voucher code for this invoice.' },
  paypal: { label: 'PayPal', icon: WalletCards, note: 'Use your PayPal account.' },
  crypto: { label: 'Crypto', icon: ShieldCheck, note: 'Pay using supported crypto gateways.' },
  wire_transfer: { label: 'Wire Transfer', icon: Landmark, note: 'Send a transfer and share the reference.' },
};

function formatCurrency(value: number | undefined, currency = 'USD') {
  const safeCurrency = /^[A-Z]{3}$/.test(currency || '') ? currency : 'USD';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: safeCurrency }).format(Number(value || 0));
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function paymentMethodLabel(method: InvoicePaymentMethod) {
  return methodMeta[method]?.label || method;
}

async function fetchInvoice(id: string) {
  const response = await fetch(`/api/invoices/${id}`, { credentials: 'include' });
  if (!response.ok) throw new Error('Invoice not found');
  const json = await response.json();
  return json.data as InvoiceView;
}

async function responseData<T>(response: Response): Promise<T> {
  const json = await response.json();
  return json.data || json;
}

export default function InvoicePayment() {
  const [, params] = useRoute('/invoice/:id');
  const invoiceId = params?.id || '';
  const { toast } = useToast();
  const [voucherCode, setVoucherCode] = useState('');
  const [wireReference, setWireReference] = useState('');
  const [wireNotes, setWireNotes] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<InvoicePaymentMethod | null>(null);

  const { data, isLoading, isError } = useQuery<InvoiceView>({
    queryKey: ['/api/invoices', invoiceId],
    queryFn: () => fetchInvoice(invoiceId),
    enabled: Boolean(invoiceId),
  });

  const voucherMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/invoices/${invoiceId}/pay/voucher`, { code: voucherCode });
      return responseData(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId] });
      toast({ title: 'Invoice paid by voucher' });
    },
    onError: (error: Error) => {
      toast({ title: 'Voucher payment failed', description: error.message, variant: 'destructive' });
    },
  });

  const paymentRequestMutation = useMutation({
    mutationFn: async (method: Exclude<InvoicePaymentMethod, 'voucher'>) => {
      const response = await apiRequest('POST', `/api/invoices/${invoiceId}/pay/${method}`, {
        reference: method === 'wire_transfer' ? wireReference : undefined,
        notes: method === 'wire_transfer' ? wireNotes : `Requested ${methodMeta[method].label} payment`,
      });
      return responseData(response);
    },
    onSuccess: (_data, method) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId] });
      toast({
        title: method === 'wire_transfer' ? 'Wire transfer submitted' : `${methodMeta[method].label} payment request recorded`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Payment request failed', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">Loading invoice...</div>;
  }

  if (isError || !data) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">Invoice not found.</div>;
  }

  const { invoice, branding } = data;
  const isPaid = invoice.status === 'paid';
  const methods = invoice.paymentMethods || [];
  const buildPrintableInvoiceHtml = () => {
    const logoUrl = toAbsoluteAssetUrl(branding.logoUrl);

    return buildDocumentHtml({
      title: `Invoice ${invoice.invoiceNumber}`,
      subtitle: `${branding.issuerName} - ${invoice.customerName} - ${formatDate(invoice.issueDate)}`,
      sections: [
        {
          html: `
            <div style="padding:14px;border-radius:14px;background:#0f172a;color:#fff;">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(branding.issuerName)} logo" style="max-height:48px;max-width:130px;background:#fff;border-radius:10px;padding:6px;object-fit:contain;" />` : ''}
              <h2 style="margin:12px 0 5px;font-size:17px;">${escapeHtml(branding.issuerName)} Invoice</h2>
              <p style="color:#cbd5e1;font-size:12px;">Status: ${escapeHtml(invoice.status.replace(/_/g, ' '))}</p>
            </div>
          `,
        },
        {
          title: 'Invoice Details',
          html: rowsToHtmlTable([
            ['Field', 'Value'],
            ['Customer', invoice.customerName],
            ['Email', invoice.customerEmail],
            ['Issue Date', formatDate(invoice.issueDate)],
            ['Due Date', formatDate(invoice.dueDate)],
            ['Payment Options', methods.map(paymentMethodLabel).join(', ') || 'Not selected'],
            ['Total', formatCurrency(invoice.total, invoice.currency)],
          ]),
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

  const downloadInvoice = async () => {
    try {
      const response = await apiRequest('GET', `/api/invoices/${invoice.id}/download/pdf`);
      await downloadResponseFile(response, `invoice-${invoice.invoiceNumber}.pdf`);
      toast({ title: 'Invoice downloaded' });
    } catch (error: any) {
      toast({
        title: 'Failed to download invoice',
        description: error.message || 'Could not create the invoice file',
        variant: 'destructive',
      });
    }
  };

  const printInvoice = () => {
    const printed = printHtmlDocument(buildPrintableInvoiceHtml());
    if (!printed) {
      toast({
        title: 'Unable to open print window',
        description: 'Please allow popups for this site and try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#e9f8ee,#edf5ff)] p-4 text-slate-950 dark:bg-[linear-gradient(135deg,#020617,#0f172a)] dark:text-white sm:p-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-2xl shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
          <div className="bg-slate-950 p-7 text-white">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt={`${branding.issuerName} logo`} className="h-14 max-w-[170px] rounded-2xl bg-white object-contain p-2" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-300 text-xl font-black text-slate-950">
                    {branding.issuerName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold tracking-normal">{branding.issuerName}</h1>
                  <p className="text-sm text-slate-300">Powered by {branding.platformName}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  onClick={() => void downloadInvoice()}
                >
                  <Download className="h-4 w-4" />
                  Download Invoice
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  onClick={printInvoice}
                >
                  <Printer className="h-4 w-4" />
                  Print Invoice
                </Button>
                <span className={cn('w-fit rounded-lg px-4 py-2 text-sm font-bold capitalize', isPaid ? 'bg-emerald-300 text-slate-950' : 'bg-lime-300 text-slate-950')}>
                  {invoice.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <div className="mt-8">
              <p className="text-sm uppercase tracking-[0.16em] text-slate-400">Invoice</p>
              <div className="mt-2 text-4xl font-black tracking-normal">{invoice.invoiceNumber}</div>
            </div>
          </div>

          <div className="p-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoBox title="Bill To" lines={[invoice.customerName, invoice.customerEmail]} />
              <InfoBox title="Invoice Dates" lines={[`Issued ${formatDate(invoice.issueDate)}`, `Due ${formatDate(invoice.dueDate)}`]} />
            </div>

            <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  <tr>
                    <th className="p-4">Description</th>
                    <th className="p-4">Qty</th>
                    <th className="p-4">Unit</th>
                    <th className="p-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-4 font-medium">{item.description}</td>
                      <td className="p-4">{item.quantity}</td>
                      <td className="p-4">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                      <td className="p-4 text-right font-semibold">{formatCurrency(item.amount, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto mt-6 w-full max-w-sm space-y-3 rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
              <TotalRow label="Subtotal" value={formatCurrency(invoice.subtotal, invoice.currency)} />
              <TotalRow label="Tax" value={formatCurrency(invoice.tax, invoice.currency)} />
              <div className="flex justify-between border-t border-slate-200 pt-4 text-xl font-black dark:border-slate-800">
                <span>Total</span>
                <span>{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-xl shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-slate-950">
                <ReceiptText className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Pay Now</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Choose an available payment option.</p>
              </div>
            </div>

            {isPaid ? (
              <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                <CheckCircle2 className="mb-3 h-6 w-6" />
                This invoice is already paid.
              </div>
            ) : (
              <div className="mt-6 grid gap-3">
                {methods.map((method) => {
                  const MetaIcon = methodMeta[method].icon;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedMethod(method)}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border p-4 text-left transition',
                        selectedMethod === method
                          ? 'border-lime-300 bg-lime-50 dark:bg-lime-400/10'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800',
                      )}
                    >
                      <MetaIcon className="h-5 w-5 text-lime-600 dark:text-lime-300" />
                      <div>
                        <div className="font-semibold">{methodMeta[method].label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{methodMeta[method].note}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {!isPaid && selectedMethod === 'voucher' && (
            <PaymentPanel title="Redeem Voucher">
              <Input value={voucherCode} onChange={(event) => setVoucherCode(event.target.value)} placeholder="Enter voucher code" />
              <Button className="w-full bg-lime-300 text-slate-950 hover:bg-lime-200" onClick={() => voucherMutation.mutate()} disabled={voucherMutation.isPending}>
                Pay With Voucher
              </Button>
            </PaymentPanel>
          )}

          {!isPaid && selectedMethod === 'wire_transfer' && (
            <PaymentPanel title="Wire Transfer">
              {invoice.wireTransferInstructions && (
                <div className="whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  {invoice.wireTransferInstructions}
                </div>
              )}
              <Input value={wireReference} onChange={(event) => setWireReference(event.target.value)} placeholder="Transfer reference" />
              <Textarea value={wireNotes} onChange={(event) => setWireNotes(event.target.value)} placeholder="Optional notes" />
              <Button className="w-full bg-lime-300 text-slate-950 hover:bg-lime-200" onClick={() => paymentRequestMutation.mutate('wire_transfer')} disabled={paymentRequestMutation.isPending}>
                Submit Wire Transfer
              </Button>
            </PaymentPanel>
          )}

          {!isPaid && selectedMethod && !['voucher', 'wire_transfer'].includes(selectedMethod) && (
            <PaymentPanel title={methodMeta[selectedMethod].label}>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                This records your invoice payment request for {methodMeta[selectedMethod].label}. The gateway can be connected to live capture from the same payment method setup.
              </div>
              <Button className="w-full bg-lime-300 text-slate-950 hover:bg-lime-200" onClick={() => paymentRequestMutation.mutate(selectedMethod as Exclude<InvoicePaymentMethod, 'voucher'>)} disabled={paymentRequestMutation.isPending}>
                Continue With {methodMeta[selectedMethod].label}
              </Button>
            </PaymentPanel>
          )}
        </aside>
      </div>
    </div>
  );
}

function InfoBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        <Building2 className="h-4 w-4" />
        {title}
      </div>
      {lines.map((line) => (
        <div key={line} className="font-semibold">{line}</div>
      ))}
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PaymentPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-[28px] border border-white/80 bg-white p-6 shadow-xl shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
      <h3 className="text-lg font-bold">{title}</h3>
      {children}
    </section>
  );
}
