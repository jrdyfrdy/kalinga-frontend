import AppShell from "@/layouts/AppShell";
import WeatherSection from "../components/dashboard/Weather";

export const Weather = () => {
  return (
    <AppShell role="patient">
      <div className="p-4">
          <WeatherSection />
      </div>
    </AppShell>
  );
};

