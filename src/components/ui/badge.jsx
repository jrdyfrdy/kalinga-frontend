import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-2 text-muted-foreground",
        brand: "border-transparent bg-primary-subtle text-primary",
        critical: "border-transparent bg-critical-subtle text-critical-subtle-foreground",
        warning: "border-transparent bg-warning-subtle text-warning-subtle-foreground",
        success: "border-transparent bg-success-subtle text-success-subtle-foreground",
        info: "border-transparent bg-info-subtle text-info-subtle-foreground",
        solidCritical: "border-transparent bg-critical text-critical-foreground",
        outline: "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({ className, tone, dot = false, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

/**
 * One place that maps domain values (incident status, severity, triage level,
 * request urgency, asset state…) to a tone. Unknown values fall back to neutral.
 */
const STATUS_TONES = {
  // severity / urgency / priority
  critical: "critical",
  emergency: "critical",
  high: "warning",
  urgent: "warning",
  medium: "info",
  moderate: "info",
  low: "neutral",
  // triage
  red: "critical",
  immediate: "critical",
  yellow: "warning",
  delayed: "warning",
  green: "success",
  minor: "success",
  black: "neutral",
  expectant: "neutral",
  // incident lifecycle
  reported: "critical",
  pending: "warning",
  acknowledged: "warning",
  assigned: "info",
  dispatched: "info",
  en_route: "info",
  on_scene: "info",
  transporting: "info",
  hospital_transfer: "info",
  in_progress: "info",
  resolved: "success",
  completed: "success",
  closed: "neutral",
  cancelled: "neutral",
  // requests / allocations / assets
  draft: "neutral",
  submitted: "info",
  under_review: "warning",
  approved: "success",
  rejected: "critical",
  archived: "neutral",
  delivered: "success",
  in_transit: "info",
  available: "success",
  active: "success",
  online: "success",
  offline: "neutral",
  busy: "warning",
  maintenance: "warning",
  overdue: "critical",
  verified: "success",
  unverified: "warning",
};

const normalise = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const statusTone = (value) => STATUS_TONES[normalise(value)] ?? "neutral";

const humanise = (value) => {
  const text = String(value ?? "").replace(/[_-]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "Unknown";
};

export function StatusBadge({ status, label, className, ...props }) {
  return (
    <Badge tone={statusTone(status)} dot className={className} {...props}>
      {label ?? humanise(status)}
    </Badge>
  );
}
