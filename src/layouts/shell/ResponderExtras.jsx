import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, FlaskConical, MapPin, Siren } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useIncidents } from "@/context/IncidentContext";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { useResponderDevMenu } from "@/context/ResponderDevMenuContext";
import { Dialog, DialogContent, Switch } from "@/components/ui";

/** The responder's current, unresolved assignment (if any). */
export function useActiveAssignment() {
  const { user } = useAuth();
  const { incidents } = useIncidents();
  if (!Array.isArray(incidents)) return null;
  return (
    incidents.find((inc) => {
      const isAssigned = inc.assignments?.some((a) => (a.responder_id || a.responder?.id) === user?.id);
      return isAssigned && !["resolved", "cancelled"].includes(inc.status);
    }) || null
  );
}

/** Persistent "return to active response" banner under the top bar. */
export function ActiveAssignmentBanner() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const assignment = useActiveAssignment();
  const { address } = useReverseGeocode(assignment?.latitude, assignment?.longitude);

  if (!assignment || pathname.startsWith("/responder/response-mode/")) return null;

  return (
    <div className="border-b border-critical/20 bg-critical-subtle px-4 py-2 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate(`/responder/response-mode/${assignment.id}`)}
        className="group mx-auto flex w-full max-w-7xl items-center gap-3 text-left"
      >
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-critical text-critical-foreground">
          <Siren className="size-4" aria-hidden="true" />
          <span className="absolute -right-0.5 -top-0.5 size-2.5 animate-ping rounded-full bg-critical motion-reduce:animate-none" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-critical-subtle-foreground">Active response · Incident #{assignment.id}</span>
          <span className="flex items-center gap-1 truncate text-sm font-medium text-foreground">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{address || assignment.barangay || "Location pending"}</span>
          </span>
        </span>
        <span className="hidden items-center gap-1 text-sm font-semibold text-critical-subtle-foreground sm:flex">
          Return to response mode
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
        <ChevronRight className="size-5 text-critical-subtle-foreground sm:hidden" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Hidden test tools (opened by tapping the logo five times). */
export function ResponderDevMenuDialog() {
  const { pathname } = useLocation();
  const {
    showDevMenu,
    setShowDevMenu,
    showResponseModeTestPanel,
    setShowResponseModeTestPanel,
    enableResponderSimulation,
    setEnableResponderSimulation,
  } = useResponderDevMenu();
  const inResponseMode = pathname.startsWith("/responder/response-mode/");

  return (
    <Dialog open={!!showDevMenu} onOpenChange={setShowDevMenu}>
      <DialogContent
        size="sm"
        title="Responder dev menu"
        description="Test-only controls, hidden from the mission console."
      >
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <FlaskConical className="size-4 text-muted-foreground" aria-hidden="true" /> Response mode test panel
            </span>
            <Switch checked={!!showResponseModeTestPanel} onCheckedChange={setShowResponseModeTestPanel} />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
            <span className="text-sm font-medium">Simulate responder movement</span>
            <Switch checked={!!enableResponderSimulation} onCheckedChange={setEnableResponderSimulation} />
          </label>
          <p className="rounded-lg bg-surface-2 p-3 text-xs text-muted-foreground">
            {inResponseMode
              ? "You're in response mode: the tools above apply immediately."
              : "Open a response-mode incident to use the test panel and simulator."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
