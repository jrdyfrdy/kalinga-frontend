import AppShell from "@/layouts/AppShell";
import HealthRecords from "../components/patients/HealthRecords";

export const PatientHealthRecords = () => {
  return (
    <AppShell role="patient">
          <HealthRecords />
    </AppShell>
  );
};

