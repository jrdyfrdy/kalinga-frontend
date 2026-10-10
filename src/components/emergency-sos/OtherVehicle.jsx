import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

export const SpecifyVehicle = () => {
  const [vehicle, setVehicle] = useState("");
  const navigate = useNavigate();

  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!vehicle.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendVehicleRequest(vehicle.trim());
      navigate("/patient/messages", { state: { filterCategory: "Emergency" } });
    } catch (err) {
      setError(err?.response?.data?.message || "Could not send your request. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="h-screen bg-background text-primary flex flex-col items-center justify-center px-8 text-center">
      <h2 className="text-[1.8rem] mb-12">
        Please <span className="text-highlight font-bold">specify</span> the{" "}
        <span className="text-highlight font-bold">vehicle type</span>.
      </h2>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 w-full max-w-xl mx-auto">
        <input
          type="text"
          placeholder="Type here..."
          value={vehicle}
          onChange={(e) => setVehicle(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-1 text-base p-3 border border-gray-300 rounded-md outline-none"
        />
        <button
          className="bg-primary text-white font-bold px-6 py-3 text-base rounded-md hover:bg-green-950 transition"
          onClick={handleSubmit}
        >
          Send
        </button>
      </div>
    </div>
  );
};
