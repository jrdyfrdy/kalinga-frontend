import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover",
        secondary: "bg-surface-2 text-foreground hover:bg-border",
        outline: "border border-input bg-surface text-foreground shadow-xs hover:bg-surface-2",
        ghost: "text-foreground hover:bg-surface-2",
        subtle: "bg-primary-subtle text-primary hover:bg-primary-subtle/70",
        accent: "bg-accent text-accent-foreground shadow-xs hover:brightness-95",
        destructive: "bg-critical text-critical-foreground shadow-xs hover:brightness-110",
        emergency:
          "bg-critical text-critical-foreground shadow-md hover:brightness-110 uppercase tracking-wide",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        md: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-base [&_svg]:size-5",
        icon: "size-10 [&_svg]:size-5",
        "icon-sm": "size-8 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

/**
 * The single button for the app. Icon-only buttons (size "icon"/"icon-sm")
 * must pass `aria-label`; dev builds warn when it is missing.
 */
export const Button = forwardRef(function Button(
  { className, variant, size, asChild = false, loading = false, disabled, children, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  if (
    import.meta.env.DEV &&
    (size === "icon" || size === "icon-sm") &&
    !props["aria-label"] &&
    !props["aria-labelledby"] &&
    !props.title
  ) {
    console.warn("[ui/Button] icon-only button without aria-label");
  }
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {children}
        </>
      )}
    </Comp>
  );
});

export const IconButton = forwardRef(function IconButton({ label, size = "icon", variant = "ghost", ...props }, ref) {
  return <Button ref={ref} size={size} variant={variant} aria-label={label} title={label} {...props} />;
});
