import { cn } from "@/lib/utils";

/** Horizontally scrollable table with consistent density and header styling. */
export function Table({ className, wrapperClassName, ...props }) {
  return (
    <div className={cn("w-full overflow-x-auto rounded-lg border border-border", wrapperClassName)}>
      <table className={cn("w-full caption-bottom border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }) {
  return <thead className={cn("bg-surface-2 text-left", className)} {...props} />;
}

export function TBody({ className, ...props }) {
  return <tbody className={cn("divide-y divide-border bg-surface", className)} {...props} />;
}

export function TR({ className, onClick, ...props }) {
  return (
    <tr
      onClick={onClick}
      className={cn("transition-colors", onClick && "cursor-pointer hover:bg-surface-2/60", className)}
      {...props}
    />
  );
}

export function TH({ className, ...props }) {
  return (
    <th
      scope="col"
      className={cn("whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-muted-foreground", className)}
      {...props}
    />
  );
}

export function TD({ className, ...props }) {
  return <td className={cn("px-4 py-3 align-middle text-foreground", className)} {...props} />;
}

/** Single full-width row for empty/loading states inside a table body. */
export function TableEmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-2">
        {children}
      </td>
    </tr>
  );
}
