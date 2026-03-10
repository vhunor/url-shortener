import { Activity, Database, Shield, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { HealthStatus } from "@/lib/types";
import { format } from "date-fns";

interface SystemHealthProps {
  health: HealthStatus | undefined;
  isLoading: boolean;
}

const StatusBadge = ({ status, goodValues }: { status: string; goodValues: string[] }) => {
  const isGood = goodValues.includes(status);
  return (
    <Badge variant={isGood ? "secondary" : "destructive"} className="text-xs capitalize">
      {status}
    </Badge>
  );
}

export const SystemHealth = ({ health, isLoading }: SystemHealthProps) => {
  const items = health
    ? [
        { icon: Activity, label: "API", value: health.api, goodValues: ["healthy"] },
        { icon: Database, label: "Cache", value: health.cache, goodValues: ["connected"] },
        { icon: Shield, label: "Rate Limiting", value: health.rateLimit, goodValues: ["active"] },
      ]
    : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">System Health</CardTitle>
        <CardDescription className="text-xs">Backend operational status</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-20" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4">
              {items.map(({ icon: Icon, label, value, goodValues }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <StatusBadge status={value} goodValues={goodValues} />
                </div>
              ))}
            </div>
            {health && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Last checked: {format(new Date(health.lastChecked), "h:mm:ss a")}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
