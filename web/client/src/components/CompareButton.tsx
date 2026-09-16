import { useLocation } from "wouter";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useComparison } from "@/contexts/ComparisonContext";
import { useTranslation } from "@/contexts/TranslationContext";

export function CompareButton() {
  const [, setLocation] = useLocation();
  const { comparisonItems } = useComparison();
  const { t } = useTranslation();

  if (comparisonItems.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        size="lg"
        onClick={() => setLocation("/compare")}
        className="shadow-lg gap-2"
        data-testid="button-view-comparison"
      >
        <Scale className="h-5 w-5" />
        <span>{t("comparison.comparePackages", "Compare ({{count}})", { count: comparisonItems.length })}</span>
        <Badge variant="secondary" className="ml-1">
          {comparisonItems.length}
        </Badge>
      </Button>
    </div>
  );
}
