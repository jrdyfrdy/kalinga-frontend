import AppShell from "@/layouts/AppShell";
import PatientProfile from "../components/Profile";

export const Profile = () => {
  return (
    <AppShell role="patient">
      <div className="p-2">
          <PatientProfile />
      </div>
    </AppShell>
  );
};

