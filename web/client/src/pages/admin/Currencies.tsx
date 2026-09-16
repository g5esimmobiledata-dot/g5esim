import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Check, X, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { CurrencyRate } from '@shared/schema';
import { useTranslation } from '@/contexts/TranslationContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_CURRENCIES } from '@/lib/currencyData';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Currencies() {
  const { t, isRTL } = useTranslation();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [openSelector, setOpenSelector] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyRate | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    conversionRate: '1.000000',
  });

  const { data: currencies, isLoading } = useQuery<CurrencyRate[]>({
    queryKey: ['/api/admin/currencies'],
  });

  const addCurrencyMutation = useMutation({
    mutationFn: async (currency: Partial<CurrencyRate>) => {
      const payload = {
        ...currency,
        conversionRate: Number(currency.conversionRate),
      };
      return await apiRequest('POST', '/api/admin/currencies', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/currencies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/currencies'] });
      resetForm();
      setShowAddDialog(false);
      toast({
        title: t('adminPanel.admin.currencies.success', 'Success'),
        description: t('adminPanel.admin.currencies.addSuccess', 'Currency added successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('adminPanel.admin.currencies.error', 'Error'),
        description: error.message || t('adminPanel.admin.currencies.addFailed', 'Failed to add currency'),
        variant: 'destructive',
      });
    },
  });

  const updateCurrencyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CurrencyRate> }) => {
      return await apiRequest('PUT', `/api/admin/currencies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/currencies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/currencies'] });
      resetForm();
      setEditingCurrency(null);
      toast({
        title: t('adminPanel.admin.currencies.success', 'Success'),
        description: t('adminPanel.admin.currencies.updateSuccess', 'Currency updated successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('adminPanel.admin.currencies.error', 'Error'),
        description: error.message || t('adminPanel.admin.currencies.updateFailed', 'Failed to update currency'),
        variant: 'destructive',
      });
    },
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/currencies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/currencies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/currencies'] });
      toast({
        title: t('adminPanel.admin.currencies.success', 'Success'),
        description: t('adminPanel.admin.currencies.deleteSuccess', 'Currency deleted successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('adminPanel.admin.currencies.error', 'Error'),
        description: error.message || t('adminPanel.admin.currencies.deleteFailed', 'Failed to delete currency'),
        variant: 'destructive',
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('PUT', `/api/admin/currencies/${id}`, { isDefault: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/currencies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/currencies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({
        title: t('adminPanel.admin.currencies.success', 'Success'),
        description: t('adminPanel.admin.currencies.defaultUpdated', 'Default currency updated'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('adminPanel.admin.currencies.error', 'Error'),
        description: error.message || t('adminPanel.admin.currencies.defaultFailed', 'Failed to set default currency'),
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      symbol: '',
      conversionRate: '1.000000',
    });
  };

  const handleCurrencySelect = (code: string) => {
    const currency = ALL_CURRENCIES.find((c) => c.code === code);
    if (currency) {
      setFormData({
        ...formData,
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
      });
    }
  };

  const handleAddCurrency = () => {
    if (!formData.code || !formData.name || !formData.symbol) {
      toast({
        title: t('adminPanel.admin.currencies.validationError', 'Validation Error'),
        description: t('adminPanel.admin.currencies.requiredFields', 'Please fill in all required fields'),
        variant: 'destructive',
      });
      return;
    }
    const rate = parseFloat(formData.conversionRate);
    if (isNaN(rate) || rate <= 0) {
      toast({
        title: t('adminPanel.admin.currencies.validationError', 'Validation Error'),
        description: t('adminPanel.admin.currencies.rateValidation', 'Conversion rate must be a positive number'),
        variant: 'destructive',
      });
      return;
    }
    addCurrencyMutation.mutate({
      ...formData,
      conversionRate: rate.toString(),
    });
  };

  const handleUpdateCurrency = () => {
    if (!editingCurrency) return;
    const rate = parseFloat(formData.conversionRate);
    if (isNaN(rate) || rate <= 0) {
      toast({
        title: t('adminPanel.admin.currencies.validationError', 'Validation Error'),
        description: t('adminPanel.admin.currencies.rateValidation', 'Conversion rate must be a positive number'),
        variant: 'destructive',
      });
      return;
    }
    updateCurrencyMutation.mutate({
      id: editingCurrency.id,
      data: {
        code: formData.code,
        name: formData.name,
        symbol: formData.symbol,
        conversionRate: rate.toString(),
      },
    });
  };

  const openEditDialog = (currency: CurrencyRate) => {
    setEditingCurrency(currency);
    setFormData({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      conversionRate: currency.conversionRate?.toString() || '1.000000',
    });
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={cn('admin-light-surface space-y-6 p-6 lg:p-8', isRTL ? 'text-right' : 'text-left')}
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 px-2 sm:px-0">
        <div className={cn('text-center', isRTL ? 'sm:text-right' : 'sm:text-left')}>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {t('adminPanel.admin.currencies.title', 'Currency Management')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base max-w-[280px] sm:max-w-none mx-auto">
            {t(
              'adminPanel.admin.currencies.description',
              'Manage currencies and conversion rates for your platform',
            )}
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setShowAddDialog(true);
          }}
          className="h-11 w-full gap-2 bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200 sm:h-10 sm:w-auto"
          data-testid="button-add-currency"
        >
          <Plus className="h-4 w-4" />
          {t('adminPanel.admin.currencies.add', 'Add Currency')}
        </Button>
      </div>

      <Card>
        <CardHeader className={cn('p-4 text-center sm:p-6', isRTL ? 'sm:text-right' : 'sm:text-left')}>
          <CardTitle className={cn('flex items-center justify-center gap-2 text-xl font-bold sm:text-2xl', isRTL ? 'sm:justify-end' : 'sm:justify-start')}>
            <DollarSign className="h-5 w-5 text-primary" />
            {t('adminPanel.admin.currencies.listTitle', 'Currencies')}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base mt-1.5 leading-relaxed max-w-[300px] sm:max-w-none mx-auto">
            {t(
              'adminPanel.admin.currencies.listDescription',
              'All prices are stored in USD. Conversion rates are multipliers from USD to target currency.',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !currencies || currencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t(
                'adminPanel.admin.currencies.empty',
                'No currencies configured. Add your first currency to get started.',
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('adminPanel.admin.currencies.symbol', 'Symbol')}</TableHead>
                  <TableHead>{t('adminPanel.admin.currencies.code', 'Code')}</TableHead>
                  <TableHead>{t('adminPanel.admin.currencies.name', 'Name')}</TableHead>
                  <TableHead>{t('adminPanel.admin.currencies.rate', 'Conversion Rate')}</TableHead>
                  <TableHead>{t('adminPanel.admin.currencies.status', 'Status')}</TableHead>
                  <TableHead>{t('adminPanel.admin.currencies.default', 'Default')}</TableHead>
                  <TableHead className={isRTL ? 'text-left' : 'text-right'}>
                    {t('adminPanel.admin.currencies.actions', 'Actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies.map((currency) => (
                  <TableRow key={currency.id} data-testid={`currency-row-${currency.code}`}>
                    <TableCell className="text-2xl font-mono">{currency.symbol}</TableCell>
                    <TableCell className="font-semibold">{currency.code}</TableCell>
                    <TableCell>{currency.name}</TableCell>
                    <TableCell className="font-mono">
                      {t('adminPanel.admin.currencies.usdRateFormat', '1 USD = {rate} {code}', {
                        rate: currency.conversionRate || '1',
                        code: currency.code,
                      })}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={currency.isEnabled}
                        onCheckedChange={(checked) =>
                          updateCurrencyMutation.mutate({
                            id: currency.id,
                            data: { isEnabled: checked },
                          })
                        }
                        data-testid={`switch-enabled-${currency.code}`}
                        className="h-5 w-9 data-[state=checked]:bg-emerald-800 data-[state=unchecked]:bg-red-600 dark:data-[state=checked]:bg-emerald-700 dark:data-[state=unchecked]:bg-red-600 [&>span]:h-4 [&>span]:w-4 [&>span[data-state=checked]]:translate-x-4"
                      />
                    </TableCell>
                    <TableCell>
                      {currency.isDefault ? (
                        <Badge className="rounded-md bg-lime-300 text-slate-950 hover:bg-lime-300">
                          {t('adminPanel.admin.currencies.default', 'Default')}
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate(currency.id)}
                          disabled={setDefaultMutation.isPending}
                          data-testid={`button-set-default-${currency.code}`}
                        >
                          {t('adminPanel.admin.currencies.setDefault', 'Set Default')}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className={isRTL ? 'text-left' : 'text-right'}>
                      <div className={cn('flex gap-2', isRTL ? 'justify-start' : 'justify-end')}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(currency)}
                          data-testid={`button-edit-${currency.code}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {!currency.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCurrencyMutation.mutate(currency.id)}
                            disabled={deleteCurrencyMutation.isPending}
                            data-testid={`button-delete-${currency.code}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('adminPanel.admin.currencies.addTitle', 'Add New Currency')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'adminPanel.admin.currencies.addDescription',
                'Add a new currency with its conversion rate from USD.',
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {t('adminPanel.admin.currencies.selectCurrency', 'Select World Currency')}
              </Label>
              <Popover open={openSelector} onOpenChange={setOpenSelector}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSelector}
                    className="w-full justify-between"
                  >
                    {formData.code
                      ? ALL_CURRENCIES.find((c) => c.code === formData.code)?.name ||
                        t('adminPanel.admin.currencies.select', 'Select currency...')
                      : t('adminPanel.admin.currencies.select', 'Select currency...')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder={t('adminPanel.admin.currencies.search', 'Search currency...')} />
                    <CommandList>
                      <CommandEmpty>{t('adminPanel.admin.currencies.notFound', 'No currency found.')}</CommandEmpty>
                      <CommandGroup>
                        {ALL_CURRENCIES.map((currency) => (
                          <CommandItem
                            key={currency.code}
                            value={`${currency.code} ${currency.name}`}
                            onSelect={() => {
                              handleCurrencySelect(currency.code);
                              setOpenSelector(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                formData.code === currency.code ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            {currency.code} - {currency.name} ({currency.symbol})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                {t(
                  'adminPanel.admin.currencies.autoFill',
                  'Selecting a currency will auto-fill the code, symbol, and name.',
                )}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">
                  {t('adminPanel.admin.currencies.code', 'Currency Code')}
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder={t('adminPanel.admin.currencies.codePlaceholder', 'USD')}
                  maxLength={3}
                  data-testid="input-currency-code"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="symbol">{t('adminPanel.admin.currencies.symbol', 'Symbol')}</Label>
                <Input
                  id="symbol"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  placeholder={t('adminPanel.admin.currencies.symbolPlaceholder', '$')}
                  maxLength={5}
                  data-testid="input-currency-symbol"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t('adminPanel.admin.currencies.name', 'Currency Name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('adminPanel.admin.currencies.namePlaceholder', 'US Dollar')}
                data-testid="input-currency-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">
                {t('adminPanel.admin.currencies.rate', 'Conversion Rate (from USD)')}
              </Label>
              <Input
                id="rate"
                type="number"
                step="0.000001"
                value={formData.conversionRate}
                onChange={(e) => setFormData({ ...formData, conversionRate: e.target.value })}
                placeholder={t('adminPanel.admin.currencies.ratePlaceholder', '1.000000')}
                data-testid="input-currency-rate"
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  'adminPanel.admin.currencies.rateHelp',
                  'Enter how many units of this currency equals 1 USD',
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('adminPanel.admin.currencies.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleAddCurrency}
              disabled={addCurrencyMutation.isPending}
              data-testid="button-save-currency"
            >
              {addCurrencyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('adminPanel.admin.currencies.adding', 'Adding...')}
                </>
              ) : (
                t('adminPanel.admin.currencies.add', 'Add Currency')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCurrency} onOpenChange={(open) => !open && setEditingCurrency(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('adminPanel.admin.currencies.update', 'Update Currency')}</DialogTitle>
            <DialogDescription>
              {t(
                'adminPanel.admin.currencies.updateDescription',
                'Update currency details and conversion rate.',
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {t('adminPanel.admin.currencies.selectCurrency', 'Select World Currency')}
              </Label>
              <Popover open={openSelector} onOpenChange={setOpenSelector}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSelector}
                    className="w-full justify-between"
                  >
                    {formData.code
                      ? ALL_CURRENCIES.find((c) => c.code === formData.code)?.name ||
                        t('adminPanel.admin.currencies.select', 'Select currency...')
                      : t('adminPanel.admin.currencies.select', 'Select currency...')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput
                      placeholder={t('adminPanel.admin.currencies.search', 'Search currency...')}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {t('adminPanel.admin.currencies.notFound', 'No currency found.')}
                      </CommandEmpty>
                      <CommandGroup>
                        {ALL_CURRENCIES.map((currency) => (
                          <CommandItem
                            key={currency.code}
                            value={`${currency.code} ${currency.name}`}
                            onSelect={() => {
                              handleCurrencySelect(currency.code);
                              setOpenSelector(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                formData.code === currency.code ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            {currency.code} - {currency.name} ({currency.symbol})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                {t(
                  'adminPanel.admin.currencies.autoFill',
                  'Selecting a currency will auto-fill the code, symbol, and name.',
                )}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">
                  {t('adminPanel.admin.currencies.code', 'Currency Code')}
                </Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder={t('adminPanel.admin.currencies.codePlaceholder', 'USD')}
                  maxLength={3}
                  data-testid="input-edit-currency-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-symbol">
                  {t('adminPanel.admin.currencies.symbol', 'Symbol')}
                </Label>
                <Input
                  id="edit-symbol"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  placeholder={t('adminPanel.admin.currencies.symbolPlaceholder', '$')}
                  maxLength={5}
                  data-testid="input-edit-currency-symbol"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                {t('adminPanel.admin.currencies.name', 'Currency Name')}
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('adminPanel.admin.currencies.namePlaceholder', 'US Dollar')}
                data-testid="input-edit-currency-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rate">
                {t('adminPanel.admin.currencies.rate', 'Conversion Rate (from USD)')}
              </Label>
              <Input
                id="edit-rate"
                type="number"
                step="0.000001"
                value={formData.conversionRate}
                onChange={(e) => setFormData({ ...formData, conversionRate: e.target.value })}
                placeholder={t('adminPanel.admin.currencies.ratePlaceholder', '1.000000')}
                data-testid="input-edit-currency-rate"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCurrency(null)}>
              {t('adminPanel.admin.currencies.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleUpdateCurrency}
              disabled={updateCurrencyMutation.isPending}
              data-testid="button-update-currency"
            >
              {updateCurrencyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('adminPanel.common.updating', 'Updating...')}
                </>
              ) : (
                t('adminPanel.admin.currencies.update', 'Update Currency')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
