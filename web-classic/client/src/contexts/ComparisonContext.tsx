import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ComparisonPackage {
  id: string;
  slug: string;
  title: string;
  dataAmount: string;
  validity: number;
  price: string;
  currency: string;
  type: string;
  isUnlimited?: boolean;
  isBestPrice?: boolean;
  operator?: string | null;
  destination?: {
    id: string;
    name: string;
    slug: string;
    flagEmoji?: string | null;
  };
  region?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ComparisonContextType {
  comparisonItems: ComparisonPackage[];
  addToComparison: (pkg: ComparisonPackage) => void;
  removeFromComparison: (packageId: string) => void;
  clearComparison: () => void;
  isInComparison: (packageId: string) => boolean;
  isFull: boolean;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

const STORAGE_KEY = "esim-comparison";
const MAX_COMPARISON_ITEMS = 4;

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [comparisonItems, setComparisonItems] = useState<ComparisonPackage[]>(() => {
    // Load from localStorage on mount
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (error) {
        console.error("Failed to load comparison from localStorage:", error);
      }
    }
    return [];
  });

  // Save to localStorage whenever comparisonItems changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(comparisonItems));
      } catch (error) {
        console.error("Failed to save comparison to localStorage:", error);
      }
    }
  }, [comparisonItems]);

  const addToComparison = (pkg: ComparisonPackage) => {
    setComparisonItems((prev) => {
      // Don't add if already exists
      if (prev.some((item) => item.id === pkg.id)) {
        return prev;
      }
      // Don't add if full
      if (prev.length >= MAX_COMPARISON_ITEMS) {
        return prev;
      }
      return [...prev, pkg];
    });
  };

  const removeFromComparison = (packageId: string) => {
    setComparisonItems((prev) => prev.filter((item) => item.id !== packageId));
  };

  const clearComparison = () => {
    setComparisonItems([]);
  };

  const isInComparison = (packageId: string) => {
    return comparisonItems.some((item) => item.id === packageId);
  };

  const isFull = comparisonItems.length >= MAX_COMPARISON_ITEMS;

  return (
    <ComparisonContext.Provider
      value={{
        comparisonItems,
        addToComparison,
        removeFromComparison,
        clearComparison,
        isInComparison,
        isFull,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error("useComparison must be used within ComparisonProvider");
  }
  return context;
}
