import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StatsCards } from "@/components/StatsCards";
import { ShortenForm } from "@/components/ShortenForm";
import { RecentLinks } from "@/components/RecentLinks";
import { LinkDetailsDialog } from "@/components/LinkDetailsDialog";
import { SystemHealth } from "@/components/SystemHealth";
import { fetchLinks, fetchStats, fetchHealth } from "@/lib/api";
import type { ShortLink } from "@/lib/types";

const Index = () => {
  const { data: links, isLoading: linksLoading } = useQuery({
    queryKey: ["links"],
    queryFn: fetchLinks,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  const [selectedLink, setSelectedLink] = useState<ShortLink | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleViewDetails = (link: ShortLink) => {
    setSelectedLink(link);
    setDetailsOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <StatsCards stats={stats} isLoading={statsLoading} />
        <ShortenForm />
        <RecentLinks links={links} isLoading={linksLoading} onViewDetails={handleViewDetails} />
        <SystemHealth health={health} isLoading={healthLoading} />
      </main>
      <LinkDetailsDialog link={selectedLink} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </div>
  );
};

export default Index;
