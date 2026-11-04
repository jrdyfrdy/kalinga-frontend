import { createContext, useCallback, useContext, useRef, useState } from "react";
import * as AlertDialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";

const ConfirmContext = createContext(null);

/**
 * Promise-based confirmation dialog. Replaces window.confirm().
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete asset?", description: "…", confirmLabel: "Delete", tone: "critical" })) { … }
 */
export function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts) => {
    const normalised = typeof opts === "string" ? { title: opts } : opts || {};
    setOptions(normalised);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  };

  const tone = options?.tone === "critical" ? "critical" : "default";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={!!options} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[1250] bg-neutral-950/50 backdrop-blur-[2px]" />
          <AlertDialog.Content
            role="alertdialog"
            className="fixed left-1/2 top-1/2 z-[1250] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 text-foreground shadow-lg focus:outline-none"
          >
            <div className="flex gap-4">
              {tone === "critical" && (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-critical-subtle text-critical">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0 space-y-1.5">
                <AlertDialog.Title className="text-base font-semibold">{options?.title || "Are you sure?"}</AlertDialog.Title>
                <AlertDialog.Description className="text-sm text-muted-foreground">
                  {options?.description || "This action can't be undone."}
                </AlertDialog.Description>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => settle(false)}>
                {options?.cancelLabel || "Cancel"}
              </Button>
              <Button variant={tone === "critical" ? "destructive" : "primary"} onClick={() => settle(true)} autoFocus>
                {options?.confirmLabel || "Confirm"}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    // Outside the provider (e.g. isolated tests): degrade to the native dialog.
    return async (opts) => window.confirm(typeof opts === "string" ? opts : opts?.title || "Are you sure?");
  }
  return confirm;
}
