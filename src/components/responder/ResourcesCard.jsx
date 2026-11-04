import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Package } from "lucide-react";
import nodeApi from "../../services/nodeApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useChartTheme } from "@/lib/chartTheme";

// /resources/summary returns { category, quantity, hospital_name } rows.
const labelFor = (category) => {
  const value = String(category || "").trim();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Uncategorized";
};
const MAX_CENTERS = 8;
const MAX_CATEGORIES = 5; // the palette's validated range; extras fold into "Other"

/**
 * Stock by center as stacked horizontal bars (one row per center, one
 * segment per resource category). Replaces a donut + a pie per center.
 */
const ResourcesCard = () => {
  const chart = useChartTheme();
  const [state, setState] = useState({ status: "loading", rows: [] });

  const load = () => {
    setState((s) => ({ ...s, status: "loading" }));
    nodeApi
      .get("/resources/summary")
      .then(({ data }) => setState({ status: "ready", rows: data?.data || [] }))
      .catch(() => setState({ status: "error", rows: [] }));
  };
  useEffect(load, []);

  const { categories, centers, totals } = useMemo(() => {
    const totalsByCat = {};
    state.rows.forEach(({ category, quantity }) => {
      const c = labelFor(category);
      totalsByCat[c] = (totalsByCat[c] || 0) + Number(quantity || 0);
    });
    // Stable category order: largest first, folding the tail into "Other".
    const ranked = Object.entries(totalsByCat).sort((a, b) => b[1] - a[1]).map(([c]) => c);
    const kept = ranked.slice(0, MAX_CATEGORIES);
    const bucket = (c) => (kept.includes(c) ? c : "Other");
    const cats = ranked.length > MAX_CATEGORIES ? [...kept, "Other"] : kept;

    const byCenter = {};
    state.rows.forEach(({ category, quantity, hospital_name }) => {
      const name = hospital_name?.trim() || "Unassigned";
      byCenter[name] = byCenter[name] || { name, total: 0 };
      const c = bucket(labelFor(category));
      byCenter[name][c] = (byCenter[name][c] || 0) + Number(quantity || 0);
      byCenter[name].total += Number(quantity || 0);
    });
    const sorted = Object.values(byCenter).sort((a, b) => b.total - a.total);
    const top = sorted.slice(0, MAX_CENTERS);
    const rest = sorted.slice(MAX_CENTERS);
    if (rest.length) {
      const other = { name: `${rest.length} other centers`, total: 0 };
      rest.forEach((center) => cats.forEach((c) => {
        other[c] = (other[c] || 0) + (center[c] || 0);
        other.total += center[c] || 0;
      }));
      top.push(other);
    }
    return { categories: cats, centers: top, totals: totalsByCat };
  }, [state.rows]);

  const grand = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resources by center</CardTitle>
        {grand > 0 && <CardDescription className="tabular">{grand.toLocaleString()} units in stock</CardDescription>}
      </CardHeader>
      <CardContent>
        {state.status === "loading" ? (
          <Skeleton className="h-64" />
        ) : state.status === "error" ? (
          <ErrorState compact title="Couldn't load resources" onRetry={load} />
        ) : centers.length === 0 ? (
          <EmptyState compact icon={Package} title="No resources recorded yet" />
        ) : (
          <div style={{ height: Math.max(220, centers.length * 44 + 80) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={centers} layout="vertical" margin={{ left: 8, right: 16 }} barCategoryGap={10}>
                <CartesianGrid {...chart.gridProps} horizontal={false} vertical />
                <XAxis type="number" {...chart.axisProps} tickFormatter={(v) => v.toLocaleString()} />
                <YAxis type="category" dataKey="name" width={170} {...chart.axisProps} tick={{ ...chart.axisProps.tick, width: 160 }} />
                <Tooltip {...chart.tooltipProps} formatter={(value, name) => [`${Number(value).toLocaleString()} units`, name]} />
                <Legend {...chart.legendProps} />
                {categories.map((c, i) => (
                  <Bar
                    key={c}
                    dataKey={c}
                    stackId="stock"
                    fill={c === "Other" ? chart.status.neutral : chart.seriesColor(i)}
                    stroke={chart.surface}
                    strokeWidth={2}
                    radius={i === categories.length - 1 ? [0, 4, 4, 0] : 0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResourcesCard;
