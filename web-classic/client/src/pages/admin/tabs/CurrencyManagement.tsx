import {
  Save,
  Building2,
  Mail,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Plus,
  Trash2,
  CreditCard,
  Wallet,
  Loader2,
} from "lucide-react";
import { SiPaypal, SiApplepay, SiGooglepay } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CurrencyRate } from "@shared/schema";
import { useTranslation } from "@/contexts/TranslationContext";
import { useState } from "react";

export function CurrencyManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [newCurrency, setNewCurrency] = useState({
    code: "",
    name: "",
    symbol: "",
    conversionRate: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: currencies, isLoading } = useQuery<CurrencyRate[]>({
    queryKey: ["/api/admin/currencies"],
  });

  const addCurrencyMutation = useMutation({
    mutationFn: async (currency: Partial<CurrencyRate>) => {
      const payload = {
        ...currency,
        conversionRate: Number(currency.conversionRate),
      };
      return await apiRequest("POST", "/api/admin/currencies", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/currencies"] });
      setNewCurrency({ code: "", name: "", symbol: "", conversionRate: "" });
      setShowAddForm(false);
      toast({
        title: t("admin.settings.currency.success", "Success"),
        description: t(
          "admin.settings.currency.currencyAddedSuccess",
          "Currency added successfully"
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("admin.settings.currency.error", "Error"),
        description:
          error.message ||
          t(
            "admin.settings.currency.failedToAddCurrency",
            "Failed to add currency"
          ),
        variant: "destructive",
      });
    },
  });

  const updateCurrencyMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CurrencyRate>;
    }) => {
      return await apiRequest("PUT", `/api/admin/currencies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/currencies"] });
      toast({
        title: t("admin.settings.currency.success", "Success"),
        description: t(
          "admin.settings.currency.currencyUpdatedSuccess",
          "Currency updated successfully"
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("admin.settings.currency.error", "Error"),
        description:
          error.message ||
          t(
            "admin.settings.currency.failedToUpdateCurrency",
            "Failed to update currency"
          ),
        variant: "destructive",
      });
    },
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/currencies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/currencies"] });
      toast({
        title: t("admin.settings.currency.success", "Success"),
        description: t(
          "admin.settings.currency.currencyDeletedSuccess",
          "Currency deleted successfully"
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("admin.settings.currency.error", "Error"),
        description:
          error.message ||
          t(
            "admin.settings.currency.failedToDeleteCurrency",
            "Failed to delete currency"
          ),
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {t("admin.settings.currency.title", "Currency Management")}
            </CardTitle>
            <CardDescription>
              {t(
                "admin.settings.currency.description",
                "Manage supported currencies and their conversion rates (base: USD)"
              )}
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="button-add-currency"
          >
            <Plus className="h-4 w-4" />
            {t("admin.settings.currency.addCurrency", "Add Currency")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <Card className="bg-muted">
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("admin.settings.currency.code", "Code")}</Label>
                  <Input
                    value={newCurrency.code}
                    onChange={(e) =>
                      setNewCurrency({
                        ...newCurrency,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder={t(
                      "admin.settings.currency.codePlaceholder",
                      "USD"
                    )}
                    maxLength={3}
                    data-testid="input-currency-code"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.settings.currency.symbol", "Symbol")}</Label>
                  <Input
                    value={newCurrency.symbol}
                    onChange={(e) =>
                      setNewCurrency({ ...newCurrency, symbol: e.target.value })
                    }
                    placeholder={t(
                      "admin.settings.currency.symbolPlaceholder",
                      "$"
                    )}
                    maxLength={5}
                    data-testid="input-currency-symbol"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.settings.currency.name", "Name")}</Label>
                <Input
                  value={newCurrency.name}
                  onChange={(e) =>
                    setNewCurrency({ ...newCurrency, name: e.target.value })
                  }
                  placeholder={t(
                    "admin.settings.currency.namePlaceholder",
                    "US Dollar"
                  )}
                  data-testid="input-currency-name"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t(
                    "admin.settings.currency.conversionRate",
                    "Conversion Rate (to USD)"
                  )}
                </Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={newCurrency.conversionRate}
                  onChange={(e) =>
                    setNewCurrency({
                      ...newCurrency,
                      conversionRate: e.target.value,
                    })
                  }
                  placeholder={t(
                    "admin.settings.currency.ratePlaceholder",
                    "1.000000"
                  )}
                  data-testid="input-currency-rate"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => addCurrencyMutation.mutate(newCurrency)}
                  disabled={addCurrencyMutation.isPending}
                  data-testid="button-save-currency"
                >
                  {addCurrencyMutation.isPending
                    ? t("admin.settings.currency.adding", "Adding...")
                    : t("admin.settings.currency.addCurrency", "Add Currency")}
                </Button>
                <Button
                  onClick={() => setShowAddForm(false)}
                  variant="outline"
                  data-testid="button-cancel-add"
                >
                  {t("admin.settings.currency.cancel", "Cancel")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {(() => {
            if (isLoading) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  {t(
                    "admin.settings.currency.loadingCurrencies",
                    "Loading currencies..."
                  )}
                </div>
              );
            }

            if (!currencies || currencies.length === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  {t(
                    "admin.settings.currency.noCurrenciesConfigured",
                    "No currencies configured"
                  )}
                </div>
              );
            }

            return currencies.map((currency) => (
              <div
                key={currency.id}
                className="flex items-center justify-between p-4 border rounded-lg"
                data-testid={`currency-row-${currency.code}`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{currency.symbol}</div>

                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {currency.code}

                      {currency.isDefault && (
                        <Badge variant="secondary">
                          {t("admin.settings.currency.default", "Default")}
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {currency.name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    1 USD = {currency.conversionRate} {currency.code}
                  </div>

                  <Switch
                    checked={currency.isEnabled}
                    onCheckedChange={(checked) =>
                      updateCurrencyMutation.mutate({
                        id: currency.id,
                        data: { isEnabled: checked },
                      })
                    }
                    data-testid={`switch-currency-${currency.code}`}
                  />

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
              </div>
            ));
          })()}
        </div>
      </CardContent>
    </Card>
  );
}
