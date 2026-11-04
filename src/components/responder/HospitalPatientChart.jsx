import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import nodeApi from "../../services/nodeApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useChartTheme } from "@/lib/chartTheme";

/**
 * Patients across DOH hospitals by state. A short labelled bar list reads
 * faster than a donut and keeps every value visible (no colour-only legend).
 */
const HospitalPatientChart = () => {
  const chart = useChartTheme();
  const [state, setState] = useState({ status: "loading", rows: [] });

  const load = () => {
    setState((s) => ({ ...s, status: "loading" }));
    nodeApi
      .get("/hospitals/patient-distribution")
      .then(({ data }) => setState({ status: "ready", rows: Array.isArray(data?.data) ? data.data : [] }))
      .catch(() => setState({ status: "error", rows: [] }));
  };
  useEffect(load, []);

  const total = state.rows.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
  const max = Math.max(1, ...state.rows.map((r) => Number(r.value) || 0));
  const colorFor = (name, index) =>
    /critical/i.test(name) ? chart.status.critical : chart.seriesColor(index);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hospital patient distribution</CardTitle>
        {state.status === "ready" && total > 0 && (
          <CardDescription className="tabular">{total.toLocaleString()} patients across DOH hospitals</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {state.status === "loading" ? (
          <Skeleton className="h-32" />
        ) : state.status === "error" ? (
          <ErrorState compact title="Couldn't load patient distribution" onRetry={load} />
        ) : state.rows.length === 0 ? (
          <EmptyState compact icon={Building2} title="No patient data yet" />
        ) : (
          <ul className="space-y-3">
            {state.rows.map((row, i) => {
              const value = Number(row.value) || 0;
              return (
                <li key={row.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{row.name}</span>
                    <span className="tabular text-muted-foreground">
                      {value.toLocaleString()}
                      {total > 0 && <span className="ml-1.5 text-xs">({Math.round((value / total) * 100)}%)</span>}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: colorFor(row.name, i) }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default HospitalPatientChart;
