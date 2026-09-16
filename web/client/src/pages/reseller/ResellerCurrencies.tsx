import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, Loader2, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { CurrencyRate } from '@shared/schema';

type StorefrontSettings = {
  defaultCurrencyId?: string | null;
};

function formatRate(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toFixed(4) : '1.0000';
}

export default function ResellerCurrencies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCurrencyId, setSelectedCurrencyId] = useState('');

  const { data: currencies = [], isLoading: currenciesLoading } = useQuery<CurrencyRate[]>({
    queryKey: ['/api/currencies'],
  });

  const { data: storefront, isLoading: storefrontLoading } = useQuery<StorefrontSettings>({
    queryKey: ['/api/reseller/storefront/settings'],
  });

  const enabledCurrencies = useMemo(
    () => currencies.filter((currency) => currency.isEnabled !== false),
    [currencies],
  );

  const currentDefaultCurrencyId =
    selectedCurrencyId ||
    storefront?.defaultCurrencyId ||
    enabledCurrencies.find((currency) => currency.isDefault)?.id ||
    enabledCurrencies[0]?.id ||
    '';

  const saveDefaultMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', '/api/reseller/storefront/settings', {
        defaultCurrencyId: currentDefaultCurrencyId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/storefront/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/storefront/current'] });
      toast({
        title: 'Currency saved',
        description: 'Your storefront default currency has been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message || 'Could not update storefront currency.',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Coins className="h-6 w-6 text-teal-300" />
          <h1 className="text-3xl font-semibold text-white">Currencies</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Review the currencies available for your storefront and choose the default currency Customers see first.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-950/70 text-white">
        <CardHeader>
          <CardTitle>Storefront Default Currency</CardTitle>
          <CardDescription className="text-slate-400">
            This uses the enabled platform currency list managed by Administration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <Label htmlFor="reseller-currency-default">Default Currency</Label>
              <Select
                value={currentDefaultCurrencyId}
                onValueChange={setSelectedCurrencyId}
                disabled={currenciesLoading || storefrontLoading || enabledCurrencies.length === 0}
              >
                <SelectTrigger id="reseller-currency-default" className="mt-2">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {enabledCurrencies.map((currency) => (
                    <SelectItem key={currency.id} value={currency.id}>
                      {currency.symbol ? `${currency.symbol} ` : ''}
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="bg-primary-gradient text-white"
              disabled={!currentDefaultCurrencyId || saveDefaultMutation.isPending}
              onClick={() => saveDefaultMutation.mutate()}
            >
              {saveDefaultMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Currency
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-950/70 text-white">
        <CardHeader>
          <CardTitle>Available Currencies</CardTitle>
          <CardDescription className="text-slate-400">
            Enabled currencies that can appear on your reseller storefront.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Conversion Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currenciesLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-slate-400">
                      Loading currencies...
                    </TableCell>
                  </TableRow>
                ) : enabledCurrencies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-slate-400">
                      No enabled currencies are configured yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  enabledCurrencies.map((currency) => (
                    <TableRow key={currency.id}>
                      <TableCell className="text-lg">{currency.symbol || '-'}</TableCell>
                      <TableCell className="font-semibold">{currency.code}</TableCell>
                      <TableCell>{currency.name}</TableCell>
                      <TableCell>1 USD = {formatRate(currency.conversionRate)} {currency.code}</TableCell>
                      <TableCell>
                        {currency.isDefault ? (
                          <Badge className="bg-teal-500/20 text-teal-200" variant="outline">
                            Platform Default
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-800 text-slate-200" variant="outline">
                            Enabled
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
