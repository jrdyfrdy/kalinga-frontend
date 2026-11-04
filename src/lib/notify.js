import { toast } from "@/hooks/use-toast";

/**
 * App-wide, non-blocking feedback. Replaces window.alert().
 *
 *   notify.success("Request submitted");
 *   notify.error("Could not save", err);   // err → server message if present
 */
const describeError = (error) => {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    undefined
  );
};

const show = (variant, title, description) =>
  toast({ variant, title, description: typeof description === "string" ? description : undefined });

export const notify = {
  info: (title, description) => show("default", title, description),
  success: (title, description) => show("success", title, description),
  warning: (title, description) => show("warning", title, description),
  error: (title, errorOrDescription) => show("destructive", title, describeError(errorOrDescription)),
};

export default notify;
