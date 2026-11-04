import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export function Spinner({ className, label = "Loading" }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-muted-foreground">
      <Loader2 className={cn("size-5 animate-spin motion-reduce:animate-none", className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Centered loading block for a page or panel. */
export function LoadingState({ label = "Loading…", className }) {
  return (
    <div role="status" className={cn("flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground", className)}>
      <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      {label}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, compact = false, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-1.5 py-6" : "gap-3 py-12",
        className,
      )}
    >
      <div className={cn("flex items-center justify-center rounded-full bg-surface-2 text-muted-foreground", compact ? "size-9" : "size-12")}>
        <Icon className={compact ? "size-4" : "size-5"} aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, onRetry, compact = false, className }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-1.5 py-6" : "gap-3 py-12",
        className,
      )}
    >
      <div className={cn("flex items-center justify-center rounded-full bg-critical-subtle text-critical", compact ? "size-9" : "size-12")}>
        <AlertTriangle className={compact ? "size-4" : "size-5"} aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden="true" /> Try again
        </Button>
      )}
    </div>
  );
}

/** Inline banner for page-level notices (offline, cached data, permission). */
export function Callout({ tone = "info", icon: Icon, title, children, action, className }) {
  const tones = {
    info: "border-info/30 bg-info-subtle text-info-subtle-foreground",
    warning: "border-warning/40 bg-warning-subtle text-warning-subtle-foreground",
    critical: "border-critical/30 bg-critical-subtle text-critical-subtle-foreground",
    success: "border-success/30 bg-success-subtle text-success-subtle-foreground",
  };
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3 text-sm", tones[tone], className)} role={tone === "critical" ? "alert" : "status"}>
      {Icon && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <div className="min-w-0 flex-1 space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="opacity-90">{children}</div>}
      </div>
      {action}
    </div>
  );
}
