import AppShell from "@/layouts/AppShell";
import HospitalForecastDetail from "../components/logistics/forecast-v2/HospitalForecastDetail";

export const HospitalForecastDetailPage = () => {
  return (
    <AppShell role="logistics">
      <div className="p-6">
          <HospitalForecastDetail />
      </div>
    </AppShell>
  );
};

