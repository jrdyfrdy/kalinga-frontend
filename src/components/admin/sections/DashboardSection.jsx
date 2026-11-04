import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  CircleDot,
  Clock3,
  Headphones,
  Loader2,
  Package,
  Radio,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserCheck,
  Users,
  Waves,
} from "lucide-react";
import { SectionHeader } from "../SectionHeader";
import { StatCard } from "../StatCard";
import { formatRelativeTime } from "@/lib/datetime";
import adminService from "../../../services/adminService";

const INCIDENT_FEED_ENDPOINT =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";

const statusPills = {
  Mitigating:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Coordinating:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  Contained:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

export const DashboardSection = () => {
  // Backend dashboard stats
  const [dashboardStats, setDashboardStats] = useState(null);
  const [backendIncidents, setBackendIncidents] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  // USGS incident feed (existing)
  const [incidentFeed, setIncidentFeed] = useState({
    items: [],
    fetchedAt: null,
    status: "idle",
  });

  // Fetch backend statistics
  const fetchDashboardStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [stats, incidents, notifications] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getIncidents({ include_resolved: false }),
        adminService.getNotifications().catch(() => []),
      ]);
      setDashboardStats(stats);
      setBackendIncidents(incidents || []);
      setRecentNotifications(notifications || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Dynamic Trends
  const dynamicTrends = useMemo(() => {
    if (!backendIncidents || backendIncidents.length === 0) return [];
    const typeCounts = backendIncidents.reduce((acc, inc) => {
      const t = inc.type || "Other";
      const clean = t.toLowerCase().includes("fire")
        ? "Fire"
        : t.toLowerCase().includes("flood")
          ? "Flood"
          : t.toLowerCase().includes("medical") ||
              t.toLowerCase().includes("accident")
            ? "Medical"
            : t.toLowerCase().includes("earth")
              ? "Earthquake"
              : t.toLowerCase().includes("typhoon")
                ? "Typhoon"
                : "Other";
      acc[clean] = (acc[clean] || 0) + 1;
      return acc;
    }, {});

    if (Object.keys(typeCounts).length === 0) return [];

    const maxCount = Math.max(...Object.values(typeCounts), 1);
    return Object.entries(typeCounts)
      .map(([label, count]) => ({
        label,
        value: count,
        percent: Math.max((count / maxCount) * 100, 15),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [backendIncidents]);

  // Dynamic Ops Timeline
  const dynamicTimeline = useMemo(() => {
    if (!backendIncidents || backendIncidents.length === 0) return [];
    return backendIncidents
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 4)
      .map((inc) => ({
        time: new Date(inc.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        title: inc.type || "Reported Incident",
        by: inc.reporter?.name || "System",
        status: inc.status
          ? `Status: ${inc.status.charAt(0).toUpperCase() + inc.status.slice(1)}`
          : "Pending",
      }));
  }, [backendIncidents]);

  // Dynamic Team Readiness
  const dynamicTeamReadiness = useMemo(() => {
    if (!dashboardStats?.responders) return [];
    const statusObj = dashboardStats.responders.byStatus || {};
    const total = dashboardStats.responders.total || 1;
    const readyObj = (key) => ({
      readiness: Math.round(((statusObj[key] || 0) / total) * 100) || 0,
      onCall: statusObj[key] || 0,
    });

    const busyCount = (statusObj.busy || 0) + (statusObj.offline || 0);
    const busyReadiness = total > 0 ? Math.round((busyCount / total) * 100) : 0;

    return [
      {
        label: "Available",
        readiness: readyObj("available").readiness,
        onCall: readyObj("available").onCall,
      },
      {
        label: "On Scene",
        readiness: readyObj("on_scene").readiness,
        onCall: readyObj("on_scene").onCall,
      },
      {
        label: "En Route",
        readiness: readyObj("en_route").readiness,
        onCall: readyObj("en_route").onCall,
      },
      { label: "Busy / Offline", readiness: busyReadiness, onCall: busyCount },
    ];
  }, [dashboardStats]);

  // Dynamic Dispatch Queue -> Recent Broadcasts
  const dynamicDispatchQueue = useMemo(() => {
    if (!recentNotifications || recentNotifications.length === 0) return [];
    return recentNotifications.slice(0, 3).map((n) => ({
      channel: `${(n.type || "Alert").charAt(0).toUpperCase() + (n.type || "alert").slice(1)} Broadcast`,
      status: "Sent",
      note: n.title || "No subject",
    }));
  }, [recentNotifications]);

  // Dynamic SLA Stats
  const dynamicSlaStats = useMemo(() => {
    if (!backendIncidents || backendIncidents.length === 0) return null;

    // Look for incidents that have progressed beyond just "reported"
    const dispatchedIncs = backendIncidents.filter((i) =>
      ["dispatching", "en_route", "on_scene", "resolved"].includes(
        i.status?.toLowerCase(),
      ),
    );

    if (dispatchedIncs.length === 0) return null;

    // Minutes from report to the latest status change; skip malformed dates.
    const times = dispatchedIncs
      .map((i) => {
        const start = new Date(i.created_at).getTime();
        const end = new Date(i.updated_at || i.created_at).getTime();
        return (end - start) / 60000;
      })
      .filter((m) => Number.isFinite(m) && m >= 0)
      .sort((a, b) => a - b);

    if (times.length === 0) return null;

    const mid = Math.floor(times.length / 2);
    const median = times.length % 2 ? times[mid] : (times[mid - 1] + times[mid]) / 2;

    return {
      median: Math.max(1, Math.round(median)),
      fastest: Math.max(1, Math.round(times[0])),
      slowest: Math.max(1, Math.round(times[times.length - 1])),
      sample: times.length,
    };
  }, [backendIncidents]);


  // Initial fetch and periodic refresh of backend data
  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 30_000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchDashboardStats]);

  // USGS feed fetch (existing logic)

  useEffect(() => {
    let ignore = false;

    const fetchIncidents = async () => {
      setIncidentFeed((prev) => ({
        ...prev,
        status: prev.status === "success" ? "refreshing" : "loading",
      }));

      try {
        const response = await fetch(INCIDENT_FEED_ENDPOINT);
        if (!response.ok) {
          throw new Error(`USGS feed returned ${response.status}`);
        }

        const payload = await response.json();
        const features = Array.isArray(payload?.features)
          ? payload.features.slice(0, 5)
          : [];

        if (!ignore) {
          if (features.length) {
            const mapped = features.map((feature, idx) => {
              const magnitude = feature?.properties?.mag ?? 0;
              const place = feature?.properties?.place ?? "Unverified location";
              const timestamp = feature?.properties?.time
                ? new Date(feature.properties.time)
                : new Date();

              const severity =
                magnitude >= 5.5
                  ? "Severe"
                  : magnitude >= 4.5
                    ? "High"
                    : magnitude >= 3.5
                      ? "Moderate"
                      : "Minor";

              const status =
                severity === "Severe" || severity === "High"
                  ? "Mitigating"
                  : severity === "Moderate"
                    ? "Coordinating"
                    : "Contained";

              return {
                id: feature?.id ?? `USGS-${idx}`,
                type: feature?.properties?.title ?? "Seismic Activity",
                barangay: place,
                teams: Math.max(1, Math.round(magnitude * 1.5)) || 1,
                status,
                severity,
                timeAgo: formatRelativeTime(timestamp),
              };
            });

            setIncidentFeed({
              items: mapped,
              fetchedAt: new Date(),
              status: "success",
            });
          } else {
            setIncidentFeed({
              items: [],
              fetchedAt: new Date(),
              status: "success",
            });
          }
        }
      } catch (error) {
        if (ignore) return;
        console.error("Failed to fetch USGS incidents", error);
        setIncidentFeed((prev) => ({
          ...prev,
          status: "error",
        }));
      }
    };

    fetchIncidents();
    const interval = setInterval(fetchIncidents, 60_000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  const incidents = incidentFeed.items ?? [];
  const incidentsLength = incidents.length;

  const activeIncidents = useMemo(
    () => incidents.filter((item) => item.status !== "Contained").length,
    [incidents],
  );

  const incidentSummary = useMemo(() => {
    if (incidentFeed.status === "loading" && !incidentFeed.fetchedAt) {
      return {
        change: undefined,
        trend: "up",
        tone: "neutral",
      };
    }

    if (incidentFeed.status === "error") {
      return {
        change: "using cached data",
        trend: "down",
        tone: "warning",
      };
    }

    const delta = incidentsLength - 0;

    if (!incidentFeed.fetchedAt) {
      return {
        change: "monitoring feed",
        trend: "up",
        tone: "primary",
      };
    }

    if (delta === 0) {
      return {
        change: "steady vs baseline",
        trend: "up",
        tone: "neutral",
      };
    }

    return {
      change: `${delta > 0 ? "+" : ""}${delta} vs baseline`,
      trend: delta > 0 ? "up" : "down",
      tone: delta > 0 ? "warning" : "success",
    };
  }, [incidentFeed.status, incidentFeed.fetchedAt, incidentsLength]);

  const updatedLabel = useMemo(() => {
    if (incidentFeed.status === "loading" && !incidentFeed.fetchedAt) {
      return "Syncing live feed…";
    }
    if (incidentFeed.status === "error") {
      return "Feed unavailable — showing cached data";
    }
    if (!incidentFeed.fetchedAt) {
      return "Live monitoring";
    }
    return `Updated ${formatRelativeTime(incidentFeed.fetchedAt, {
      short: true,
    })}`;
  }, [incidentFeed.status, incidentFeed.fetchedAt]);

  return (
    <div className="space-y-10">
      <SectionHeader
        title="Command Center Dashboard"
        description="Monitor live incidents, operational tempo, and resource readiness across the municipality."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardStats}
              disabled={statsLoading}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/60 px-3 py-1 text-xs text-muted-foreground hover:bg-primary/10 transition"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${statsLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/60 px-3 py-1 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              {updatedLabel}
            </span>
          </div>
        }
      />

      {/* Primary Stats from Backend */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Active Incidents"
          value={
            statsLoading && !dashboardStats
              ? "…"
              : String(
                  dashboardStats?.incidents?.active ??
                    backendIncidents.length ??
                    activeIncidents,
                )
          }
          change={
            dashboardStats?.incidents?.todayCount
              ? `${dashboardStats.incidents.todayCount} today`
              : incidentSummary.change
          }
          trend={incidentSummary.trend}
          tone={dashboardStats?.incidents?.active > 5 ? "warning" : "primary"}
        />
        <StatCard
          icon={Users}
          label="Responders Available"
          value={
            statsLoading && !dashboardStats
              ? "…"
              : String(dashboardStats?.responders?.available ?? "—")
          }
          change={
            dashboardStats?.responders?.busy
              ? `${dashboardStats.responders.busy} on assignment`
              : "+8 deployed"
          }
          tone="primary"
        />
        <StatCard
          icon={ShieldCheck}
          label="Total Users"
          value={
            statsLoading && !dashboardStats
              ? "…"
              : String(dashboardStats?.users?.total ?? "—")
          }
          change={
            dashboardStats?.users?.active
              ? `${dashboardStats.users.active} active`
              : "steady"
          }
          tone="success"
        />
        <StatCard
          icon={Package}
          label="Low Stock Alerts"
          value={
            statsLoading && !dashboardStats
              ? "…"
              : String(dashboardStats?.resources?.lowStock ?? 0)
          }
          change={
            dashboardStats?.resources?.critical
              ? `${dashboardStats.resources.critical} critical`
              : "monitoring"
          }
          trend={dashboardStats?.resources?.lowStock > 0 ? "up" : "down"}
          tone={dashboardStats?.resources?.lowStock > 0 ? "warning" : "success"}
        />
      </div>

      {/* Secondary Stats Row */}
      {dashboardStats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10">
              <UserCheck className="h-6 w-6 text-sky-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {dashboardStats.responders?.total ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Total Responders</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {dashboardStats.users?.byRole?.patient ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Registered Patients</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <Truck className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {dashboardStats.users?.byRole?.logistics ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Logistics Staff</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <Package className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {dashboardStats.resources?.total ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Total Resources</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Incident Signal Trend
              </h3>
              <p className="text-sm text-muted-foreground">
                Alert frequency in the past 24 hours across major hazard
                categories.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <CircleDot className="h-3.5 w-3.5" /> Recent
            </span>
          </div>

          <div className="mt-6 flex h-64 items-end justify-between gap-3">
            {dynamicTrends && dynamicTrends.length > 0 ? (
              dynamicTrends.map((item) => (
                <div
                  key={item.label}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                >
                  <div
                    className="flex w-full flex-col items-center justify-end gap-2 rounded-xl bg-gradient-to-t from-primary/10 via-primary/20 to-primary/30 p-2"
                    style={{
                      height: `${item.percent || Math.max(item.value, 25)}%`,
                    }}
                  >
                    <span className="text-sm font-semibold text-primary/80">
                      {item.value}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {item.label}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-center text-muted-foreground">
                <Activity className="mb-2 h-8 w-8 opacity-20" />
                <p className="text-sm font-medium">No recent incidents</p>
                <p className="text-xs">Incident trend data will appear here.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
            <p className="text-sm font-medium text-muted-foreground">Median response time</p>
            <p className="tabular mt-2 text-3xl font-bold text-foreground">
              {dynamicSlaStats ? `${dynamicSlaStats.median} min` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              From report to the latest dispatch update
              {dynamicSlaStats ? `, across ${dynamicSlaStats.sample} dispatched incident${dynamicSlaStats.sample === 1 ? "" : "s"}.` : "."}
            </p>
            {dynamicSlaStats ? (
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-surface-2/60 p-3">
                  <dt className="text-xs text-muted-foreground">Fastest</dt>
                  <dd className="tabular mt-0.5 font-semibold">{dynamicSlaStats.fastest} min</dd>
                </div>
                <div className="rounded-lg bg-surface-2/60 p-3">
                  <dt className="text-xs text-muted-foreground">Slowest</dt>
                  <dd className="tabular mt-0.5 font-semibold">{dynamicSlaStats.slowest} min</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 rounded-lg bg-surface-2/60 p-3 text-xs text-muted-foreground">
                Not enough dispatched incidents yet to measure response time.
              </p>
            )}
          </div>

        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              System Incidents
            </h3>
            <p className="text-sm text-muted-foreground">
              Active incidents from the Kalinga system database.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold text-primary">
            <Activity className="h-3.5 w-3.5" /> Live from Backend
          </span>
        </div>
        {statsLoading && backendIncidents.length === 0 ? (
          <div className="mt-6 flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : backendIncidents.length === 0 ? (
          <div className="mt-6 py-8 text-center text-sm text-muted-foreground">
            No active incidents in the system
          </div>
        ) : (
          <div className="mt-6 divide-y divide-border/60 text-sm">
            {backendIncidents.slice(0, 5).map((incident) => {
              const statusColors = {
                reported:
                  "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
                acknowledged:
                  "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                en_route:
                  "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                transporting:
                  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300",
                on_scene:
                  "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
                resolved:
                  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
              };
              const statusTone =
                statusColors[incident.status] ?? "bg-primary/10 text-primary";

              return (
                <div
                  key={incident.id}
                  className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {incident.type || "Emergency Incident"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      INC-{incident.id} •{" "}
                      {incident.location || "Location pending"}
                    </p>
                  </div>
                  <div className="flex flex-col justify-between gap-2 text-xs text-muted-foreground md:flex-row md:items-center md:gap-6">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      {incident.assignments?.length || 0} responder
                      {incident.assignments?.length !== 1 ? "s" : ""} assigned
                    </div>
                    {incident.latest_status_update && (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        Last update by{" "}
                        {incident.latest_status_update.user?.name || "System"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusTone}`}
                    >
                      {incident.status?.replace("_", " ")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(new Date(incident.created_at))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {backendIncidents.length > 5 && (
          <p className="mt-4 text-xs text-muted-foreground">
            Showing 5 of {backendIncidents.length} active incidents
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              External Seismic Feed
            </h3>
            <p className="text-sm text-muted-foreground">
              Live earthquake data from USGS for situational awareness.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1 text-xs font-semibold text-emerald-500">
            <BarChart2 className="h-3.5 w-3.5" /> Auto-refreshing
          </span>
        </div>
        <div className="mt-6 divide-y divide-border/60 text-sm">
          {incidents.map((incident) => {
            const statusTone =
              statusPills[incident.status] ?? "bg-primary/10 text-primary";
            return (
              <div
                key={incident.id}
                className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {incident.type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {incident.id} • {incident.barangay}
                  </p>
                </div>
                <div className="flex flex-col justify-between gap-2 text-xs text-muted-foreground md:flex-row md:items-center md:gap-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" /> {incident.teams} teams
                    on-site
                  </div>
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Severity:{" "}
                    <span className="font-semibold text-muted-foreground">
                      {incident.severity}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}
                  >
                    {incident.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {incident.timeAgo}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Data source: USGS Earthquake Hazards Program.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Operations timeline
              </h3>
              <p className="text-sm text-muted-foreground">
                Key actions logged within the selected window.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {dynamicTimeline && dynamicTimeline.length > 0 ? (
              dynamicTimeline.map((event, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-1 rounded-xl border border-border bg-surface-2/60 p-4">
                    <p className="text-sm font-semibold text-foreground">
                      {event.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.by}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {event.status}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border bg-surface-2/60 text-sm text-muted-foreground">
                No recent operations
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
            <h3 className="text-lg font-semibold text-foreground">
              Team readiness
            </h3>
            <p className="text-sm text-muted-foreground">
              Availability & standby strength.
            </p>
            <div className="mt-4 space-y-3 text-sm">
              {dynamicTeamReadiness && dynamicTeamReadiness.length > 0 ? (
                dynamicTeamReadiness.map((team) => (
                  <div
                    key={team.label}
                    className="space-y-2 rounded-xl border border-border bg-surface-2/60 p-4"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {team.label}
                      </span>
                      <span>{team.onCall} counts</span>
                    </div>
                    <div className="h-2 rounded-full bg-foreground/10">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${team.readiness}%` }}
                      />
                    </div>
                    <div className="text-xs font-semibold text-primary">
                      {team.readiness}% total
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border bg-surface-2/60 text-sm text-muted-foreground">
                  No readiness data available
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
            <h3 className="text-lg font-semibold text-foreground">
              Comms & dispatch
            </h3>
            <p className="text-sm text-muted-foreground">
              Recent Broadcasts & Advisories.
            </p>
            <div className="mt-4 space-y-3 text-sm">
              {dynamicDispatchQueue && dynamicDispatchQueue.length > 0 ? (
                dynamicDispatchQueue.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/60 p-4"
                  >
                    <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Radio className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">
                        {entry.channel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status: {entry.status}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.note}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border bg-surface-2/60 text-sm text-muted-foreground">
                  No recent communications
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
