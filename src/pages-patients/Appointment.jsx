import AppShell from "@/layouts/AppShell";
import Appointments from "../components/patients/Appointment";

export const PatientAppointment = () => {
  return (
    <AppShell role="patient">
          <Appointments />
    </AppShell>
  );
};

