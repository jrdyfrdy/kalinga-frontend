import AppShell from "@/layouts/AppShell";
import LogisticsDashboard from "../components/logistics/LogisDash";

export const DashboardLogistics = () => {
  return (
    <AppShell role="logistics">
          <LogisticsDashboard />
    </AppShell>
  );
};

