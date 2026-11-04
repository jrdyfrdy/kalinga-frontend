import { lazy, useEffect, Suspense } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import AppShell from "@/layouts/AppShell";
import { AdminCommandHeader } from "@/components/admin/AdminCommandHeader";
import { ADMIN_SECTIONS, adminSectionPath } from "@/config/navigation";
import { Button, Card, LoadingState } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

// Lazy-loaded admin sections — each chunk is split out of the main bundle
const DashboardSection = lazy(() =>
  import("@/components/admin/sections/DashboardSection").then((m) => ({
    default: m.DashboardSection,
  })),
);
const UserRoleManagement = lazy(() =>
  import("@/components/admin/sections/UserRoleManagement").then((m) => ({
    default: m.UserRoleManagement,
  })),
);
const VerificationRequests = lazy(() =>
  import("@/components/admin/sections/VerificationRequests").then((m) => ({
    default: m.VerificationRequests,
  })),
);
const IncidentHeatMap = lazy(() =>
  import("@/components/admin/sections/IncidentHeatMap").then((m) => ({
    default: m.IncidentHeatMap,
  })),
);
const ResourceManagement = lazy(() =>
  import("@/components/admin/sections/ResourceManagement").then((m) => ({
    default: m.ResourceManagement,
  })),
);
const TrainingSection = lazy(() =>
  import("@/components/admin/sections/TrainingSection").then((m) => ({
    default: m.TrainingSection,
  })),
);
const ConnectivityMonitoring = lazy(() =>
  import("@/components/admin/sections/ConnectivityMonitoring").then((m) => ({
    default: m.ConnectivityMonitoring,
  })),
);
const BroadcastControl = lazy(() =>
  import("@/components/admin/sections/BroadcastControl").then((m) => ({
    default: m.BroadcastControl,
  })),
);
const LogisticsOverview = lazy(() =>
  import("@/components/admin/sections/LogisticsOverview").then((m) => ({
    default: m.LogisticsOverview,
  })),
);
const ResponderOverview = lazy(() =>
  import("@/components/admin/sections/ResponderOverview").then((m) => ({
    default: m.ResponderOverview,
  })),
);
const PatientOverview = lazy(() =>
  import("@/components/admin/sections/PatientOverview").then((m) => ({
    default: m.PatientOverview,
  })),
);
const LogisticsForecastSection = lazy(() =>
  import("@/components/admin/sections/LogisticsForecastSection").then((m) => ({
    default: m.LogisticsForecastSection,
  })),
);

/** Section id → component. Labels/icons/grouping live in config/navigation.js. */
const SECTION_COMPONENTS = {
  dashboard: DashboardSection,
  verifications: VerificationRequests,
  users: UserRoleManagement,
  responders: ResponderOverview,
  patients: PatientOverview,
  incidents: IncidentHeatMap,
  resources: ResourceManagement,
  logistics: LogisticsOverview,
  "logistics-forecast": LogisticsForecastSection,
  training: TrainingSection,
  broadcast: BroadcastControl,
  connectivity: ConnectivityMonitoring,
};

export const AdminPortal = () => {
  const { section = "dashboard" } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Legacy deep links: navigate("/admin", { state: { adminSection } }).
  const legacySection = location.state?.adminSection;
  useEffect(() => {
    if (legacySection && SECTION_COMPONENTS[legacySection]) {
      navigate(adminSectionPath(legacySection), { replace: true });
    }
  }, [legacySection, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.assign("/#hero");
    }
  };

  if (!user) {
    return <LoadingState className="min-h-dvh" label="Validating admin session…" />;
  }

  if (user.role !== "admin") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background p-6">
        <Card className="max-w-lg space-y-4 p-8">
          <h1 className="text-2xl font-bold tracking-tight">Admin access required</h1>
          <p className="text-sm text-muted-foreground">
            This console is reserved for Kalinga administrators. You're signed in as <strong>{user.name}</strong> with the{" "}
            <strong>{user.role}</strong> role. Ask your operations lead to grant admin access.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/">Go to home</Link>
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  const ActiveSection = SECTION_COMPONENTS[section];
  if (!ActiveSection) return <Navigate to={adminSectionPath("dashboard")} replace />;
  const meta = ADMIN_SECTIONS.find((s) => s.id === section);

  return (
    <AppShell role="admin" title={meta?.label}>
      <div className="mx-auto w-full max-w-[96rem] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {section === "dashboard" && (
          <AdminCommandHeader onNavigateSection={(id) => navigate(adminSectionPath(id))} />
        )}
        <Suspense fallback={<LoadingState />}>
          <ActiveSection />
        </Suspense>
      </div>
    </AppShell>
  );
};
