import { Coins, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

type CurrencySelectorProps = {
  variant?: "default" | "header";
};

export function CurrencySelector({ variant = "default" }: CurrencySelectorProps) {
  const { currency, setCurrency, currencies, isLoading } = useCurrency();

  if (isLoading || currencies.length === 0) {
    return null;
  }

  const enabledCurrencies = currencies.filter((c) => c.isEnabled);
  const currentCurrency =
    enabledCurrencies.find((c) => c.code === currency) || enabledCurrencies[0];

  if (!currentCurrency) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 border-border/50",
            variant === "header" &&
              "border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white dark:text-white"
          )}
          data-testid="button-currency-selector"
        >
          <span className="text-base font-semibold">{currentCurrency.symbol}</span>
          <span className="text-sm font-medium">{currentCurrency.code}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Select Currency
        </div>
        {enabledCurrencies.map((curr) => (
          <DropdownMenuItem
            key={curr.id}
            onClick={() => setCurrency(curr.code)}
            className="flex items-center justify-between cursor-pointer"
            data-testid={`option-currency-${curr.code}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold w-6 text-center">{curr.symbol}</span>
              <div>
                <div className="font-medium">{curr.code}</div>
                <div className="text-xs text-muted-foreground">{curr.name}</div>
              </div>
            </div>
            {currency === curr.code && (
              <Check className="h-4 w-4 text-teal-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
