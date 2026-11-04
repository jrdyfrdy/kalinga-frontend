import AppShell from "@/layouts/AppShell";
import Supply from "../components/logistics/SupplyTracking";

export const SupplyTracking = () => {
  return (
    <AppShell role="logistics">
          <Supply />
    </AppShell>
  );
};

