import { createElement, useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";

/**
 * Chart colours for Recharts (and anything else that needs literal colours).
 *
 * Categorical order is fixed: assign SERIES[0], SERIES[1], … to entities in a
 * stable order and never cycle past the end (fold extras into "Other"). The
 * order was validated with the dataviz skill's palette checker for both
 * surfaces (CVD and normal-vision separation pass on adjacent pairs). Gold and
 * pink sit below 3:1 on the light surface, so charts always show a legend or
 * direct labels.
 *
 * Status colours are reserved for state (critical/warning/success/info) and
 * must not be used as "series 5".
 */
const PALETTES = {
  light: {
    series: ["#2f7d3e", "#2a78d6", "#eb6834", "#6250d6", "#e5a800", "#e87ba4"],
    status: { critical: "#c8282b", warning: "#d68a00", success: "#2f7d3e", info: "#2a6fc0", neutral: "#8a948f" },
    sequential: ["#e6f3e8", "#b9dfc0", "#7fc18d", "#4a9d5d", "#2f7d3e", "#1d5427"],
    surface: "#ffffff",
    grid: "#e4e8e6",
    axis: "#66706b",
    text: "#1d2521",
    mutedText: "#5b6560",
    tooltipBg: "#ffffff",
    tooltipBorder: "#dde2df",
  },
  dark: {
    series: ["#38915a", "#3987e5", "#d95926", "#9085e9", "#c98500", "#d55181"],
    status: { critical: "#e86560", warning: "#e0a030", success: "#4fae6a", info: "#5c9be8", neutral: "#7f8a85" },
    sequential: ["#1f3326", "#24502f", "#2d6d3c", "#38915a", "#5fb479", "#93d2a4"],
    surface: "#1c2420",
    grid: "#2c3631",
    axis: "#9aa59f",
    text: "#eef2f0",
    mutedText: "#a9b3ae",
    tooltipBg: "#222b27",
    tooltipBorder: "#36413b",
  },
};

export const getChartTheme = (mode = "light") => {
  const p = PALETTES[mode] || PALETTES.light;
  return {
    ...p,
    /** Props to spread on <CartesianGrid>. */
    gridProps: { stroke: p.grid, strokeDasharray: "3 3", vertical: false },
    /** Props to spread on <XAxis>/<YAxis>. */
    axisProps: {
      stroke: p.grid,
      tick: { fill: p.axis, fontSize: 12 },
      tickLine: false,
      axisLine: false,
    },
    /** Props to spread on <Tooltip>. */
    tooltipProps: {
      contentStyle: {
        background: p.tooltipBg,
        border: `1px solid ${p.tooltipBorder}`,
        borderRadius: 8,
        boxShadow: "0 8px 24px -8px rgb(0 0 0 / 0.2)",
        color: p.text,
        fontSize: 12,
      },
      labelStyle: { color: p.text, fontWeight: 600 },
      itemStyle: { color: p.text },
      cursor: { fill: mode === "dark" ? "rgb(255 255 255 / 0.04)" : "rgb(0 0 0 / 0.04)" },
    },
    // Legend text stays in text colours; the swatch carries the series identity.
    legendProps: {
      iconType: "circle",
      iconSize: 8,
      wrapperStyle: { fontSize: 12 },
      formatter: (value) => createElement("span", { style: { color: p.mutedText } }, value),
    },
    /** Series colour by stable index; past the palette end use neutral ("Other"). */
    seriesColor: (index) => p.series[index] ?? p.status.neutral,
  };
};

/** Theme-aware chart colours: re-renders charts when the theme flips. */
export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  return useMemo(() => getChartTheme(resolvedTheme), [resolvedTheme]);
}
