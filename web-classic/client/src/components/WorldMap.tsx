import { useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/TranslationContext";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface CountryData {
  country: string;
  iso2: string;
  count: number;
}

interface WorldMapProps {
  data: CountryData[];
  timeFilter?: "7days" | "30days" | "lifetime";
  onTimeFilterChange?: (filter: "7days" | "30days" | "lifetime") => void;
}

/**
 * ISO2 → ISO Numeric mapping (used by world-atlas)
 * Only major countries included – add more if needed
 */
const iso2ToNumeric: Record<string, string> = {
  US: "840",
  IN: "356",
  GB: "826",
  CA: "124",
  AU: "036",
  DE: "276",
  FR: "250",
  IT: "380",
  ES: "724",
  NL: "528",
  BR: "076",
  MX: "484",
  CN: "156",
  JP: "392",
  KR: "410",
  SG: "702",
  AE: "784",
  SA: "682",
  RU: "643",
  ZA: "710",
  TR: "792",
  TH: "764",
  ID: "360",
  MY: "458",
  PH: "608",
  VN: "704",
};

export default function WorldMap({
  data,
  timeFilter = "lifetime",
  onTimeFilterChange,
}: WorldMapProps) {
  const { t, languageCode, isRTL } = useTranslation();
  const [hoveredCountry, setHoveredCountry] = useState<{ name: string; count: number } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const mapLocale = languageCode === "ar" ? "ar" : languageCode || "en-US";
  const regionDisplayNames =
    typeof Intl.DisplayNames === "function"
      ? new Intl.DisplayNames([mapLocale], { type: "region" })
      : null;
  const getLocalizedRegionName = (iso2: string | undefined, fallback: string) => {
    if (!iso2) return fallback;

    return regionDisplayNames?.of(iso2.toUpperCase()) || fallback;
  };

  /**
   * Convert API data to numeric ISO map
   */
  const dataByNumeric = data.reduce((acc, item) => {
    const numeric = iso2ToNumeric[item.iso2?.toUpperCase()];
    if (numeric) {
      acc[numeric] = {
        count: item.count,
        name: getLocalizedRegionName(item.iso2, item.country),
      };
    }
    return acc;
  }, {} as Record<string, { count: number; name: string }>);

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const getCountryColor = (count: number) => {
    if (count === 0) return "#e2e8f0";

    const intensity = count / maxCount;

    if (intensity < 0.2) return "#ccfbf1";
    if (intensity < 0.4) return "#5eead4";
    if (intensity < 0.6) return "#2dd4bf";
    if (intensity < 0.8) return "#14b8a6";

    return "#0d9488";
  };

  const handleMouseEnter = (geo: any, event: any) => {
    const countryData = dataByNumeric[String(geo.id)];
    const count = countryData?.count || 0;

    if (count > 0) {
      setHoveredCountry({
        name: countryData?.name || geo.properties.name,
        count,
      });

      setTooltipPosition({
        x: event.clientX,
        y: event.clientY,
      });
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    setTooltipPosition({
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleMouseLeave = () => {
    setHoveredCountry(null);
  };

  return (
    <Card
      className="border border-white/80 bg-white/95 text-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800/80 dark:bg-slate-900/95 dark:text-white dark:shadow-black/25"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* HEADER */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t("adminPanel.admin.dashboard.worldMapTitle", "Top Destination")}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t("adminPanel.admin.dashboard.worldMapDescription", "eSIM Distribution by Region and Country")}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={timeFilter === "7days" ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeFilterChange?.("7days")}
            >
              {t("adminPanel.admin.dashboard.last7Days", "Last 7 Days")}
            </Button>

            <Button
              variant={timeFilter === "30days" ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeFilterChange?.("30days")}
            >
              {t("adminPanel.admin.dashboard.thisMonthFilter", "This Month")}
            </Button>

            <Button
              variant={timeFilter === "lifetime" ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeFilterChange?.("lifetime")}
            >
              {t("adminPanel.admin.dashboard.lifetime", "Lifetime")}
            </Button>
          </div>
        </div>
      </div>

      {/* MAP */}
      <div className="p-6 relative">
        <ComposableMap
          projectionConfig={{ scale: 147 }}
          width={800}
          height={400}
        >
          <ZoomableGroup>
            <Geographies geography={geoUrl}>
              {({ geographies }: any) =>
                geographies.map((geo: any) => {
                  const count = dataByNumeric[String(geo.id)]?.count || 0;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={getCountryColor(count)}
                      stroke="#ffffff"
                      strokeWidth={0.5}
                      onMouseEnter={(e: any) => handleMouseEnter(geo, e)}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        default: { outline: "none" },
                        hover: {
                          fill: count > 0 ? "#0f766e" : "#e2e8f0",
                          outline: "none",
                          cursor: count > 0 ? "pointer" : "default",
                        },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* TOOLTIP */}
        {hoveredCountry && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: tooltipPosition.x + 15,
              top: tooltipPosition.y - 10,
            }}
          >
            <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-lg">
              <p className="font-semibold">{hoveredCountry.name}</p>
              <p className="text-sm text-slate-300">
                {hoveredCountry.count}{" "}
                {hoveredCountry.count === 1
                  ? t("adminPanel.admin.dashboard.order", "Order")
                  : t("adminPanel.admin.dashboard.orders", "Orders")}
              </p>
            </div>
          </div>
        )}

        {/* LEGEND */}
        <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {t("adminPanel.admin.dashboard.orderVolume", "Order Volume")}:
          </span>

          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-200"></div>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {t("adminPanel.admin.dashboard.noOrders", "No Orders")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-teal-100"></div>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {t("adminPanel.admin.dashboard.low", "Low")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-teal-400"></div>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {t("adminPanel.admin.dashboard.medium", "Medium")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-teal-600"></div>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {t("adminPanel.admin.dashboard.high", "High")}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
