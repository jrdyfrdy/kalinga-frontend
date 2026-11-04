import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  Clock,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  FlaskConical,
  MapPin,
  MessageSquare,
  Navigation,
  Siren,
  Sun,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../hooks/useNotifications";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Page,
  Skeleton,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const WEATHER_CODES = {
  0: ["Clear sky", Sun],
  1: ["Mainly clear", CloudSun],
  2: ["Partly cloudy", CloudSun],
  3: ["Overcast", Cloud],
  45: ["Fog", CloudFog],
  48: ["Rime fog", CloudFog],
  51: ["Light drizzle", CloudDrizzle],
  53: ["Drizzle", CloudDrizzle],
  55: ["Dense drizzle", CloudDrizzle],
  61: ["Slight rain", CloudRain],
  63: ["Rain", CloudRain],
  65: ["Heavy rain", CloudRain],
  80: ["Rain showers", CloudRain],
  81: ["Rain showers", CloudRain],
  82: ["Violent rain showers", CloudRain],
  95: ["Thunderstorm", CloudLightning],
  96: ["Thunderstorm with hail", CloudLightning],
  99: ["Severe thunderstorm", CloudLightning],
};

const dateLabel = (value, opts = { month: "short", day: "numeric", year: "numeric" }) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-PH", opts) : "—";
};

