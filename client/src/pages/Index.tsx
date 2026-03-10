import { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StatsCards } from "@/components/StatsCards";
import { ShortenForm } from "@/components/ShortenForm";
import { RecentLinks } from "@/components/RecentLinks";
import { LinkDetailsDialog } from "@/components/LinkDetailsDialog";
import { SystemHealth } from "@/components/SystemHealth";
import { fetchLinks, fetchStats, fetchHealth } from "@/lib/api";
import type { ShortLink, Stats, HealthStatus } from "@/lib/types";

const Index = () => {
  const [links, setLinks] = useState<ShortLink[]>();
  const [stats, setStats] = useState<Stats>();
  const [health, setHealth] = useState<HealthStatus>();
  const [linksLoading, setLinksLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [selectedLink, setSelectedLink] = useState<ShortLink | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLinksLoading(true);
    setStatsLoading(true);
    setHealthLoading(true);

    fetchLinks().then((d) => { setLinks(d); setLinksLoading(false); });
    fetchStats().then((d) => { setStats(d); setStatsLoading(false); });
    fetchHealth().then((d) => { setHealth(d); setHealthLoading(false); });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleViewDetails = (link: ShortLink) => {
    setSelectedLink(link);
    setDetailsOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <StatsCards stats={stats} isLoading={statsLoading} />
        <ShortenForm onCreated={loadData} />
        <RecentLinks links={links} isLoading={linksLoading} onViewDetails={handleViewDetails} />
        <SystemHealth health={health} isLoading={healthLoading} />
      </main>
      <LinkDetailsDialog link={selectedLink} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </div>
  );
};

export default Index;
