import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import nodeApi from "../../services/nodeApi";
import { Card, CardContent, CardHeader, CardTitle, ErrorState, Skeleton } from "@/components/ui";

const SEGMENTS = [
  { key: "on_duty", label: "On duty", className: "bg-success" },
  { key: "standby", label: "Standby", className: "bg-warning" },
  { key: "off_duty", label: "Off duty", className: "bg-neutral-300 dark:bg-neutral-600" },
];

/** Responder availability as a segmented status bar (on duty / standby / off duty). */
const HealthRespondersCard = () => {
  const [state, setState] = useState({ status: "loading", stats: null });

  const load = () => {
    setState((s) => ({ ...s, status: "loading" }));
    nodeApi
      .get("/responders/stats")
      .then(({ data }) => {
        const d = data?.data || {};
        setState({ status: "ready", stats: { on_duty: d.on_duty ?? 0, standby: d.standby ?? 0, off_duty: d.off_duty ?? 0 } });
      })
      .catch(() => setState({ status: "error", stats: null }));
  };
  useEffect(load, []);

  const total = state.stats ? SEGMENTS.reduce((sum, s) => sum + state.stats[s.key], 0) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health responders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.status === "loading" ? (
          <Skeleton className="h-24" />
        ) : state.status === "error" ? (
          <ErrorState compact title="Couldn't load responder availability" onRetry={load} />
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <Users className="size-5 self-center text-muted-foreground" aria-hidden="true" />
              <span className="tabular text-3xl font-bold">{total}</span>
              <span className="text-sm text-muted-foreground">responders</span>
            </div>
            <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={SEGMENTS.map((s) => `${state.stats[s.key]} ${s.label.toLowerCase()}`).join(", ")}>
              {total > 0 &&
                SEGMENTS.map((s) =>
                  state.stats[s.key] > 0 ? (
                    <span key={s.key} className={s.className} style={{ width: `${(state.stats[s.key] / total) * 100}%` }} />
                  ) : null,
                )}
            </div>
            <dl className="grid grid-cols-3 gap-2">
              {SEGMENTS.map((s) => (
                <div key={s.key} className="rounded-lg bg-surface-2/60 p-3">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={`size-2 rounded-full ${s.className}`} aria-hidden="true" />
                    {s.label}
                  </dt>
                  <dd className="tabular mt-1 text-lg font-semibold">{state.stats[s.key]}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthRespondersCard;
