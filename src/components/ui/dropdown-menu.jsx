import { forwardRef } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuGroup = Menu.Group;

export const DropdownMenuContent = forwardRef(function DropdownMenuContent(
  { className, align = "end", sideOffset = 6, ...props },
  ref,
) {
  return (
    <Menu.Portal>
      <Menu.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-[1150] min-w-48 overflow-hidden rounded-lg border border-border bg-surface p-1 text-foreground shadow-lg",
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
});

export const DropdownMenuItem = forwardRef(function DropdownMenuItem(
  { className, tone = "default", ...props },
  ref,
) {
  return (
    <Menu.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-2 [&_svg]:size-4 [&_svg]:text-muted-foreground",
        tone === "critical" && "text-critical data-[highlighted]:bg-critical-subtle [&_svg]:text-critical",
        className,
      )}
      {...props}
    />
  );
});

export function DropdownMenuLabel({ className, ...props }) {
  return <Menu.Label className={cn("px-2.5 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }) {
  return <Menu.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}
