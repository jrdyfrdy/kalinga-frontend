import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Database, RefreshCw, Server, Users } from "lucide-react";
import { SectionHeader } from "../SectionHeader";
import { StatCard } from "../StatCard";
import api from "@/services/api";

const POLL_MS = 30000;
const HISTORY_POINTS = 12;

const statusTone = {
  online: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  degraded: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  offline: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
};

const statusLabel = { online: "Online", degraded: "Degraded", offline: "Offline" };

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

/**
 * Live service health from GET /api/admin/connectivity/status
 * (DB, Node API, Reverb, forecasting). Latency history is kept client-side
 * from successive polls.
 */
export const ConnectivityMonitoring = () => {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    const started = performance.now();
    try {
      const { data } = await api.get("/admin/connectivity/status");
      if (!mountedRef.current) return;
      const roundTrip = Math.round(performance.now() - started);
      setStatus(data);
      setError(null);
      setHistory((prev) =>
        [
          ...prev,
          {
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            latency: roundTrip,
          },
        ].slice(-HISTORY_POINTS),
      );
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err?.response?.data?.message || "Unable to reach the API server.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchStatus();
    const timer = setInterval(fetchStatus, POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [fetchStatus]);

  const services = status?.services || [];
  const onlineCount = services.filter((s) => s.status === "online").length;
  const dbService = services.find((s) => s.name === "Primary database");
  const medianLatency = median(history.map((h) => h.latency));
  const maxLatency = Math.max(50, ...history.map((h) => h.latency));
  const activeDb = status?.database_failover?.active_connection || status?.database_failover?.active;

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Connectivity Monitoring"
        description="Live health of the API, database, realtime server and supporting services."
      />

      <div className="flex justify-end">
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-sm font-medium hover:border-primary/50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Server}
          label="API server"
          value={error ? "Unreachable" : status ? "Online" : "Checking…"}
          change={status?.checked_at ? `Checked ${new Date(status.checked_at).toLocaleTimeString()}` : ""}
          tone={error ? "danger" : "success"}
        />
        <StatCard
          icon={Activity}
          label="Median round-trip"
          value={medianLatency != null ? `${medianLatency} ms` : "—"}
          change={`${history.length} sample${history.length === 1 ? "" : "s"}`}
          tone="primary"
        />
        <StatCard
          icon={Database}
          label="Database"
          value={dbService ? statusLabel[dbService.status] || dbService.status : "—"}
          change={
            dbService
              ? `${dbService.latency_ms} ms${activeDb ? ` · ${activeDb}` : ""}`
              : ""
          }
          tone={dbService?.status === "online" ? "success" : "danger"}
        />
        <StatCard
          icon={Users}
          label="Available responders"
          value={status ? String(status.available_responders ?? 0) : "—"}
          change={`${onlineCount}/${services.length} services online`}
          tone="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground">Round-trip latency (ms)</h3>
          <p className="text-sm text-foreground/60">
            Browser → API status check, sampled every {POLL_MS / 1000}s while this page is open.
          </p>
          <div className="mt-6 flex h-60 items-end gap-3">
            {history.length === 0 ? (
              <p className="text-sm text-foreground/60">Waiting for samples…</p>
            ) : (
              history.map((point, index) => (
                <div key={`${point.time}-${index}`} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className="w-full rounded-full bg-gradient-to-t from-primary/10 via-primary/30 to-primary/40"
                    style={{ height: `${Math.max(8, (point.latency / maxLatency) * 180)}px` }}
                  />
                  <p className="text-xs font-medium text-foreground/60">{point.time}</p>
                  <p className="text-xs font-semibold text-foreground">{point.latency} ms</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground">Service status</h3>
          <div className="mt-4 space-y-3 text-sm">
            {services.length === 0 && <p className="text-foreground/60">No data yet.</p>}
            {services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-foreground">{service.name}</p>
                  <p className="text-xs text-foreground/60">
                    {service.latency_ms} ms{service.error ? ` · ${service.error}` : ""}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    statusTone[service.status] || statusTone.offline
                  }`}
                >
                  {statusLabel[service.status] || service.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
