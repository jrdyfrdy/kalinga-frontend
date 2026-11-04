import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import nodeApi from "../../services/nodeApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Skeleton,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const LEVELS = [
  { key: "low", label: "Low", dot: "bg-success" },
  { key: "medium", label: "Medium", dot: "bg-info" },
  { key: "high", label: "High", dot: "bg-warning", tint: "bg-warning-subtle text-warning-subtle-foreground" },
  { key: "veryHigh", label: "Very high", dot: "bg-orange-500", tint: "bg-warning-subtle text-warning-subtle-foreground" },
  { key: "critical", label: "Critical", dot: "bg-critical", tint: "bg-critical-subtle text-critical-subtle-foreground font-semibold" },
];

/** Patients by triage level per DOH hospital, refreshed every 30 s. */
const TriageCard = () => {
  const [state, setState] = useState({ status: "loading", rows: [] });

  useEffect(() => {
    let cancelled = false;
    const fetchTriage = () =>
      nodeApi
        .get("/triage/stats")
        .then(({ data }) => {
          if (cancelled) return;
          setState({
            status: "ready",
            rows: (data?.data || []).map((h) => ({
              hospital: h.hospital_name,
              low: h.low || 0,
              medium: h.medium || 0,
              high: h.high || 0,
              veryHigh: h.very_high || 0,
              critical: h.critical || 0,
            })),
          });
        })
        .catch(() => !cancelled && setState((s) => ({ ...s, status: s.rows.length ? "ready" : "error" })));
    fetchTriage();
    const interval = setInterval(fetchTriage, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>DOH hospital triage</CardTitle>
        <CardDescription>Patients waiting by triage level · updates every 30 seconds</CardDescription>
      </CardHeader>
      <CardContent>
        {state.status === "loading" ? (
          <Skeleton className="h-40" />
        ) : state.status === "error" ? (
          <ErrorState compact title="Couldn't load triage data" />
        ) : state.rows.length === 0 ? (
          <EmptyState compact icon={Activity} title="No triage data yet" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Hospital</TH>
                {LEVELS.map((l) => (
                  <TH key={l.key} className="text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cn("size-2 rounded-full", l.dot)} aria-hidden="true" />
                      {l.label}
                    </span>
                  </TH>
                ))}
              </tr>
            </THead>
            <TBody>
              {state.rows.map((row) => (
                <TR key={row.hospital}>
                  <TD className="font-medium">{row.hospital}</TD>
                  {LEVELS.map((l) => (
                    <TD key={l.key} className="text-right">
                      <span className={cn("tabular inline-block min-w-8 rounded-md px-2 py-0.5 text-center", row[l.key] > 0 && l.tint)}>
                        {row[l.key]}
                      </span>
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TriageCard;
