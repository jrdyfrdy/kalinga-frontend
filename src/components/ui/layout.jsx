import { cn } from "@/lib/utils";

/** Standard page title row: title, optional description, actions on the right. */
export function PageHeader({ title, description, eyebrow, actions, className, children }) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem]">{title}</h1>
        {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Page body container with consistent padding and vertical rhythm. */
export function Page({ className, children, width = "default" }) {
  const widths = { default: "max-w-7xl", narrow: "max-w-3xl", wide: "max-w-[96rem]", full: "max-w-none" };
  return <div className={cn("mx-auto w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8", widths[width], className)}>{children}</div>;
}

const deltaTone = {
  up: "text-success-subtle-foreground bg-success-subtle",
  down: "text-critical-subtle-foreground bg-critical-subtle",
  neutral: "text-muted-foreground bg-surface-2",
};

/** KPI tile. `tone` tints the icon; `delta` renders a small trend chip. */
export function StatCard({ label, value, icon: Icon, tone = "brand", hint, delta, deltaDirection = "neutral", className, onClick }) {
  const iconTones = {
    brand: "bg-primary-subtle text-primary",
    critical: "bg-critical-subtle text-critical",
    warning: "bg-warning-subtle text-warning-subtle-foreground",
    info: "bg-info-subtle text-info",
    neutral: "bg-surface-2 text-muted-foreground",
  };
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-4 rounded-xl border border-border bg-surface p-5 text-left shadow-xs",
        onClick && "transition-shadow hover:shadow-md",
        className,
      )}
    >
      {Icon && (
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", iconTones[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="tabular text-2xl font-bold tracking-tight text-foreground">{value ?? "—"}</p>
        {(hint || delta) && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {delta && (
              <span className={cn("rounded-full px-1.5 py-0.5 font-medium", deltaTone[deltaDirection])}>{delta}</span>
            )}
            {hint}
          </div>
        )}
      </div>
    </Comp>
  );
}

export function Avatar({ name = "", src, size = "md", className }) {
  const sizes = { sm: "size-8 text-xs", md: "size-9 text-sm", lg: "size-12 text-base", xl: "size-20 text-2xl" };
  const initials =
    String(name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-subtle font-semibold text-primary",
        sizes[size],
        className,
      )}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : <span aria-hidden="true">{initials}</span>}
      <span className="sr-only">{name}</span>
    </span>
  );
}

export function Kbd({ className, ...props }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface-2 px-1 font-mono text-[0.7rem] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
