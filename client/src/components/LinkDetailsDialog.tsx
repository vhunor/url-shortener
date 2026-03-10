import { Copy, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useClipboard } from "@/hooks/use-clipboard";
import type { ShortLink } from "@/lib/types";
import { format } from "date-fns";

interface LinkDetailsDialogProps {
  link: ShortLink | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkDetailsDialog({ link, open, onOpenChange }: LinkDetailsDialogProps) {
  const { copy } = useClipboard();
  if (!link) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Link Details
            <Badge variant="secondary" className="font-mono text-xs">{link.code}</Badge>
          </DialogTitle>
          <DialogDescription>Full details for this short link</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Short URL</p>
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm font-medium text-primary break-all">{link.shortUrl}</p>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copy(link.shortUrl)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" asChild>
                <a href={link.shortUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Original URL</p>
            <p className="text-sm text-foreground break-all">{link.originalUrl}</p>
          </div>

          <Separator />

          <div className="flex gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total Clicks</p>
              <p className="text-2xl font-semibold text-foreground">{link.clicks.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Created</p>
              <p className="text-sm text-foreground">{format(new Date(link.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
