import {
  Activity,
  Award,
  Bell,
  BookOpen,
  Boxes,
  CalendarDays,
  ClipboardList,
  ClipboardPlus,
  Cloud,
  FileCheck,
  FileText,
  GraduationCap,
  Heart,
  History,
  Home,
  LayoutDashboard,
  Map,
  MapPin,
  Megaphone,
  MessageSquare,
  Navigation,
  Package,
  PackageSearch,
  Radar,
  Server,
  Settings,
  Siren,
  TrendingUp,
  Truck,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import { ROUTES } from "./routes";

/**
 * Navigation for every role, in one place. AppShell renders the sidebar,
 * the mobile drawer and the mobile bottom bar from this config.
 *
 * Item: { label, to, icon, tone?: "critical", end?: boolean, match?: string[] }
 *   `match` lists extra path prefixes that should mark the item active.
 */
export const ADMIN_SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { id: "verifications", label: "Verification requests", icon: FileCheck, group: "People" },
  { id: "users", label: "Users & roles", icon: Users, group: "People" },
  { id: "responders", label: "Responders", icon: UserCheck, group: "People" },
  { id: "patients", label: "Patients", icon: Heart, group: "People" },
  { id: "incidents", label: "Incident map", icon: Map, group: "Operations" },
  { id: "resources", label: "Resources", icon: Package, group: "Operations" },
  { id: "logistics", label: "Logistics", icon: Truck, group: "Operations" },
  { id: "logistics-forecast", label: "AI forecast", icon: TrendingUp, group: "Operations" },
  { id: "training", label: "Training", icon: GraduationCap, group: "Engagement" },
  { id: "broadcast", label: "Broadcasts", icon: Megaphone, group: "Engagement" },
  { id: "connectivity", label: "Connectivity", icon: Server, group: "System" },
];

export const adminSectionPath = (id) => (id === "dashboard" ? ROUTES.ADMIN.ROOT : `${ROUTES.ADMIN.ROOT}/${id}`);

const groupAdminSections = () => {
  const groups = [];
  for (const section of ADMIN_SECTIONS) {
    let group = groups.find((g) => g.label === section.group);
    if (!group) {
      group = { label: section.group, items: [] };
      groups.push(group);
    }
    group.items.push({
      label: section.label,
      to: adminSectionPath(section.id),
      icon: section.icon,
      end: section.id === "dashboard",
    });
  }
  return groups;
};

export const NAVIGATION = {
  patient: {
    home: ROUTES.PATIENT.DASHBOARD,
    groups: [
      {
        items: [
          { label: "Dashboard", to: ROUTES.PATIENT.DASHBOARD, icon: Home },
          { label: "Report emergency", to: ROUTES.PATIENT.REPORT_EMERGENCY, icon: Siren, tone: "critical", match: ["/patient/vehicle", "/patient/specify-vehicle"] },
          { label: "Track rescue", to: "/patient/rescue-tracker", icon: Radar, tone: "critical", requires: "activeRescue" },
          { label: "Messages", to: ROUTES.PATIENT.MESSAGES, icon: MessageSquare },
        ],
      },
      {
        label: "Health",
        items: [
          { label: "Appointments", to: ROUTES.PATIENT.APPOINTMENTS, icon: CalendarDays },
          { label: "Health records", to: ROUTES.PATIENT.HEALTH_RECORDS, icon: ClipboardList },
        ],
      },
      {
        label: "Safety",
        items: [
          { label: "Hospital navigator", to: ROUTES.PATIENT.HOSPITAL_NAVIGATOR || "/patient/hospital-navigator", icon: Navigation, match: ["/patient/hospital-map"] },
          { label: "Evacuation centers", to: ROUTES.PATIENT.EVACUATION_CENTER, icon: MapPin },
          { label: "Weather", to: ROUTES.PATIENT.WEATHER || "/patient/weather", icon: Cloud },
        ],
      },
    ],
    account: [
      { label: "Notifications", to: ROUTES.PATIENT.NOTIFICATIONS || "/patient/notifications", icon: Bell },
      { label: "Profile", to: ROUTES.PATIENT.PROFILE || "/patient/profile", icon: User },
      { label: "Settings", to: ROUTES.PATIENT.SETTINGS || "/patient/settings", icon: Settings },
    ],
    bottomBar: ["Dashboard", "Messages", "Hospital navigator", "Notifications"],
  },

  responder: {
    home: "/responder/dashboard",
    groups: [
      {
        label: "Operations",
        items: [
          { label: "Emergency console", to: "/responder/emergency-console", icon: Siren, tone: "critical", match: ["/responder/response-mode"] },
          { label: "Dashboard", to: "/responder/dashboard", icon: LayoutDashboard },
          { label: "Incident logs", to: "/responder/incident-logs", icon: FileText },
          { label: "Triage", to: "/responder/triage-system", icon: Activity },
          { label: "Messages", to: "/responder/messages", icon: MessageSquare },
        ],
      },
      {
        label: "Patient care",
        items: [
          { label: "New care report", to: "/responder/patient-care-report", icon: ClipboardPlus, end: true },
          { label: "Report history", to: "/responder/pcr-history", icon: History },
        ],
      },
      {
        label: "Training",
        items: [
          { label: "Online training", to: "/responder/online-training", icon: GraduationCap },
          { label: "Modules", to: "/responder/modules", icon: BookOpen },
          { label: "Certifications", to: "/responder/certifications", icon: Award },
          { label: "Grades", to: "/responder/grades", icon: FileCheck },
        ],
      },
    ],
    account: [
      { label: "Profile", to: "/responder/profile", icon: User },
      { label: "Settings", to: "/responder/settings", icon: Settings },
    ],
    bottomBar: ["Emergency console", "Dashboard", "Incident logs", "Messages"],
  },

  logistics: {
    home: "/logistics/dashboard",
    groups: [
      {
        label: "Operations",
        items: [
          { label: "Dashboard", to: "/logistics/dashboard", icon: LayoutDashboard, match: ["/logistics/forecast"] },
          { label: "Resource management", to: "/logistics/resource-management", icon: Boxes },
          { label: "Asset registry", to: "/logistics/asset-registry", icon: PackageSearch },
          { label: "Supply tracking", to: "/logistics/supply-tracking", icon: Truck },
          { label: "Requested allocation", to: "/logistics/requested-allocation", icon: ClipboardList },
          { label: "Live map", to: "/logistics/live-map", icon: Map },
        ],
      },
    ],
    account: [
      { label: "Notifications", to: "/logistics/notifications", icon: Bell },
      { label: "Profile", to: "/logistics/profile", icon: User },
      { label: "Settings", to: "/logistics/settings", icon: Settings },
    ],
    bottomBar: null,
  },

  admin: {
    home: ROUTES.ADMIN.ROOT,
    groups: groupAdminSections(),
    account: [],
    bottomBar: null,
  },
};

export const ROLE_LABELS = {
  patient: "Patient",
  responder: "Responder",
  logistics: "Logistics",
  admin: "Administrator",
};

/** Flat list of every nav item for a role (used for page titles). */
export const flatNavItems = (role) => {
  const nav = NAVIGATION[role];
  if (!nav) return [];
  return [...nav.groups.flatMap((g) => g.items), ...(nav.account || [])];
};

/** Is `item` active for `pathname`? Exact for `end` items, prefix otherwise. */
export const isNavItemActive = (item, pathname) => {
  if (!item?.to) return false;
  if (pathname === item.to) return true;
  if (!item.end && pathname.startsWith(`${item.to}/`)) return true;
  return (item.match || []).some((path) => pathname === path || pathname.startsWith(`${path}/`));
};
