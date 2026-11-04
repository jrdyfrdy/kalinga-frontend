import AppShell from "@/layouts/AppShell";
import PatientDash from "../components/patients/Dashboard";

export const PatientDashboard = () => {
  return (
    <AppShell role="patient">
          <PatientDash />
    </AppShell>
  );
};

