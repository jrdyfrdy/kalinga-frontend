import { forwardRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const Overlay = forwardRef(function Overlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-[1100] bg-neutral-950/50 backdrop-blur-[2px] data-[state=open]:animate-fade-in",
        className,
      )}
      {...props}
    />
  );
});

const CloseButton = () => (
  <DialogPrimitive.Close
    className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
    aria-label="Close"
  >
    <X className="size-4" aria-hidden="true" />
  </DialogPrimitive.Close>
);

const contentVariants = cva(
  "fixed left-1/2 top-1/2 z-[1100] flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-surface text-foreground shadow-lg focus:outline-none",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

/**
 * Accessible modal: focus trap, Escape/overlay to close, scroll lock and
 * aria wiring come from Radix. Pass `title` (required for screen readers) and
 * optionally `description`; put actions in <DialogFooter>.
 */
export const DialogContent = forwardRef(function DialogContent(
  { className, size, title, description, hideClose = false, children, ...props },
  ref,
) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content ref={ref} className={cn(contentVariants({ size }), className)} {...props}>
        {(title || description) && (
          <div className="space-y-1 border-b border-border px-5 py-4 pr-12">
            {title && <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>}
            {description && (
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {!hideClose && <CloseButton />}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

export function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        "-mx-5 -mb-4 mt-4 flex flex-col-reverse gap-2 border-t border-border bg-surface-2/50 px-5 py-3 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

const sheetSide = {
  left: "inset-y-0 left-0 h-full w-[min(20rem,85vw)] border-r",
  right: "inset-y-0 right-0 h-full w-[min(28rem,100vw)] border-l",
  bottom: "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t",
};

/** Side drawer (mobile navigation, slide-over detail panels). */
export const SheetContent = forwardRef(function SheetContent(
  { className, side = "right", title, description, hideHeader = false, children, ...props },
  ref,
) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-[1100] flex flex-col border-border bg-surface text-foreground shadow-lg focus:outline-none",
          sheetSide[side],
          className,
        )}
        {...props}
      >
        <div className={cn("space-y-1 border-b border-border px-5 py-4 pr-12", hideHeader && "sr-only")}>
          <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              {description}
            </DialogPrimitive.Description>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        <CloseButton />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
