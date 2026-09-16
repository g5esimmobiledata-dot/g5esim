import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  description?: string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
}

export function StatCard({ title, value, icon: Icon, trend, description, badge }: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="h-3 w-3" />;
    if (trend.value < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.isPositive === undefined) {
      return trend.value > 0 ? "text-green-600 dark:text-green-400" : trend.value < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground";
    }
    return trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  };

  return (
    <Card className="hover-elevate">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">{value}</div>
          {badge && (
            <Badge variant={badge.variant || "default"} className="ml-auto">
              {badge.text}
            </Badge>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend && (
            <div className={cn("flex items-center gap-1 font-medium", getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
          <span className="text-muted-foreground">
            {trend ? trend.label : description}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// Activity Feed Component
interface ActivityItem {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  timestamp: string;
  type?: "success" | "warning" | "error" | "info";
}

interface ActivityFeedProps {
  items: ActivityItem[];
  className?: string;
}

export function ActivityFeed({ items, className }: ActivityFeedProps) {
  const getTypeColor = (type?: string) => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400";
      case "warning":
        return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "error":
        return "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3" data-testid={`activity-${item.id}`}>
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", getTypeColor(item.type))}>
            <item.icon className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
            <p className="text-xs text-muted-foreground">{item.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Metric Tile Component
interface MetricTileProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: LucideIcon;
  color?: string;
}

export function MetricTile({ label, value, change, icon: Icon, color = "primary" }: MetricTileProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      {Icon && (
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", `bg-${color}/10`)}>
          <Icon className={cn("h-6 w-6", `text-${color}`)} />
        </div>
      )}
    </div>
  );
}

// Chart Container Component
interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function ChartContainer({ title, description, children, actions, className }: ChartContainerProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// Data Table Loading Skeleton
export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-10 flex-1 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Empty State Component
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
