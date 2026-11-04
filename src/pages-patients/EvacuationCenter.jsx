import AppShell from "@/layouts/AppShell";
import EvacCenter from "../components/dashboard/Evacuation";

export const EvacuationCenter = () => {
  return (
    <AppShell role="patient">
      <div className="p-4">
          <EvacCenter />
      </div>
    </AppShell>
  );
};

