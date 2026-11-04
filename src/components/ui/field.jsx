import { Children, cloneElement, isValidElement, useId } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, required, children, ...props }) {
  return (
    <label className={cn("text-sm font-medium text-foreground", className)} {...props}>
      {children}
      {required && (
        <span className="ml-0.5 text-critical" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

/**
 * Wraps one control with its label, hint and error, wiring `id`, `htmlFor`,
 * `aria-invalid`, `aria-describedby` and `required` for you.
 *
 *   <Field label="Email" error={errors.email} required>
 *     <Input type="email" value={email} onChange={...} />
 *   </Field>
 */
export function Field({ label, hint, error, required, className, children, id: idProp }) {
  const autoId = useId();
  const child = Children.only(children);
  const id = idProp || child.props.id || `field-${autoId}`;
  // The hint is replaced by the error while one is shown.
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [child.props["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(child)
    ? cloneElement(child, {
        id,
        required: child.props.required ?? required,
        "aria-invalid": error ? true : child.props["aria-invalid"],
        "aria-describedby": describedBy,
      })
    : child;

  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
