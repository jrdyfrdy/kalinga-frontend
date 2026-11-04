import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, ClipboardList, Map, RefreshCcw, Send } from "lucide-react";
import { formatRelativeTime } from "@/lib/datetime";
import adminService from "@/services/adminService";
import { Button, Card, Switch } from "@/components/ui";
import { cn } from "@/lib/utils";

const SYNC_INTERVAL_MS = 10 * 1000;

const TIME_RANGES = [
  { value: "3h", label: "3h", ms: 3 * 60 * 60 * 1000 },
  { value: "6h", label: "6h", ms: 6 * 60 * 60 * 1000 },
  { value: "12h", label: "12h", ms: 12 * 60 * 60 * 1000 },
  { value: "24h", label: "24h", ms: 24 * 60 * 60 * 1000 },
  { value: "7d", label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
];

const priorityScore = (incident) => {
  const p = String(incident.priority || incident.severity || incident.status || "").toLowerCase();
  if (p.includes("critical") || p.includes("severe")) return 4;
  if (p.includes("high") || p.includes("en_route")) return 3;
  if (p.includes("moderate") || p.includes("ack")) return 2;
  return 1;
};

const incidentLocation = (incident) =>
  incident.barangay ||
  incident.address ||
  incident.location?.address ||
  incident.location?.barangay ||
  incident.city ||
  incident.region ||
  "the reported area";

const humanStatus = (value) =>
  String(value || "reported")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

/**
 * Admin dashboard header: the highest-priority live incident in the selected
 * window, auto-refresh control, and shortcut cards with live metrics.
 */
export function AdminCommandHeader({ onNavigateSection }) {
  const [timeRange, setTimeRange] = useState("6h");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [highlight, setHighlight] = useState(null);
  const [alertState, setAlertState] = useState({ status: "idle", error: null, syncedAt: null });
  const [metrics, setMetrics] = useState({ incidents: null, resources: null, notificationCount: null });
  const [metricsState, setMetricsState] = useState("idle");

  const fetchAlert = useCallback(async (windowValue) => {
    setAlertState((prev) => ({ ...prev, status: prev.status === "success" ? "refreshing" : "loading" }));
    try {
      const incidents = await adminService.getIncidents({ include_resolved: false });
      const limit = TIME_RANGES.find((r) => r.value === windowValue)?.ms ?? TIME_RANGES[1].ms;
      const now = Date.now();
      const sorted = (incidents || [])
        .filter((incident) => {
          const ts = new Date(incident.updated_at || incident.created_at || Date.now()).getTime();
          return Number.isNaN(ts) || now - ts <= limit;
        })
        .sort((a, b) => {
          const diff = priorityScore(b) - priorityScore(a);
          if (diff !== 0) return diff;
          return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
        });
      setHighlight(sorted[0] || null);
      setAlertState({ status: "success", error: null, syncedAt: new Date() });
    } catch (error) {
      console.error("Failed to sync command alerts", error);
      setAlertState((prev) => ({ ...prev, status: "error", error: "Couldn't sync alerts. Showing the last known state." }));
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    setMetricsState((prev) => (prev === "success" ? "refreshing" : "loading"));
    try {
      const [incidentStats, resourceStats, notifications] = await Promise.all([
        adminService.getIncidentStats().catch(() => null),
        adminService.getResourceStats().catch(() => null),
        adminService.getNotifications().catch(() => []),
      ]);
      const count = Array.isArray(notifications)
        ? notifications.length
        : Array.isArray(notifications?.data)
          ? notifications.data.length
          : Number(notifications?.meta?.total ?? 0);
      setMetrics({ incidents: incidentStats, resources: resourceStats, notificationCount: Number.isFinite(count) ? count : 0 });
      setMetricsState("success");
    } catch (error) {
      console.error("Failed to sync quick action metrics", error);
      setMetricsState("error");
    }
  }, []);

  useEffect(() => {
    fetchAlert(timeRange);
  }, [fetchAlert, timeRange]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => {
      fetchAlert(timeRange);
      fetchMetrics();
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, fetchAlert, fetchMetrics, timeRange]);

  const statusLabel = useMemo(() => {
    if (alertState.status === "loading") return "Syncing…";
    if (alertState.status === "error") return alertState.error;
    if (alertState.syncedAt) return `Updated ${formatRelativeTime(alertState.syncedAt, { short: true })}`;
    return "Monitoring";
  }, [alertState]);

  const shortcuts = [
    {
      id: "incidents",
      label: "Incidents",
      description: "Log or review field reports",
      icon: AlertTriangle,
      metric: metrics.incidents ? `${metrics.incidents.active ?? metrics.incidents.total ?? 0} active` : null,
    },
    {
      id: "resources",
      label: "Resource board",
      description: "Deployments and staging",
      icon: ClipboardList,
      metric: metrics.resources
        ? `${metrics.resources.critical ?? 0} critical · ${metrics.resources.lowStock ?? 0} low stock`
        : null,
    },
    {
      id: "broadcast",
      label: "Broadcast advisory",
      description: "Push updates to every channel",
      icon: Send,
      metric: typeof metrics.notificationCount === "number" ? `${metrics.notificationCount} sent` : null,
    },
  ];

  const isCritical = highlight && priorityScore(highlight) >= 3;

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          "flex flex-col gap-4 p-5 lg:flex-row lg:items-center",
          isCritical && "border-critical/40 bg-critical-subtle",
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              isCritical ? "bg-critical text-critical-foreground" : "bg-primary-subtle text-primary",
            )}
          >
            {isCritical ? <AlertTriangle className="size-5" aria-hidden="true" /> : <Activity className="size-5" aria-hidden="true" />}
          </span>
          <div className="min-w-0 space-y-1">
            <p className={cn("text-xs font-semibold", isCritical ? "text-critical-subtle-foreground" : "text-primary")}>
              {highlight ? (isCritical ? "Priority incident" : "Latest incident") : "Command status"}
            </p>
            <p className="text-base font-semibold text-foreground">
              {highlight
                ? `${highlight.type || "Incident"} in ${incidentLocation(highlight)}`
                : "No active incidents in this window"}
            </p>
            <p className="text-sm text-muted-foreground">
              {highlight
                ? `${humanStatus(highlight.status || highlight.priority)} · updated ${formatRelativeTime(highlight.updated_at || highlight.created_at || new Date())}`
                : "New reports will surface here automatically."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Time window" className="inline-flex rounded-lg bg-surface-2 p-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                type="button"
                aria-pressed={timeRange === range.value}
                onClick={() => setTimeRange(range.value)}
                className={cn(
                  "h-7 rounded-md px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground",
                  timeRange === range.value && "bg-surface text-foreground shadow-xs",
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
          <Button variant={isCritical ? "destructive" : "outline"} size="sm" onClick={() => onNavigateSection?.("incidents")}>
            <Map aria-hidden="true" /> {highlight ? "Open incident map" : "Review incidents"}
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} aria-label="Auto-refresh every 10 seconds" />
          Auto-refresh
          <span className="text-xs">· {statusLabel}</span>
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            fetchAlert(timeRange);
            fetchMetrics();
          }}
          loading={metricsState === "loading"}
        >
          {metricsState !== "loading" && <RefreshCcw aria-hidden="true" />} Sync now
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {shortcuts.map(({ id, label, description, icon: Icon, metric }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigateSection?.(id)}
            className="group flex items-start gap-4 rounded-xl border border-border bg-surface p-4 text-left shadow-xs transition-shadow hover:shadow-md"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                {label}
                <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
              <span className="block text-sm text-muted-foreground">{description}</span>
              <span className="tabular mt-1 block text-xs font-medium text-foreground">
                {metric ?? (metricsState === "error" ? "Metrics unavailable" : "Loading…")}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default AdminCommandHeader;
