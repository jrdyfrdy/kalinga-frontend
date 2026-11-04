import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Card = forwardRef(function Card({ className, interactive = false, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-surface text-foreground shadow-xs",
        interactive && "transition-shadow hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
});

export function CardHeader({ className, actions, children, ...props }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 p-5 pb-3", className)} {...props}>
      <div className="min-w-0 space-y-1">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardTitle({ className, as: Tag = "h3", ...props }) {
  return <Tag className={cn("text-base font-semibold leading-tight text-foreground", className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn("flex items-center justify-end gap-2 border-t border-border px-5 py-3", className)}
      {...props}
    />
  );
}
