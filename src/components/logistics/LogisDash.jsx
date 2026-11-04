import { Callout } from "@/components/ui";
import React, { useState, useEffect } from "react";
import {
  Truck,
  Package,
  Clock,
  MapPin,
  List,
  AlertTriangle,
  ArrowRight,
  CornerDownRight,
  ClipboardList,
  Target,
  Home,
  CheckCircle,
  Briefcase,
  Wrench,
  ShieldQuestionMark,
  ChartColumnStacked,
  Bell,
  Building,
  Users,
  BrainCircuit,
  Maximize2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import resourceService from "../../services/resourceService";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import api from "../../services/api";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import { useSupplyTracking } from "../../hooks/useSupplyTracking";
import useForecastPrefetch from "../../hooks/useForecastPrefetch";
import LiveTrackingMap from "./LiveTrackingMap";

// Import Hospital Dashboard
import HospitalDashboard from "./ResourceMngmt/HospitalDashboard";

// Import AI Forecast v2 dashboard
import ForecastDashboard from "./forecast-v2/ForecastDashboard";

// --- DEMO FALLBACK DATA (shown with a visible banner when API is unavailable) ---
const DEMO_RESOURCE_REQUESTS = [
  {
    id: "R-1001",
    location: "Barangay San Jose",
    urgency: "Critical",
    time: "2 hours ago",
    items: 3,
  },
  {
    id: "R-1002",
    location: "Evacuation Center 3",
    urgency: "High",
    time: "3 hours ago",
    items: 2,
  },
  {
    id: "R-1003",
    location: "Field Hospital Beta",
    urgency: "Medium",
    time: "5 hours ago",
    items: 1,
  },
];

const DEMO_SHIPMENTS = [
  {
    id: "S-7001",
    route: "Depot A → Field Hospital",
    eta: "2025-09-29T20:30:00Z",
    status: "In Transit",
    contents: "Medical Supplies",
    priority: "High",
  },
  {
    id: "S-7002",
    route: "Warehouse B → Evac Zone 4",
    eta: "2025-09-29T19:45:00Z",
    status: "Delayed",
    contents: "Water, Blankets",
    priority: "Critical",
  },
];

const DEMO_ASSETS = [
  { name: "Truck 1", status: "In Use" },
  { name: "Truck 2", status: "Idle" },
  { name: "Generator 1", status: "In Use" },
];

const DEMO_NOTIFICATIONS = [
  {
    id: 1,
    title: "Low Stock Alert",
    message: "Demo notification — connect API for real data",
    priority: "Critical",
    time: "5 mins ago",
    read: false,
  },
];

const NotificationWidget = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await api.get("/notifications");
        console.log("Fetched notifications:", response.data); // DEBUG LOG

        // Filter for logistics notifications only
        const logisticsNotifs = response.data.filter(
          (n) => n.type === "logistics" || !n.type, // Include if no type field
        );

        setNotifications(logisticsNotifs.slice(0, 5));
      } catch (err) {
        console.error("Failed to fetch notifications for widget", err);
        // Sample notifications only in dev builds.
        setNotifications(
          import.meta.env.DEV ? DEMO_NOTIFICATIONS.map((n) => ({ ...n, type: "logistics" })) : [],
        );
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  if (loading) {
    return <div className="text-center text-sm text-gray-500">Loading...</div>;
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500">
        No new notifications.
      </div>
    );
  }

  return (
    <ul className="space-y-3 text-left">
      {notifications.map((notif) => (
        <li
          key={notif.id}
          className="flex gap-3 p-3 bg-gray-50 rounded-lg text-primary text-sm border-l-4 border-green-700"
        >
          <span className="flex-shrink-0 w-2 h-2 mt-1.5 bg-green-700 rounded-full"></span>
          <div className="flex-1">
            <p className="font-semibold">{notif.title}</p>
            <p className="text-xs text-gray-600">
              {notif.description || notif.message}
            </p>
            <p className="text-sm font-medium text-slate-600 mt-1">
              {notif.created_at
                ? formatDistanceToNow(new Date(notif.created_at), {
                    addSuffix: true,
                  })
                : notif.time}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
};

const getUrgencyColor = (urgency) => {
  switch (urgency) {
    case "Critical":
      return "bg-red-100 text-red-800 border-red-400";
    case "High":
      return "bg-yellow-100 text-yellow-800 border-yellow-400";
    default:
      return "bg-gray-100 text-gray-800 border-gray-400";
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "Delayed":
      return "text-red-700 bg-red-100";
    case "In Transit":
    case "En Route":
      return "text-blue-700 bg-blue-100";
    case "Delivered":
    case "Available":
      return "text-green-700 bg-green-100";
    default:
      return "text-slate-600 bg-slate-100";
  }
};

const formatETA = (isoTime) => {
  const date = new Date(isoTime);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// --- CHART COMPONENT ---
/** Shared shell for the four KPI tiles: whole tile links to the detail page. */
const KpiTile = ({ to, title, icon: Icon, value, unit, children }) => (
  <Link
    to={to}
    className="group flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-xs transition-shadow hover:shadow-md"
  >
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
    </div>
    <p className="tabular mt-3 text-3xl font-bold tracking-tight">
      {value}
      {unit && <span className="ml-1 text-base font-semibold text-muted-foreground">{unit}</span>}
    </p>
    <ul className="mt-3 space-y-1.5 text-sm">{children}</ul>
  </Link>
);

const KpiLine = ({ icon: Icon, tone = "text-muted-foreground", children }) => (
  <li className="flex items-center gap-2">
    <Icon className={`size-4 shrink-0 ${tone}`} aria-hidden="true" />
    <span className="tabular">{children}</span>
  </li>
);

const OverallStatusCard = ({ inventory, facilities }) => {
  const totalRemaining = inventory?.reduce((sum, i) => sum + (i.remaining || 0), 0) || 0;
  const criticalCount = inventory?.filter((i) => i.status === "Critical").length || 0;
  const categories = new Set((inventory || []).map((i) => i.category)).size;
  const ranked = [...(facilities || [])].sort((a, b) => (b.resources || 0) - (a.resources || 0));
  const top = ranked.slice(0, 5);
  const max = Math.max(1, ...top.map((f) => f.resources || 0));

  return (
    <Link
      to="/logistics/resource-management"
      className="group flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-xs transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Resource overview</h3>
        <Package className="size-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
        <p className="tabular text-3xl font-bold tracking-tight">
          {totalRemaining.toLocaleString()}
          <span className="ml-1 text-base font-semibold text-muted-foreground">units</span>
        </p>
        <p className="tabular text-sm text-muted-foreground">
          {facilities?.length || 0} facilities · {categories} categories
        </p>
        {criticalCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-critical-subtle px-2 py-0.5 text-xs font-semibold text-critical-subtle-foreground">
            <AlertTriangle className="size-3.5" aria-hidden="true" /> {criticalCount} critical
          </span>
        )}
      </div>
      {top.length > 0 ? (
        <ul className="mt-4 space-y-2.5">
          {top.map((f) => (
            <li key={f.name} className="space-y-1">
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate" title={f.name}>{f.name}</span>
                <span className="tabular shrink-0 text-muted-foreground">{(f.resources || 0).toLocaleString()}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-primary" style={{ width: `${((f.resources || 0) / max) * 100}%` }} />
              </div>
            </li>
          ))}
          {ranked.length > top.length && (
            <li className="text-xs text-muted-foreground">+ {ranked.length - top.length} more facilities</li>
          )}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No facility stock recorded yet.</p>
      )}
    </Link>
  );
};

const AssetStatusCard = ({ assets }) => {
  const total = assets?.length || 0;
  const inUse = assets?.filter((a) => a.status === "In Use").length || 0;
  const repair = assets?.filter((a) => a.status === "Repair").length || 0;
  return (
    <KpiTile to="/logistics/asset-registry" title="Asset registry" icon={Truck} value={total} unit="assets">
      <KpiLine icon={CheckCircle} tone="text-success">{total - inUse - repair} available</KpiLine>
      <KpiLine icon={ChartColumnStacked}>{inUse} in use</KpiLine>
      <KpiLine icon={Wrench} tone={repair ? "text-warning" : "text-muted-foreground"}>{repair} under repair</KpiLine>
    </KpiTile>
  );
};

const DeliveryPerformanceCard = ({ shipments }) => {
  const list = shipments || [];
  const delayed = list.filter((s) => s.status === "Delayed").length;
  const delivered = list.filter((s) => s.status === "Delivered").length;
  const inTransit = list.filter((s) => ["Shipped", "On-the-Way", "In Transit"].includes(s.status)).length;
  const finished = delivered + delayed;
  const onTime = finished > 0 ? Math.round((delivered / finished) * 100) : null;
  return (
    <KpiTile to="/logistics/supply-tracking" title="Deliveries" icon={Clock} value={onTime == null ? "—" : `${onTime}%`} unit={onTime == null ? "" : "on time"}>
      <KpiLine icon={Truck}>{inTransit} in transit</KpiLine>
      <KpiLine icon={CheckCircle} tone="text-success">{delivered} delivered</KpiLine>
      <KpiLine icon={AlertTriangle} tone={delayed ? "text-critical" : "text-muted-foreground"}>{delayed} delayed</KpiLine>
    </KpiTile>
  );
};

const PendingRequestsCard = ({ requests }) => {
  const list = requests || [];
  const critical = list.filter((r) => r.urgency === "Critical").length;
  const high = list.filter((r) => r.urgency === "High").length;
  return (
    <KpiTile to="/logistics/requested-allocation" title="Pending requests" icon={ClipboardList} value={list.length} unit="open">
      <KpiLine icon={AlertTriangle} tone={critical ? "text-critical" : "text-muted-foreground"}>{critical} critical</KpiLine>
      <KpiLine icon={Clock} tone={high ? "text-warning" : "text-muted-foreground"}>{high} high priority</KpiLine>
      <KpiLine icon={Package}>{list.length - critical - high} standard</KpiLine>
    </KpiTile>
  );
};

const LiveMap = ({ shipments, assets }) => {
  const totalAssets = assets?.length || 0;
  const inUse = assets?.filter((a) => a.status === "In Use").length || 0;
  const repair = assets?.filter((a) => a.status === "Repair").length || 0;
  const idle = totalAssets - inUse - repair;

  return (
    <div className="bg-white rounded-2xl shadow-md border p-5 flex flex-col h-full">
      <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center justify-between">
        <span className="flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-slate-700" /> Live Tracking Map
        </span>
        <span className="bg-green-100 text-green-800 border border-green-200 text-xs px-3 py-1 rounded-full shadow-sm font-bold">
          {idle} Available Vehicles
        </span>
      </h2>
      <div className="flex-1 relative rounded-xl overflow-hidden z-0 border border-gray-200 group">
        <LiveTrackingMap allShipments={shipments} />
        {/* Overlay Button */}
        <div className="absolute inset-0 bg-slate-900/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-[400] pointer-events-none">
          <Link
            to="/logistics/live-map"
            className="bg-white text-slate-800 font-bold px-5 py-2.5 rounded-full shadow-lg pointer-events-auto flex items-center hover:bg-slate-50 transition-all hover:scale-105"
          >
            <Maximize2 className="h-4 w-4 mr-2" /> View Full Screen Map
          </Link>
        </div>
      </div>
    </div>
  );
};

const NotificationsList = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          Notifications
        </h2>
      </div>
      <div className="overflow-y-auto pr-2 flex-1">
        <NotificationWidget />
      </div>
    </div>
  );
};

const ActiveDeliveriesList = ({ shipments }) => {
  return (
    <div className="bg-white rounded-2xl shadow-md border p-5">
      <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
        <Truck className="h-5 w-5 mr-2 text-slate-700" />
        Active Deliveries
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-center">Shipment ID</th>
              <th className="px-3 py-2 text-center">Route</th>
              <th className="px-3 py-2 text-center">Contents</th>
              <th className="px-3 py-2 text-center">Status</th>
              <th className="px-3 py-2 text-center">ETA</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shipments && shipments.length > 0 ? (
              shipments.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 text-center font-semibold">
                    {s.id}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="flex items-center justify-center">
                      <CornerDownRight className="h-4 w-4 mr-1 text-gray-400" />
                      {s.route}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-600">
                    {s.contents?.replace(
                      /Qty:\s*(\d+(?:\.\d+)?)/g,
                      (match, p1) => `Qty: ${parseInt(p1, 10)}`,
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(s.status)}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-gray-600">
                    {formatETA(s.eta)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-8 text-gray-500">
                  No active shipments to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-right">
        <Link
          to="/logistics/supply-tracking"
          className="text-sm text-slate-600 font-semibold hover:text-slate-800 flex items-center justify-end transition-colors"
        >
          View All Deliveries <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

// --- UPDATED: ResourceRequestsList (Mobile Responsive) ---
const ResourceRequestsList = ({ requests }) => (
  <div className="col-span-12 bg-white rounded-2xl shadow-md border p-5">
    <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
      <List className="h-5 w-5 mr-2 text-slate-700" /> Pending Resource Requests
    </h2>
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-center">ID</th>
            <th className="px-3 py-2 text-center">Location</th>
            <th className="px-3 py-2 text-center">Items</th>
            <th className="px-3 py-2 text-center">Urgency</th>
            <th className="px-3 py-2 text-center">Received</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {requests && requests.length > 0 ? (
            requests.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2 text-center">{r.id}</td>
                <td className="px-3 py-2 text-center">{r.location}</td>
                <td className="px-3 py-2 text-center font-bold text-slate-700">
                  {r.items}
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`px-2 py-1 rounded-full border ${getUrgencyColor(
                      r.urgency,
                    )}`}
                  >
                    {r.urgency}
                  </span>
                </td>
                <td className="px-3 py-2 text-center text-gray-500">
                  {r.time}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center py-8 text-gray-500">
                No pending requests
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div className="mt-3 text-right">
      <Link
        to="/logistics/requested-allocation"
        className="text-sm text-slate-600 font-semibold hover:text-slate-800 flex items-center justify-end transition-colors"
      >
        View Full Allocation <ArrowRight className="ml-1 h-4 w-4" />
      </Link>
    </div>
  </div>
);

// --- Tab Navigation Component (Logistics-only, no national/admin toggle) ---
const TabNavigation = ({ activeTab, setActiveTab, assignedHospitalName }) => {
  const tabs = [
    {
      id: "logistics",
      label: "Logistics Dashboard",
      icon: <Truck className="w-5 h-5" />,
      color: "bg-gradient-to-r from-green-600 to-emerald-700",
      description: "Resource Allocation & Tracking",
    },
    {
      id: "hospital",
      label: "Hospital Dashboard",
      icon: <Building className="w-5 h-5" />,
      color: "bg-gradient-to-r from-blue-600 to-blue-800",
      description: "Hospital Resource Management",
    },
    {
      id: "forecast",
      label: "AI Forecast",
      icon: <BrainCircuit className="w-5 h-5" />,
      color: "bg-gradient-to-r from-purple-600 to-indigo-700",
      description: "AI-Powered Demand Forecasting & Risk Analysis",
    },
  ];

  return (
    <div className="mb-8 bg-white rounded-2xl shadow-lg p-4">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-800 leading-tight break-normal">
            {tabs.find((t) => t.id === activeTab)?.label || "Logistics System"}
          </h1>
          <p className="text-gray-600 mt-1 break-normal">
            {tabs.find((t) => t.id === activeTab)?.description}
          </p>
        </div>

        <div className="flex flex-wrap overflow-x-auto gap-2 bg-gray-100 p-1 rounded-xl w-full scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 md:px-6 md:py-3 whitespace-nowrap rounded-lg text-sm md:text-base font-bold transition-all flex items-center gap-2 min-w-0 ${
                activeTab === tab.id
                  ? `${tab.color} text-white shadow-lg`
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assigned Hospital Indicator */}
      <div className="mt-4 flex flex-wrap items-center gap-3 md:gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold text-green-700">
            Logistics Operations Active
          </span>
        </div>
        <div className="px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800 border border-green-300 max-w-full min-w-0 break-words">
          {assignedHospitalName || "Hospital View"}
        </div>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION COMPONENT ---
const LogisDash = () => {
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState("logistics");
  const navigate = useNavigate();

  // Prefetch forecast data in the background so ForecastDashboard renders instantly
  useForecastPrefetch();

  // Prefetch supply tracking data — only poll when logistics tab is active
  const { shipments: liveShipments } = useSupplyTracking({
    pollingInterval: 60000,
    enabled: activeTab === "logistics",
  });
  // Fall back to demo data only when explicitly in demo mode AND no live data yet
  const shipments =
    liveShipments.length > 0 ? liveShipments : isDemoMode && import.meta.env.DEV ? DEMO_SHIPMENTS : [];

  // Get the authenticated user and their assigned hospital
  const { user } = useAuth();
  const assignedHospital = user?.hospitals?.[0] || null;
  const assignedHospitalName = assignedHospital?.name || null;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        let usingFallback = false;

        // Fire all three independent API calls in parallel
        const [resourcesResult, requestsResult, assetsResult] =
          await Promise.allSettled([
            resourceService.getAll(),
            api.get("/requests", {
              params: { per_page: 10, status: "pending" },
            }),
            api.get("/assets", { params: { per_page: 20 } }),
          ]);

        // ── 1. Resources / Inventory ──
        if (resourcesResult.status === "fulfilled") {
          const resourcesResponse = resourcesResult.value;
          const inventoryData = resourcesResponse.map((item) => ({
            resource: item.name,
            category: item.category,
            remaining: parseFloat(item.quantity || 0),
            unit: item.unit,
            status: item.status,
            facility: item.location,
          }));

          const facilityMap = {};
          resourcesResponse.forEach((item) => {
            const facilityName = item.location || "Unknown";
            const remaining = parseFloat(item.quantity || 0);
            if (!facilityMap[facilityName]) {
              facilityMap[facilityName] = { name: facilityName, resources: 0 };
            }
            facilityMap[facilityName].resources += remaining;
          });
          const facilitiesData = Object.values(facilityMap).filter(
            (f) => f.resources > 0,
          );
          setInventory(inventoryData);
          setFacilities(facilitiesData);
        } else {
          console.warn(
            "Resources API unavailable, using demo mode",
            resourcesResult.reason,
          );
          usingFallback = true;
        }

        // ── 2. Requests ──
        if (requestsResult.status === "fulfilled") {
          const reqData =
            requestsResult.value.data?.data || requestsResult.value.data || [];
          setRequests(
            reqData.map((r) => ({
              id: `R-${r.id}`,
              location: r.resource_name || r.hospital?.name || "Unknown",
              urgency: r.urgency_level || "Medium",
              time: r.created_at
                ? formatDistanceToNow(new Date(r.created_at), {
                    addSuffix: true,
                  })
                : "",
              items: r.quantity || 1,
            })),
          );
        } else {
          console.warn(
            "Requests API unavailable, using demo fallback",
            requestsResult.reason,
          );
          // Sample data only in dev builds; production shows the real (empty) state.
          setRequests(import.meta.env.DEV ? DEMO_RESOURCE_REQUESTS : []);
          usingFallback = true;
        }

        // ── 3. Shipments: handled by useSupplyTracking hook above ──

        // ── 4. Assets ──
        if (assetsResult.status === "fulfilled") {
          const assetData =
            assetsResult.value.data?.data || assetsResult.value.data || [];
          setAssets(
            assetData.map((a) => ({
              name: a.name || a.code || "Unknown",
              status: a.status || "Idle",
            })),
          );
        } else {
          console.warn(
            "Assets API unavailable, using demo fallback",
            assetsResult.reason,
          );
          setAssets(import.meta.env.DEV ? DEMO_ASSETS : []);
          usingFallback = true;
        }

        setIsDemoMode(usingFallback);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError(error.message);
        setIsDemoMode(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const renderContent = () => {
    if (activeTab === "hospital") {
      return <HospitalDashboard />;
    }

    if (activeTab === "forecast") {
      return <ForecastDashboard />;
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
            <div className="text-xl text-gray-700">
              Loading dashboard data...
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <div className="text-xl text-gray-700 mb-2">
              Error loading dashboard
            </div>
            <div className="text-sm text-gray-500">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Demo Mode Banner */}
        {isDemoMode && (
          <Callout tone="warning" icon={AlertTriangle} title="Some live data is unavailable" className="mb-4">
            {import.meta.env.DEV
              ? "One or more API endpoints failed, so sample data is shown (dev build only)."
              : "One or more services didn't respond. Figures may be incomplete; they refresh automatically."}
          </Callout>
        )}
        {/* ROW 1: Top Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-6">
          <div className="md:col-span-2 lg:col-span-2 xl:col-span-2 h-full min-w-0">
            <OverallStatusCard inventory={inventory} facilities={facilities} />
          </div>

          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1 h-full min-w-0">
            <AssetStatusCard assets={assets} />
          </div>

          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1 h-full min-w-0">
            <DeliveryPerformanceCard
              requests={requests}
              shipments={shipments}
            />
          </div>

          <div className="md:col-span-2 lg:col-span-1 xl:col-span-1 h-full min-w-0">
            <PendingRequestsCard requests={requests} />
          </div>
        </section>

        {/* ROW 2: Map + Notifications */}
        <section className="grid grid-cols-12 gap-6 mb-6">
          {/* Left Side: Live Map (8 columns) */}
          <div className="col-span-12 lg:col-span-8 h-[600px]">
            <LiveMap shipments={shipments} assets={assets} />
          </div>

          <div className="col-span-12 lg:col-span-4 h-[600px]">
            <NotificationsList />
          </div>
        </section>

        {/* ROW 3: Active Deliveries */}
        <section className="mb-6">
          <ActiveDeliveriesList shipments={shipments} />
        </section>

        {/* ROW 3: Resource Requests List */}
        <section>
          <ResourceRequestsList requests={requests} />
        </section>

        <footer className="text-center mt-8 text-sm text-gray-500">
          Status: Operational (Last Updated {new Date().toLocaleTimeString()})
        </footer>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans p-4 md:p-8">
      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        assignedHospitalName={assignedHospitalName}
      />

      {/* Main Content */}
      {renderContent()}
    </div>
  );
};

export default LogisDash;
