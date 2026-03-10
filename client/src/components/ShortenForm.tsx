import { useState, type FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Info, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { shortenUrl } from "@/lib/api";
import { useClipboard } from "@/hooks/useClipboard";
import type { ShortenResponse } from "@/lib/types";

const isValidUrl = (str: string) => {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const ShortenForm = () => {
  const queryClient = useQueryClient();
  const { copy } = useClipboard();
  const [result, setResult] = useState<ShortenResponse | null>(null);

  const mutation = useMutation({
    mutationFn: shortenUrl,
    onSuccess: (data) => {
      const { code, shortUrl, originalUrl } = data;
      setResult({ code, shortUrl, originalUrl });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["links"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Short URL created successfully!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create short URL. Please try again.");
    },
  });

  const form = useForm({
    defaultValues: { url: "" },
    onSubmit: ({ value }) => {
      setResult(null);
      mutation.mutate(value.url.trim());
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    form.handleSubmit();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Create Short URL</CardTitle>
        <CardDescription>Paste a long URL to generate a short, shareable link</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={handleSubmit}
          className="flex gap-2"
        >
          <div className="flex-1">
            <form.Field
              name="url"
              validators={{
                onSubmit: ({ value }) => {
                  if (!value.trim()) return "Please enter a URL";
                  if (!isValidUrl(value.trim())) return "Please enter a valid URL (including http:// or https://)";
                },
              }}
            >
              {(field) => (
                <>
                  <Input
                    placeholder="https://example.com/very/long/url..."
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className={field.state.meta.errors.length ? "border-destructive" : ""}
                    disabled={mutation.isPending}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="mt-1.5 text-xs text-destructive">{field.state.meta.errors[0]}</p>
                  )}
                </>
              )}
            </form.Field>
          </div>
          <Button type="submit" disabled={mutation.isPending} className="shrink-0">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Shorten URL"}
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
                <Button size="icon" variant="ghost" onClick={() => copy(result.shortUrl)} title="Copy">
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
};
