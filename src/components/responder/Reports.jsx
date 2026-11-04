import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Clock, Stethoscope } from "lucide-react";
import nodeApi from "../../services/nodeApi";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const occupancyTone = (pct) => (pct >= 90 ? "bg-critical" : pct >= 75 ? "bg-warning" : "bg-success");
const when = (value) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "";
};

function CapacityAlert({ alert }) {
  return (
    <li className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{alert.hospital_name}</p>
        {alert.severity && <StatusBadge status={alert.severity} />}
      </div>
      {alert.message && <p className="text-sm text-muted-foreground">{alert.message}</p>}
      {alert.occupancy != null && (
        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className={cn("h-full rounded-full", occupancyTone(alert.occupancy))} style={{ width: `${Math.min(100, alert.occupancy)}%` }} />
          </div>
          <p className="tabular text-xs text-muted-foreground">{alert.occupancy}% occupied</p>
        </div>
      )}
      {alert.action && (
        <p className="flex items-start gap-1.5 text-sm">
          <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
          {alert.action}
        </p>
      )}
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="size-3" aria-hidden="true" /> {when(alert.created_at)}
      </p>
    </li>
  );
}

function SpecialistAlert({ alert }) {
  return (
    <li className="space-y-1.5 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{alert.hospital_name}</p>
        {alert.status && <Badge tone="warning">{alert.status}</Badge>}
      </div>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Stethoscope className="size-3.5" aria-hidden="true" /> {alert.title}
      </p>
      {alert.action && (
        <p className="flex items-start gap-1.5 text-sm">
          <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
          {alert.action}
        </p>
      )}
    </li>
  );
}

/** DOH hospital capacity and specialist-availability alerts. */
const Reports = () => {
  const [state, setState] = useState({ status: "loading", capacity: [], specialist: [] });

  const load = () => {
    setState((s) => ({ ...s, status: "loading" }));
    nodeApi
      .get("/reports", { params: { limit: 20 } })
      .then(({ data }) => {
        const reports = data?.data || [];
        setState({
          status: "ready",
          capacity: reports.filter((r) => r.type === "capacity" || r.type === "supply" || !r.type),
          specialist: reports.filter((r) => r.type === "specialist"),
        });
      })
      .catch(() => setState({ status: "error", capacity: [], specialist: [] }));
  };
  useEffect(load, []);

  const list = (items, Item, emptyTitle) =>
    items.length === 0 ? (
      <EmptyState compact icon={AlertTriangle} title={emptyTitle} />
    ) : (
      <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
        {items.map((a) => (
          <Item key={a.id} alert={a} />
        ))}
      </ul>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>DOH hospital reports</CardTitle>
        <CardDescription>Capacity and specialist alerts</CardDescription>
      </CardHeader>
      <CardContent>
        {state.status === "loading" ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-24" />
          </div>
        ) : state.status === "error" ? (
          <ErrorState compact title="Couldn't load hospital reports" onRetry={load} />
        ) : (
          <Tabs defaultValue="capacity">
            <TabsList>
              <TabsTrigger value="capacity">
                Capacity <Badge tone={state.capacity.length ? "warning" : "neutral"}>{state.capacity.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="specialist">
                Specialists <Badge tone={state.specialist.length ? "warning" : "neutral"}>{state.specialist.length}</Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="capacity">{list(state.capacity, CapacityAlert, "No capacity alerts")}</TabsContent>
            <TabsContent value="specialist">{list(state.specialist, SpecialistAlert, "No specialist alerts")}</TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default Reports;
