import { useState, useEffect, useMemo, useCallback } from "react";
import { AlertCircle } from "lucide-react";
import { EmergencyPopup } from "../emergency-sos/PopUp";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import RescueChatFab from "./rescue/RescueChatFab";
import api from "../../services/api";

/**
 * EmergencyFab — global floating action button for patient pages.
 *
 * Behaviour:
 *  • Default: shows the red "Emergency SOS" button.
 *  • When the patient has an active emergency response (is being rescued),
 *    automatically swaps to a blue "Chat with Responder" button that deep-links
 *    to the patient ↔ responder conversation thread.
 *
 * @param {string} [activeIncidentId] — If the parent already knows the active
 *        incident id, pass it to skip the extra API call.
 */
export default function EmergencyFab({
  activeIncidentId: propIncidentId,
} = {}) {
  const [showPopup, setShowPopup] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // --- Active-rescue detection (auto-switch to Chat FAB) ---
  const [detectedIncidentId, setDetectedIncidentId] = useState(null);
  const [pendingEmergencyAt, setPendingEmergencyAt] = useState(() => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem("pendingEmergencyAt");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  });

  const persistPendingEmergency = useCallback((timestamp) => {
    setPendingEmergencyAt(timestamp);
    if (typeof window !== "undefined") {
      if (timestamp) {
        window.sessionStorage.setItem("pendingEmergencyAt", String(timestamp));
      } else {
        window.sessionStorage.removeItem("pendingEmergencyAt");
      }
    }
  }, []);

  const syncActiveIncident = useCallback(async () => {
    if (propIncidentId) {
      setDetectedIncidentId(propIncidentId);
      persistPendingEmergency(null);
      return;
    }

    try {
      const res = await api.get("/rescue/active");
      if (res.data?.has_active_rescue) {
        setDetectedIncidentId(res.data?.data?.incident?.id ?? null);
        persistPendingEmergency(null);
      } else {
        setDetectedIncidentId(null);
      }
    } catch {
      // Silently ignore — keep existing UI state
    }
  }, [propIncidentId, persistPendingEmergency]);

  useEffect(() => {
    syncActiveIncident();

    const intervalId = window.setInterval(syncActiveIncident, 10000);
    const onFocus = () => syncActiveIncident();
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncActiveIncident]);

  const activeIncidentId = propIncidentId ?? detectedIncidentId;
  const hasPendingEmergency = useMemo(() => {
    if (!pendingEmergencyAt) return false;
    // Show Chat for up to 10 minutes after reporting while incident assignment syncs.
    return Date.now() - pendingEmergencyAt < 10 * 60 * 1000;
  }, [pendingEmergencyAt]);

  const targetMode = activeIncidentId || hasPendingEmergency ? "chat" : "sos";
  const [renderMode, setRenderMode] = useState(targetMode);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (targetMode === renderMode) return;

    setIsAnimatingOut(true);
    const timer = window.setTimeout(() => {
      setRenderMode(targetMode);
      setIsAnimatingOut(false);
    }, 140);

    return () => window.clearTimeout(timer);
  }, [targetMode, renderMode]);

  const swapAnimationClass = isAnimatingOut
    ? "opacity-0 scale-95"
    : "opacity-100 scale-100";

  // --- Standard Emergency SOS logic ---
  const resolveLocation = () =>
    new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve({ error: "Geolocation is not supported on this device." });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
          }),
        (error) =>
          resolve({
            error:
              error?.message ||
              "Unable to access location automatically. Please share it manually if prompted.",
          }),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    });

  const handleEmergencySend = async () => {
    setShowPopup(false);
    const triggeredAt = new Date().toISOString();
    persistPendingEmergency(Date.now());

    let locationPayload = { location: null, error: null };
    try {
      locationPayload = await resolveLocation();
    } catch (error) {
      locationPayload = {
        error:
          error?.message ||
          "Unable to access location automatically. Please share it manually if prompted.",
      };
    }
    navigate("/patient/messages", {
      state: {
        startEmergencyChat: {
          triggeredAt,
          ...(locationPayload.location
            ? { location: locationPayload.location }
            : {}),
          ...(locationPayload.error
            ? { locationError: locationPayload.error }
            : {}),
        },
      },
    });
  };

  const handleEmergencyCancel = () => {
    setShowPopup(false);
    toast({
      title: "Cancelled",
      description: "Emergency alert cancelled.",
    });
  };

  return (
    <>
      {renderMode === "chat" ? (
        <RescueChatFab
          incidentId={activeIncidentId}
          className={`duration-200 ease-out ${swapAnimationClass}`}
          style={{ transitionProperty: "opacity, transform" }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowPopup(true)}
          className={`fixed bottom-24 right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-critical px-4 font-semibold text-critical-foreground shadow-lg ring-4 ring-critical/20 transition-[transform,filter] hover:brightness-110 active:scale-95 lg:bottom-6 lg:right-6 lg:px-5 duration-200 ease-out ${swapAnimationClass}`}
          style={{ transitionProperty: "opacity, transform" }}
          aria-label="Emergency SOS"
        >
          <AlertCircle className="size-6" aria-hidden="true" />
          <span className="text-sm tracking-wide">SOS</span>
        </button>
      )}

      {/* Popup Modal */}
      {showPopup && renderMode === "sos" && (
        <EmergencyPopup
          onSendNow={handleEmergencySend}
          onCancel={handleEmergencyCancel}
        />
      )}
    </>
  );
}
