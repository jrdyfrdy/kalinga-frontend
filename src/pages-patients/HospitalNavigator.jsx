import AppShell from "@/layouts/AppShell";
import HospitalNavigatorMap from "@/components/patients/HospitalNavigatorMap";

export const PatientHospitalNavigator = () => {
  return (
    <AppShell role="patient">
      <div className="p-4 lg:p-6">
          <div className="mx-auto max-w-7xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-600">
                  Nearby Care
                </p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Hospital Navigator
                </h1>
                <p className="text-sm text-slate-600">
                  Find the best nearby hospital and start turn-by-turn
                  navigation.
                </p>
              </div>
            </div>
            <HospitalNavigatorMap />
          </div>
      </div>
    </AppShell>
  );
};


export default PatientHospitalNavigator;
