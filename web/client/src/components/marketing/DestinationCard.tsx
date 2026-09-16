import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { convertPrice, getCurrencySymbol } from "@/lib/currency";

interface DestinationCardProps {
  name: string;
  slug: string;
  countryCode: string;
  minPrice?: number;
  currency?: string;
  packageCount?: number;
  imageUrl?: string;
}

export function DestinationCard({
  name,
  slug,
  countryCode,
  minPrice,
  packageCount,
}: DestinationCardProps) {
  const flagUrl = `https://flagcdn.com/${countryCode.toLowerCase()}.svg`;
  const { currency, currencies } = useCurrency();
  const currencySymbol = getCurrencySymbol(currency, currencies);
  
  return (
    <Link href={`/destination/${slug}`} data-testid={`link-destination-${slug}`}>
      <Card 
        className="group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
        data-testid={`card-destination-${slug}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-xl shadow-md">
              <img
                src={flagUrl}
                alt={`${name} flag`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                {name}
              </h3>
              {packageCount && (
                <p className="text-sm text-muted-foreground">
                  {packageCount} {packageCount === 1 ? 'plan' : 'plans'} available
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end">
            {minPrice !== undefined && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">From</p>
                <p className="font-bold text-xl text-primary">
                  {currencySymbol}{convertPrice(minPrice, "USD", currency, currencies).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="absolute bottom-4 right-4 opacity-0 transform translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          <ArrowRight className="h-5 w-5 text-primary" />
        </div>
      </Card>
    </Link>
  );
}

export function DestinationCardSkeleton() {
  return (
    <Card className="rounded-2xl border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-muted animate-pulse" />
          <div>
            <div className="h-5 w-32 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="text-right">
          <div className="h-3 w-12 bg-muted rounded animate-pulse mb-1" />
          <div className="h-6 w-16 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </Card>
  );
}
