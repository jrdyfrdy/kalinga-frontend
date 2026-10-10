import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ambulance, Truck } from "lucide-react";
import { submitEmergencyReport } from "../../services/emergencyService";
import { getCurrentLocation } from "../../utils/location";

// Sends the chosen vehicle with the patient's SOS (attached to the active
// incident if one exists, otherwise a new SOS is raised).
const sendVehicleRequest = async (vehicleType) => {
  let location = null;
  let locationError = null;
  try {
    const result = await getCurrentLocation({ timeout: 8000 });
    if (result.ok) location = result.coords;
    else locationError = result.error;
  } catch (error) {
    locationError = error?.message || null;
  }
  return submitEmergencyReport({ vehicle_type: vehicleType, location, locationError });
};

export default function EmergencyVehicleSelection() {
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const handleSelection = async (vehicleType) => {
    if (vehicleType === "Others") {
      navigate("/patient/specify-vehicle");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await sendVehicleRequest(vehicleType);
      navigate("/patient/messages", { state: { filterCategory: "Emergency" } });
    } catch (err) {
      setError(err?.response?.data?.message || "Could not send your request. Please try again or call your local emergency number.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="h-screen bg-background text-primary flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <h2 className="text-2xl sm:text-3xl font-semibold mb-8">
        What kind of{" "}
        <span className="text-highlight font-bold">
          emergency response vehicle
        </span>{" "}
        are you requesting?
      </h2>

      {error && <p className="mb-4 text-sm text-red-600 max-w-xs">{error}</p>}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => handleSelection("Ambulance")}
          disabled={sending}
          className="bg-primary hover:bg-green-950 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-3 transition"
        >
          <Ambulance size={20} /> Ambulance
        </button>

        <button
          onClick={() => handleSelection("Fire Truck")}
          disabled={sending}
          className="bg-primary hover:bg-green-950 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-3 transition"
        >
          <Truck size={20} /> Fire Truck
        </button>

        <button
          onClick={() => handleSelection("Others")}
          className="bg-primary hover:bg-green-950 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-3 transition"
        >
          Others
        </button>
      </div>
    </section>
  );
}
