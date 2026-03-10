import { Copy, ExternalLink, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { ShortLink } from "@/lib/types";
import { format } from "date-fns";

interface RecentLinksProps {
  links: ShortLink[] | undefined;
  isLoading: boolean;
  onViewDetails: (link: ShortLink) => void;
}

function truncateUrl(url: string, max = 50) {
  return url.length > max ? url.substring(0, max) + "…" : url;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard!");
}

// Mobile card view
function LinkCard({ link, onViewDetails }: { link: ShortLink; onViewDetails: (link: ShortLink) => void }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-mono text-sm font-semibold text-primary">{link.code}</span>
          <p className="mt-1 text-xs text-muted-foreground break-all">{truncateUrl(link.originalUrl, 60)}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-xs">{link.clicks} clicks</Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{format(new Date(link.createdAt), "MMM d, yyyy")}</span>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(link.shortUrl)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
            <a href={link.shortUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onViewDetails(link)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RecentLinks({ links, isLoading, onViewDetails }: RecentLinksProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Links</CardTitle>
        <CardDescription>Your most recently created short URLs</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !links?.length ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-muted-foreground">No links yet. Create your first short URL above.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Original URL</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => (
                    <TableRow key={link.code}>
                      <TableCell className="font-mono font-medium text-primary">{link.code}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground" title={link.originalUrl}>
                        {truncateUrl(link.originalUrl)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{link.clicks.toLocaleString()}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(link.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(link.shortUrl)} title="Copy short URL">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" asChild title="Open short URL">
                            <a href={link.shortUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onViewDetails(link)} title="View details">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {links.map((link) => (
                <LinkCard key={link.code} link={link} onViewDetails={onViewDetails} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
