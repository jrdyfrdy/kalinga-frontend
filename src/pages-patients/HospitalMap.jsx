import AppShell from "@/layouts/AppShell";
import HospitalMap from "../pages-responders/pathfinding/HospitalMap";

export const PatientHospitalMap = () => {
  return (
    <AppShell role="patient" variant="fullscreen">
      <div className="h-full p-0">
          <div className="h-full min-h-[calc(100vh-4rem)]">
            <HospitalMap embedded className="h-full" />
          </div>
      </div>
    </AppShell>
  );
};

