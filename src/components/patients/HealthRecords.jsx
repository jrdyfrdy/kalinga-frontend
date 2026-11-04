import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, ChevronLeft, ChevronRight, FlaskConical } from "lucide-react";
import api from "../../services/api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Page,
  PageHeader,
  Select,
  Skeleton,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";

const PAGE_SIZE = 10;

const isoDay = (date) => date.toISOString().slice(0, 10);
const today = () => isoDay(new Date());
const oneYearAgo = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return isoDay(d);
};
const dateLabel = (value) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
    : "—";
};

function mapCareReport(report) {
  const vital = report.vitals_entries?.[0] || {};
  const gcs = report.gcs_entries?.[0] || {};
  let mental = report.physiological_status?.mentalStatus;
  if (!mental && gcs.eyes) {
    mental = `GCS ${parseInt(gcs.eyes) + parseInt(gcs.verbal || 0) + parseInt(gcs.motor || 0)}`;
  }
  return {
    id: report.case_no || `PCR-${report.id}`,
    date: report.dispatch_date || report.submitted_at || report.created_at,
    temp: vital.temp,
    hr: vital.pulse,
    spo2: vital.spo2,
    complaint: report.noi_moi?.chiefComplaint || "—",
    mental: mental || "—",
    level: report.patient_details?.priorityLevel,
    responder: report.user?.name || "Responder",
  };
}

function Filters({ from, to, sort, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="From">
        <Input type="date" value={from} max={to} onChange={(e) => onChange({ from: e.target.value })} />
      </Field>
      <Field label="To">
        <Input type="date" value={to} min={from} max={today()} onChange={(e) => onChange({ to: e.target.value })} />
      </Field>
      <Field label="Sort">
        <Select value={sort} onChange={(e) => onChange({ sort: e.target.value })}>
          <option value="Descending">Newest first</option>
          <option value="Ascending">Oldest first</option>
        </Select>
      </Field>
    </div>
  );
}

function Pager({ page, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-2 text-sm text-muted-foreground">
      <span className="tabular">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </span>
      <div className="flex gap-1">
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

const LoadingRows = () => (
  <div className="space-y-2">
    {[0, 1, 2].map((i) => (
      <Skeleton key={i} className="h-11" />
    ))}
  </div>
);

function CareReportsTab() {
  const [filters, setFilters] = useState({ from: oneYearAgo(), to: today(), sort: "Descending" });
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: "loading", rows: [] });

  const load = () => {
    setState((s) => ({ ...s, status: "loading" }));
    api
      .get("/my-patient-care-reports")
      .then((res) => setState({ status: "ready", rows: (res.data?.data || []).map(mapCareReport) }))
      .catch(() => setState({ status: "error", rows: [] }));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const from = new Date(`${filters.from}T00:00:00`);
    const to = new Date(`${filters.to}T23:59:59`);
    return state.rows
      .filter((r) => {
        const d = new Date(r.date);
        return Number.isNaN(d.getTime()) || (d >= from && d <= to);
      })
      .sort((a, b) => (filters.sort === "Ascending" ? 1 : -1) * (new Date(a.date) - new Date(b.date)));
  }, [state.rows, filters]);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <Filters {...filters} onChange={(patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); }} />
      {state.status === "loading" ? (
        <LoadingRows />
      ) : state.status === "error" ? (
        <ErrorState title="Couldn't load your care reports" onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No care reports in this period"
          description="Reports written by responders who treated you appear here. Try a wider date range."
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Case</TH>
                <TH>Date</TH>
                <TH>Chief complaint</TH>
                <TH className="text-right">Temp</TH>
                <TH className="text-right">HR</TH>
                <TH className="text-right">SpO₂</TH>
                <TH>Mental status</TH>
                <TH>Priority</TH>
                <TH>Responder</TH>
              </tr>
            </THead>
            <TBody>
              {pageRows.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.id}</TD>
                  <TD className="tabular whitespace-nowrap text-muted-foreground">{dateLabel(r.date)}</TD>
                  <TD className="max-w-56 truncate">{r.complaint}</TD>
                  <TD className="tabular text-right">{r.temp ? `${r.temp}°C` : "—"}</TD>
                  <TD className="tabular text-right">{r.hr ?? "—"}</TD>
                  <TD className="tabular text-right">{r.spo2 ? `${r.spo2}%` : "—"}</TD>
                  <TD>{r.mental}</TD>
                  <TD>{r.level ? <StatusBadge status={r.level} /> : "—"}</TD>
                  <TD className="whitespace-nowrap">{r.responder}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pager page={page} total={filtered.length} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function LabResultsTab() {
  const [filters, setFilters] = useState({ from: oneYearAgo(), to: today(), sort: "Descending" });
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: "loading", rows: [] });

  const load = () => {
    setState((s) => ({ ...s, status: "loading" }));
    api
      .get("/lab-results", { params: { date_from: filters.from, date_to: filters.to, sort_by: filters.sort } })
      .then((res) => setState({ status: "ready", rows: Array.isArray(res.data) ? res.data : res.data?.data || [] }))
      .catch(() => setState({ status: "error", rows: [] }));
  };
  useEffect(load, [filters]);

  const pageRows = state.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <Filters {...filters} onChange={(patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); }} />
      {state.status === "loading" ? (
        <LoadingRows />
      ) : state.status === "error" ? (
        <ErrorState title="Couldn't load lab results" onRetry={load} />
      ) : state.rows.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No lab results in this period" description="Try a wider date range." />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Lab no.</TH>
                <TH>Type</TH>
                <TH>Branch</TH>
                <TH>Ordered</TH>
                <TH>Patient ID</TH>
                <TH>Account</TH>
              </tr>
            </THead>
            <TBody>
              {pageRows.map((r) => (
                <TR key={r.id ?? r.lab_no}>
                  <TD className="font-medium">{r.lab_no}</TD>
                  <TD>
                    <Badge tone="info">{r.type || "Lab"}</Badge>
                  </TD>
                  <TD>{r.branch || "—"}</TD>
                  <TD className="tabular whitespace-nowrap text-muted-foreground">{dateLabel(r.order_date)}</TD>
                  <TD className="text-muted-foreground">{r.patient_id_text || "—"}</TD>
                  <TD className="text-muted-foreground">{r.account || "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pager page={page} total={state.rows.length} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export default function HealthRecords() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "lab" ? "lab" : "triage";

  return (
    <Page>
      <PageHeader title="Health records" description="Care reports from responders and your laboratory results." />
      <Tabs value={tab} onValueChange={(value) => setParams({ tab: value }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="triage">
            <Activity aria-hidden="true" /> Care reports
          </TabsTrigger>
          <TabsTrigger value="lab">
            <FlaskConical aria-hidden="true" /> Lab results
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Card className="p-4 sm:p-6">{tab === "triage" ? <CareReportsTab /> : <LabResultsTab />}</Card>
    </Page>
  );
}
