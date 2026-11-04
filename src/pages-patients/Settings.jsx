import AppShell from "@/layouts/AppShell";
import PatientSetting from "../components/patients/Settings";

export const PatientSettings = () => {
  return (
    <AppShell role="patient">
          <PatientSetting />
    </AppShell>
  );
};

