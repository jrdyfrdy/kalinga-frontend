import AppShell from "@/layouts/AppShell";
import MessagesContact from "../components/patients/Messages";

export const PatientMessages = () => {
  return (
    <AppShell role="patient">
          <MessagesContact />
    </AppShell>
  );
};

