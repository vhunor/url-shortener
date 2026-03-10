import { Link, MousePointerClick, Zap, ZapOff, Gauge, ShieldX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Stats } from "@/lib/types";

interface StatsCardsProps {
  stats: Stats | undefined;
  isLoading: boolean;
}

const statConfig = [
  { key: "totalLinks" as const, label: "Total Links", icon: Link, format: (v: number) => v.toLocaleString() },
  { key: "totalClicks" as const, label: "Total Clicks", icon: MousePointerClick, format: (v: number) => v.toLocaleString() },
  { key: "cacheHits" as const, label: "Cache Hits", icon: Zap, format: (v: number) => v.toLocaleString() },
  { key: "cacheMisses" as const, label: "Cache Misses", icon: ZapOff, format: (v: number) => v.toLocaleString() },
  { key: "cacheHitRatio" as const, label: "Hit Ratio", icon: Gauge, format: (v: number) => `${(v * 100).toFixed(1)}%` },
  { key: "negativeCacheHits" as const, label: "Negative Hits", icon: ShieldX, format: (v: number) => v.toLocaleString() },
];

export const StatsCards = ({ stats, isLoading }: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {statConfig.map(({ key, label, icon: Icon, format }) => (
        <Card key={key}>
          <CardContent className="flex flex-col gap-1 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="text-xl font-semibold tracking-tight text-foreground">
                {stats ? format(stats[key]) : "—"}
              </span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
