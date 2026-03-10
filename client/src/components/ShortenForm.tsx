import { useState } from "react";
import { Copy, ExternalLink, Info, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { shortenUrl } from "@/lib/api";
import type { ShortenResponse } from "@/lib/types";

interface ShortenFormProps {
  onCreated?: () => void;
}

function isValidUrl(str: string) {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function ShortenForm({ onCreated }: ShortenFormProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ShortenResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    if (!isValidUrl(url.trim())) {
      setError("Please enter a valid URL (including http:// or https://)");
      return;
    }

    setIsLoading(true);
    try {
      const res = await shortenUrl(url.trim());
      setResult(res);
      setUrl("");
      onCreated?.();
      toast.success("Short URL created successfully!");
    } catch {
      toast.error("Failed to create short URL. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Create Short URL</CardTitle>
        <CardDescription>Paste a long URL to generate a short, shareable link</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="https://example.com/very/long/url..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError("");
              }}
              className={error ? "border-destructive" : ""}
              disabled={isLoading}
            />
            {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
          </div>
          <Button type="submit" disabled={isLoading} className="shrink-0">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Shorten URL"}
          </Button>
        </form>

        {result && (
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Short URL</p>
                <p className="text-base font-semibold text-primary break-all">{result.shortUrl}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(result.shortUrl)} title="Copy">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" asChild title="Open">
                  <a href={result.shortUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Original URL</p>
              <p className="text-xs text-foreground break-all">{result.originalUrl}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>Code: <span className="font-mono font-medium text-foreground">{result.code}</span></span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
