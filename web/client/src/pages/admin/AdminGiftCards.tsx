import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Plus,
  Search,
  Gift,
  DollarSign,
  Eye,
  Copy,
  CreditCard,
  Users,
  TrendingUp,
  Send,
} from 'lucide-react';
import type { GiftCard, GiftCardTransaction } from '@shared/schema';
import { useTranslation } from '@/contexts/TranslationContext';

interface GiftCardFormData {
  amount: string;
  currency: string;
  recipientEmail: string;
  recipientName: string;
  message: string;
  theme: string;
  expiresAt: string;
}

const initialFormData: GiftCardFormData = {
  amount: '',
  currency: 'USD',
  recipientEmail: '',
  recipientName: '',
  message: '',
  theme: 'default',
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
};

const themes = [
  { value: 'default', label: 'Default' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'travel', label: 'Travel' },
  { value: 'thank-you', label: 'Thank You' },
  { value: 'celebration', label: 'Celebration' },
];

const presetAmounts = [10, 25, 50, 100, 200];

const lightInputClass =
  'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500';
const lightOutlineButtonClass =
  'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';
const statCardClass = 'rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm';
const primaryButtonClass = 'bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]';

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'GC-';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 3) result += '-';
  }
  return result;
}

export default function AdminGiftCards() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedGiftCard, setSelectedGiftCard] = useState<GiftCard | null>(null);
  const [formData, setFormData] = useState<GiftCardFormData>(initialFormData);
  const [bulkCount, setBulkCount] = useState('10');
  const [bulkAmount, setBulkAmount] = useState('25');
  const {t} = useTranslation();
  const tg = (key: string, fallback: string, params?: Record<string, string | number>) =>
    t(`adminPanel.admin.giftCards.${key}`, fallback, params);

  const { data: giftCardsData, isLoading } = useQuery<{
    giftCards: GiftCard[];
    statistics: {
      totalCards: number;
      activeCards: number;
      totalValue: number;
      redeemedValue: number;
      pendingDelivery: number;
    };
  }>({
    queryKey: ['/api/admin/gift-cards'],
  });

  const { data: transactionsData } = useQuery<{ transactions: GiftCardTransaction[] }>({
    queryKey: ['/api/admin/gift-cards', selectedGiftCard?.id, 'transactions'],
    enabled: !!selectedGiftCard,
  });

  const createMutation = useMutation({
    mutationFn: async (data: GiftCardFormData) => {
      return apiRequest('POST', '/api/admin/gift-cards', {
        code: generateGiftCardCode(),
        amount: parseFloat(data.amount),
        balance: parseFloat(data.amount),
        currency: data.currency,
        recipientEmail: data.recipientEmail || null,
        recipientName: data.recipientName || null,
        message: data.message || null,
        theme: data.theme,
        expiresAt: new Date(data.expiresAt).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/gift-cards'] });
      setIsCreateDialogOpen(false);
      setFormData(initialFormData);
      toast({ title: tg('toast.created', 'Gift card created successfully') });
    },
    onError: (error: Error) => {
      toast({
        title: tg('toast.createError', 'Error creating gift card'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async ({ count, amount }: { count: number; amount: number }) => {
      const res = await apiRequest('POST', '/api/admin/gift-cards/bulk', { count, amount });
      return res.json() as Promise<{ created: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/gift-cards'] });
      setIsBulkDialogOpen(false);
      toast({ title: tg('toast.bulkCreated', '{count} gift cards created successfully', { count: data.created }) });
    },
    onError: (error: Error) => {
      toast({
        title: tg('toast.bulkCreateError', 'Error creating gift cards'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const sendDeliveryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/admin/gift-cards/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/gift-cards'] });
      toast({ title: tg('toast.deliverySent', 'Gift card delivery email sent') });
    },
    onError: (error: Error) => {
      toast({ title: tg('toast.deliveryError', 'Error sending email'), description: error.message, variant: 'destructive' });
    },
  });

  const giftCards = giftCardsData?.giftCards || [];
  const statistics = giftCardsData?.statistics || {
    totalCards: 0,
    activeCards: 0,
    totalValue: 0,
    redeemedValue: 0,
    pendingDelivery: 0,
  };

  const filteredGiftCards = giftCards.filter((card: GiftCard) => {
    const matchesSearch =
      card.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.recipientEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (card.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || card.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: tg('table.copySuccess', 'Code copied to clipboard') });
  };

  const handleView = (card: GiftCard) => {
    setSelectedGiftCard(card);
    setIsViewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{tg('filter.active', 'Active')}</Badge>;
      case 'used':
        return <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">{tg('filter.used', 'Used')}</Badge>;
      case 'expired':
        return <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">{tg('filter.expired', 'Expired')}</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-700">{tg('filter.cancelled', 'Cancelled')}</Badge>;
      default:
        return <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-700">{status}</Badge>;
    }
  };

  const getThemeBadge = (theme: string) => {
    const themeLabel = tg(`themes.${theme}`, themes.find((item) => item.value === theme)?.label || theme);
    return <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">{themeLabel}</Badge>;
  };

  return (
    <div className="space-y-6 p-6 text-slate-900 dark:text-slate-100 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white" data-testid="text-page-title">
            {tg('title', 'Gift Card Management')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{tg('description', 'Create and manage gift cards')}</p>
        </div>


        <div className="flex w-full flex-col items-start gap-2 sm:flex-row md:w-auto md:items-center">
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              {/* 3. Added w-full md:w-auto to buttons for better mobile tap targets */}
              <Button variant="outline" className={`w-full gap-2 md:w-auto ${lightOutlineButtonClass}`} data-testid="button-bulk-create">
                <Users className="h-4 w-4" />
                {tg('bulkDialog.title', 'Bulk Generate Gift Cards')}
              </Button>
            </DialogTrigger>
            <DialogContent className="border-slate-200 bg-white text-slate-950">
              <DialogHeader>
                <DialogTitle className="text-slate-950">{tg('bulkDialog.title', 'Bulk Generate Gift Cards')}</DialogTitle>
                <DialogDescription className="text-slate-500">
                 {tg('bulkDialog.description', 'Create multiple gift cards at once for promotions')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">{tg('bulkDialog.numberOfCards', 'Number of Cards')}</Label>
                  <Input
                    type="number"
                    value={bulkCount}
                    onChange={(e) => setBulkCount(e.target.value)}
                    placeholder="10"
                    className={lightInputClass}
                    data-testid="input-bulk-count"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">{tg('bulkDialog.amountPerCard', 'Amount per Card ($)')}</Label>
                  <Input
                    type="number"
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    placeholder="25"
                    className={lightInputClass}
                    data-testid="input-bulk-amount"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  className={primaryButtonClass}
                  onClick={() =>
                    bulkCreateMutation.mutate({
                      count: parseInt(bulkCount),
                      amount: parseFloat(bulkAmount),
                    })
                  }
                  disabled={bulkCreateMutation.isPending || !bulkCount || !bulkAmount}
                  data-testid="button-submit-bulk"
                >
                  {bulkCreateMutation.isPending
                    ? tg('bulkDialog.generating', 'Generating...')
                    : tg('bulkDialog.generateButton', 'Generate {count} Cards', { count: bulkCount })}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className={`w-full gap-2 md:w-auto ${primaryButtonClass}`} data-testid="button-create-gift-card">
                <Plus className="h-4 w-4" />
                {tg('createDialog.createButton', 'Create Gift Card')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg border-slate-200 bg-white text-slate-950">
              <DialogHeader>
                <DialogTitle className="text-slate-950">{tg('createDialog.title', 'Create Gift Card')}</DialogTitle>
                <DialogDescription className="text-slate-500">
                  {tg('createDialog.description', 'Create a new gift card for a customer or promotion')}
                </DialogDescription>
              </DialogHeader>
              <GiftCardForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={() => createMutation.mutate(formData)}
                isSubmitting={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-[#168b80]">{tg('cards.total', 'Total Cards')}</CardTitle>
            <CreditCard className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950" data-testid="text-total-cards">
              {statistics.totalCards}
            </div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">{tg('cards.active', 'Active Cards')}</CardTitle>
            <Gift className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-emerald-700" data-testid="text-active-cards">
              {statistics.activeCards}
            </div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-teal-700">{tg('cards.totalValue', 'Total Value')}</CardTitle>
            <DollarSign className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950" data-testid="text-total-value">
              ${statistics.totalValue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-cyan-700">{tg('cards.redeemed', 'Redeemed')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950" data-testid="text-redeemed-value">
              ${statistics.redeemedValue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">{tg('cards.pendingDelivery', 'Pending Delivery')}</CardTitle>
            <Send className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-orange-700" data-testid="text-pending-delivery">
              {statistics.pendingDelivery}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-950">{tg('list.title', 'Gift Cards')}</CardTitle>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
               placeholder={tg('search.placeholder', 'Search by code, email, or name...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 ${lightInputClass}`}
                data-testid="input-search-gift-cards"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={`w-[140px] ${lightInputClass}`} data-testid="select-status-filter">
                <SelectValue placeholder={tg('filter.status', 'Status')} />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-900">
                <SelectItem value="all">{tg('filter.all', 'All Status')}</SelectItem>
                <SelectItem value="active">{tg('filter.active', 'Active')}</SelectItem>
                <SelectItem value="used">{tg('filter.used', 'Used')}</SelectItem>
                <SelectItem value="expired">{tg('filter.expired', 'Expired')}</SelectItem>
                <SelectItem value="cancelled">{tg('filter.cancelled', 'Cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-slate-500">{tg('list.loading', 'Loading gift cards...')}</div>
          ) : filteredGiftCards.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center py-8 text-center text-slate-500">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Gift className="h-8 w-8 text-slate-400" />
              </div>
              <p className="font-medium text-slate-950">{tg('list.empty', 'No gift cards found')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-4 py-3 font-semibold text-slate-700">{tg('table.code', 'Code')}</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">{tg('table.amountBalance', 'Amount / Balance')}</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">{tg('table.recipient', 'Recipient')}</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">{tg('table.theme', 'Theme')}</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">{tg('table.expires', 'Expires')}</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">{tg('table.status', 'Status')}</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">{tg('table.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGiftCards.map((card: GiftCard, index: number) => (
                    <tr key={card.id} className="border-b border-slate-200 hover:bg-slate-50" data-testid={`row-gift-card-${index}`}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700">
                            {card.code}
                          </code>
                          <Button
                            size="icon"
                            variant="outline"
                            className={lightOutlineButtonClass}
                            onClick={() => handleCopyCode(card.code)}
                            data-testid={`button-copy-${index}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <span className="font-semibold text-slate-950">${card.balance}</span>
                          <span className="text-slate-500"> / ${card.amount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {card.recipientEmail ? (
                          <div className="text-sm">
                            <div className="font-medium text-slate-950">{card.recipientName || tg('common.notAvailable', 'N/A')}</div>
                            <div className="text-slate-500">{card.recipientEmail}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500">{tg('table.notAssigned', 'Not assigned')}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">{getThemeBadge(card.theme || 'default')}</td>
                      <td className="px-4 py-4 font-medium text-slate-800">
                        {card.expiresAt ? format(new Date(card.expiresAt), 'MMM d, yyyy') : tg('common.never', 'Never')}
                      </td>
                      <td className="px-4 py-4">{getStatusBadge(card.status)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className={lightOutlineButtonClass}
                            onClick={() => handleView(card)}
                            data-testid={`button-view-${index}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {card.recipientEmail && !card.deliverySent && (
                            <Button
                              size="icon"
                              variant="outline"
                              className={lightOutlineButtonClass}
                              onClick={() => sendDeliveryMutation.mutate(card.id)}
                              disabled={sendDeliveryMutation.isPending}
                              title={tg('table.sendDelivery', 'Send delivery email')}
                              data-testid={`button-send-${index}`}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl border-slate-200 bg-white text-slate-950">
          <DialogHeader>
            <DialogTitle className="text-slate-950">{tg('viewDialog.title', 'Gift Card Details')}</DialogTitle>
          </DialogHeader>
          {selectedGiftCard && (
            <Tabs defaultValue="details">
              <TabsList className="bg-slate-100 text-slate-600">
                <TabsTrigger value="details">{tg('viewDialog.tabs.details', 'Details')}</TabsTrigger>
                <TabsTrigger value="transactions">{tg('viewDialog.tabs.transactions', 'Transactions')}</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">{tg('table.code', 'Code')}</Label>
                    <p className="font-mono">{selectedGiftCard.code}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">{tg('viewDialog.label.status', 'Status')}</Label>
                    <p>{getStatusBadge(selectedGiftCard.status)}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">{tg('viewDialog.label.originalAmount', 'Original Amount')}</Label>
                    <p>${selectedGiftCard.amount}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">{tg('viewDialog.label.currentBalance', 'Current Balance')}</Label>
                    <p className="font-semibold text-emerald-700">${selectedGiftCard.balance}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">{tg('viewDialog.label.recipient', 'Recipient')}</Label>
                    <p>{selectedGiftCard.recipientName || tg('common.notAvailable', 'N/A')}</p>
                    <p className="text-sm text-slate-500">
                      {selectedGiftCard.recipientEmail || tg('table.notAssigned', 'Not assigned')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-slate-500">{tg('viewDialog.label.theme', 'Theme')}</Label>
                    <p>{getThemeBadge(selectedGiftCard.theme || 'default')}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">{tg('viewDialog.label.created', 'Created')}</Label>
                    <p>{format(new Date(selectedGiftCard.createdAt), 'PPP')}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">{tg('viewDialog.label.expires', 'Expires')}</Label>
                    <p>
                      {selectedGiftCard.expiresAt
                        ? format(new Date(selectedGiftCard.expiresAt), 'PPP')
                        : tg('common.never', 'Never')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-slate-500">{tg('viewDialog.label.deliveryStatus', 'Delivery Status')}</Label>
                    <p>{selectedGiftCard.deliverySent ? tg('delivery.sent', 'Sent') : tg('delivery.pending', 'Pending')}</p>
                  </div>
                  {selectedGiftCard.redeemedAt && (
                    <div>
                      <Label className="text-slate-500">{tg('viewDialog.label.firstRedeemed', 'First Redeemed')}</Label>
                      <p>{format(new Date(selectedGiftCard.redeemedAt), 'PPP')}</p>
                    </div>
                  )}
                </div>
                {selectedGiftCard.message && (
                  <div>
                    <Label className="text-slate-500">{tg('viewDialog.label.personalMessage', 'Personal Message')}</Label>
                    <p className="rounded-md bg-slate-100 p-3 italic text-slate-700">"{selectedGiftCard.message}"</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="transactions" className="mt-4">
                {transactionsData?.transactions && transactionsData.transactions.length > 0 ? (
                  <div className="space-y-2">
                    {transactionsData.transactions.map((tx: GiftCardTransaction) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between rounded-md bg-slate-50 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">{tg('viewDialog.orderNumber', 'Order #{id}', { id: tx.orderId?.slice(0, 8) || '-' })}</p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(tx.usedAt), 'PPP p')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-red-500">
                            -${tx.amountUsed}
                          </Badge>
                          <p className="mt-1 text-xs text-slate-500">
                            {tg('viewDialog.balanceAfter', 'Balance: {amount}', { amount: `$${tx.balanceAfter}` })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-slate-500">{tg('viewDialog.noTransactions', 'No transactions yet')}</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GiftCardForm({
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
}: {
  formData: GiftCardFormData;
  setFormData: (data: GiftCardFormData) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation();
  const tg = (key: string, fallback: string, params?: Record<string, string | number>) =>
    t(`adminPanel.admin.giftCards.${key}`, fallback, params);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-slate-700">{tg('createDialog.amount', 'Amount ($)')}</Label>
        <div className="flex gap-2 flex-wrap">
          {presetAmounts.map((amount) => (
            <Button
              key={amount}
              type="button"
              variant={formData.amount === amount.toString() ? 'default' : 'outline'}
              className={
                formData.amount === amount.toString()
                  ? primaryButtonClass
                  : lightOutlineButtonClass
              }
              size="sm"
              onClick={() => setFormData({ ...formData, amount: amount.toString() })}
              data-testid={`button-amount-${amount}`}
            >
              ${amount}
            </Button>
          ))}
        </div>
        <Input
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          placeholder={tg('createDialog.customAmount', 'Custom amount')}
          className={lightInputClass}
          data-testid="input-custom-amount"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-700">{tg('createDialog.theme', 'Theme')}</Label>
        <Select
          value={formData.theme}
          onValueChange={(value) => setFormData({ ...formData, theme: value })}
        >
          <SelectTrigger className={lightInputClass} data-testid="select-theme">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-slate-200 bg-white text-slate-900">
            {themes.map((theme) => (
              <SelectItem key={theme.value} value={theme.value}>
                {tg(`themes.${theme.value}`, theme.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-700">{tg('createDialog.recipientName', 'Recipient Name (optional)')}</Label>
          <Input
            value={formData.recipientName}
            onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
            placeholder="John Doe"
            className={lightInputClass}
            data-testid="input-recipient-name"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700">{tg('createDialog.recipientEmail', 'Recipient Email (optional)')}</Label>
          <Input
            type="email"
            value={formData.recipientEmail}
            onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
            placeholder="john@example.com"
            className={lightInputClass}
            data-testid="input-recipient-email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-700">{tg('createDialog.personalMessage', 'Personal Message (optional)')}</Label>
        <Textarea
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder={tg('createDialog.messagePlaceholder', 'Enjoy your eSIM gift card!')}
          className={lightInputClass}
          data-testid="input-message"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-700">{tg('createDialog.expiresOn', 'Expires On')}</Label>
        <Input
          type="date"
          value={formData.expiresAt}
          onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
          className={lightInputClass}
          data-testid="input-expires-at"
        />
      </div>

      <DialogFooter>
        <Button
          className={primaryButtonClass}
          onClick={onSubmit}
          disabled={isSubmitting || !formData.amount}
          data-testid="button-submit-gift-card"
        >
          {isSubmitting ? tg('createDialog.creating', 'Creating...')
            : tg('createDialog.createButton', 'Create Gift Card')}
        </Button>
      </DialogFooter>
    </div>
  );
}