const greetingFor = (hour) => (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

/* ---------------------------------------------------------------- widgets */

function WeatherCard() {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    let cancelled = false;
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=14.5995&longitude=120.9842&current=temperature_2m,weathercode&timezone=Asia%2FManila",
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json) => !cancelled && setState({ status: "ready", data: json.current }))
      .catch(() => !cancelled && setState({ status: "error", data: null }));
    return () => {
      cancelled = true;
    };
  }, []);

  const [label, Icon] = WEATHER_CODES[state.data?.weathercode] || ["Cloudy", Cloud];

  return (
    <Card>
      <CardHeader
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/patient/weather">Details</Link>
          </Button>
        }
      >
        <CardTitle>Weather · Manila</CardTitle>
      </CardHeader>
      <CardContent>
        {state.status === "loading" ? (
          <Skeleton className="h-14" />
        ) : state.status === "error" ? (
          <p className="text-sm text-muted-foreground">Weather is unavailable right now.</p>
        ) : (
          <div className="flex items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-xl bg-info-subtle text-info">
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="tabular text-2xl font-bold">{Math.round(state.data.temperature_2m)}°C</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationsCard() {
  const { notifications, loading } = useNotifications({ limit: 5 });
  const recent = useMemo(() => notifications.slice(0, 3), [notifications]);

  return (
    <Card>
      <CardHeader
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/patient/notifications">See all</Link>
          </Button>
        }
      >
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && recent.length === 0 ? (
          <div className="space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : recent.length === 0 ? (
          <EmptyState compact icon={Bell} title="You're all caught up" />
        ) : (
          <ul className="space-y-1">
            {recent.map((n) => (
              <li key={n.id} className="flex gap-3 rounded-lg p-2">
                <span
                  className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-border" : "bg-primary")}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className={cn("truncate text-sm", n.read_at ? "font-medium" : "font-semibold")}>{n.title}</p>
                  {n.description && <p className="line-clamp-2 text-sm text-muted-foreground">{n.description}</p>}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AppointmentCard() {
  const [state, setState] = useState({ status: "loading", next: null });

  useEffect(() => {
    let cancelled = false;
    api
      .get("/appointments")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        const next = list
          .filter((a) => String(a.status).toLowerCase() === "upcoming")
          .sort((a, b) => new Date(a.appointment_at) - new Date(b.appointment_at))[0];
        if (!cancelled) setState({ status: "ready", next: next || null });
      })
      .catch(() => !cancelled && setState({ status: "error", next: null }));
    return () => {
      cancelled = true;
    };
  }, []);

  const date = state.next ? new Date(state.next.appointment_at) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next appointment</CardTitle>
      </CardHeader>
      <CardContent>
        {state.status === "loading" ? (
          <Skeleton className="h-16" />
        ) : !state.next ? (
          <EmptyState
            compact
            icon={CalendarDays}
            title="No upcoming appointments"
            action={
              <Button asChild size="sm" variant="outline">
                <Link to="/patient/appointments">Book a visit</Link>
              </Button>
            }
          />
        ) : (
          <Link
            to="/patient/appointments"
            className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-surface-2"
          >
            <span className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-primary-subtle py-1.5 text-primary">
              <span className="text-xs font-semibold uppercase">{date.toLocaleDateString("en-PH", { month: "short" })}</span>
              <span className="tabular text-xl font-bold leading-none">{date.getDate()}</span>
            </span>
            <span className="min-w-0 space-y-0.5">
              <span className="block truncate text-sm font-semibold">{state.next.hospital}</span>
              <span className="block truncate text-sm text-muted-foreground">{state.next.service}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3.5" aria-hidden="true" />
                {date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}
              </span>
            </span>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function CareReportsCard() {
  const [state, setState] = useState({ status: "loading", rows: [] });

  const load = () => {
    setState((s) => ({ ...s, status: "loading" }));
    api
      .get("/my-patient-care-reports")
      .then((res) => {
        const rows = (res.data?.data || []).slice(0, 5).map((report) => {
          const vital = report.vitals_entries?.[0] || {};
          const gcs = report.gcs_entries?.[0] || {};
          let mental = report.physiological_status?.mentalStatus;
          if (!mental && gcs.eyes) {
            mental = `GCS ${parseInt(gcs.eyes) + parseInt(gcs.verbal || 0) + parseInt(gcs.motor || 0)}`;
          }
          return {
            id: report.case_no || `PCR-${report.id}`,
            date: report.dispatch_date || report.submitted_at || report.created_at,
            complaint: report.noi_moi?.chiefComplaint || "—",
            vitals: [vital.temp && `${vital.temp}°C`, vital.pulse && `${vital.pulse} bpm`, vital.spo2 && `SpO₂ ${vital.spo2}%`]
              .filter(Boolean)
              .join(" · "),
            mental: mental || "—",
            level: report.patient_details?.priorityLevel,
            responder: report.user?.name || "Responder",
          };
        });
        setState({ status: "ready", rows });
      })
      .catch(() => setState({ status: "error", rows: [] }));
  };

  useEffect(load, []);

  return (
    <Card>
      <CardHeader
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/patient/health-records">View records</Link>
          </Button>
        }
      >
        <CardTitle>Recent care reports</CardTitle>
      </CardHeader>
      <CardContent>
        {state.status === "loading" ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : state.status === "error" ? (
          <ErrorState compact title="Couldn't load your care reports" onRetry={load} />
        ) : state.rows.length === 0 ? (
          <EmptyState
            compact
            icon={Activity}
            title="No care reports yet"
            description="When a responder treats you, their report appears here."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Case</TH>
                <TH>Complaint</TH>
                <TH className="hidden md:table-cell">Vitals</TH>
                <TH>Priority</TH>
              </tr>
            </THead>
            <TBody>
              {state.rows.map((row) => (
                <TR key={row.id}>
                  <TD>
                    <p className="font-medium">{row.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {dateLabel(row.date)} · {row.responder}
                    </p>
                  </TD>
                  <TD className="max-w-48 truncate">{row.complaint}</TD>
                  <TD className="tabular hidden text-muted-foreground md:table-cell">{row.vitals || "—"}</TD>
                  <TD>{row.level ? <StatusBadge status={row.level} /> : "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function LabResultsCard() {
  const [state, setState] = useState({ status: "loading", rows: [] });

  const load = () => {
    setState((s) => ({ ...s, status: "loading" }));
    api
      .get("/lab-results", { params: { sort_by: "Descending" } })
      .then((res) => setState({ status: "ready", rows: (Array.isArray(res.data) ? res.data : []).slice(0, 5) }))
      .catch(() => setState({ status: "error", rows: [] }));
  };

  useEffect(load, []);

  return (
    <Card>
      <CardHeader
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/patient/health-records">All results</Link>
          </Button>
        }
      >
        <CardTitle>Latest lab results</CardTitle>
      </CardHeader>
      <CardContent>
        {state.status === "loading" ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : state.status === "error" ? (
          <ErrorState compact title="Couldn't load lab results" onRetry={load} />
        ) : state.rows.length === 0 ? (
          <EmptyState compact icon={FlaskConical} title="No lab results yet" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Lab no.</TH>
                <TH>Type</TH>
                <TH className="hidden sm:table-cell">Branch</TH>
                <TH className="text-right">Ordered</TH>
              </tr>
            </THead>
            <TBody>
              {state.rows.map((r) => (
                <TR key={r.id ?? r.lab_no}>
                  <TD className="font-medium">{r.lab_no}</TD>
                  <TD>
                    <Badge tone="info">{r.type || "Lab"}</Badge>
                  </TD>
                  <TD className="hidden text-muted-foreground sm:table-cell">{r.branch || "—"}</TD>
                  <TD className="tabular text-right text-muted-foreground">{dateLabel(r.order_date)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------- page */

const QUICK_ACTIONS = [
  { to: "/patient/report-emergency", label: "Report an emergency", hint: "Request a responder now", icon: Siren, tone: "critical" },
  { to: "/patient/hospital-navigator", label: "Find a hospital", hint: "Nearest open facilities", icon: Navigation },
  { to: "/patient/messages", label: "Messages", hint: "Chat with your care team", icon: MessageSquare },
  { to: "/patient/evacuation-center", label: "Evacuation centers", hint: "Shelters near you", icon: MapPin },
];

export default function PatientDash() {
  const { user } = useAuth();
  const firstName = (user?.name || "").split(" ")[0];

  return (
    <Page>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {greetingFor(new Date().getHours())}
          {firstName ? `, ${firstName}` : ""}
        </h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_ACTIONS.map(({ to, label, hint, icon: Icon, tone }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "group flex items-center gap-3 rounded-xl border p-4 shadow-xs transition-shadow hover:shadow-md",
              tone === "critical" ? "border-critical/30 bg-critical-subtle" : "border-border bg-surface",
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                tone === "critical" ? "bg-critical text-critical-foreground" : "bg-primary-subtle text-primary",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block truncate text-xs text-muted-foreground">{hint}</span>
            </span>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <CareReportsCard />
          <LabResultsCard />
        </div>
        <div className="space-y-6">
          <AppointmentCard />
          <NotificationsCard />
          <WeatherCard />
        </div>
      </div>
    </Page>
  );
}
