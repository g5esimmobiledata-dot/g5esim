import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { CurrencyRate } from "@shared/schema";

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  currencies: CurrencyRate[];
  isLoading: boolean;
  defaultCurrency: CurrencyRate | null;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("preferredCurrency") || "";
    }
    return "";
  });

  const { data: currencies = [], isLoading } = useQuery<CurrencyRate[]>({
    queryKey: ["/api/currencies"],
  });

  // Find enabled currencies
  const enabledCurrencies = currencies.filter((c) => c.isEnabled);
  
  // Find the default currency from enabled currencies
  const defaultCurrency = enabledCurrencies.find((c) => c.isDefault) || enabledCurrencies[0] || null;

  // Set currency to default from server if no localStorage preference exists or if stored currency is not available
  useEffect(() => {
    if (!isLoading && enabledCurrencies.length > 0) {
      const storedCurrency = currency || localStorage.getItem("preferredCurrency");
      const isStoredCurrencyValid = enabledCurrencies.some((c) => c.code === storedCurrency);
      
      if (!storedCurrency || !isStoredCurrencyValid) {
        // Use server default or first enabled currency
        const serverDefault = enabledCurrencies.find((c) => c.isDefault);
        const fallbackCurrency = serverDefault?.code || enabledCurrencies[0]?.code;
        if (fallbackCurrency) {
          setCurrencyState(fallbackCurrency);
        }
      } else if (!currency && storedCurrency) {
        setCurrencyState(storedCurrency);
      }
    }
  }, [currencies, isLoading, currency, enabledCurrencies]);

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferredCurrency", newCurrency);
    }
    // Invalidate all price-bearing queries
    queryClient.invalidateQueries({ queryKey: ["/api/unified-packages"] });
    queryClient.invalidateQueries({
      queryKey: ["/api/destinations/with-pricing"],
    });
    queryClient.invalidateQueries({ queryKey: ["/api/regions/with-pricing"] });
    queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
  };

  return (
    <CurrencyContext.Provider
      value={{ currency: currency || "USD", setCurrency, currencies, isLoading, defaultCurrency }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
