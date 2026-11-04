/**
 * RescueChatFab — Contextual floating action button shown ONLY during active
 * rescue tracking. Replaces the default EmergencyFab with a "Chat" button that
 * opens the patient ↔ responder conversation thread for the current incident.
 */

import { useState, useCallback } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import responseModeService from "../../../services/responseMode";
import api from "../../../services/api";

export default function RescueChatFab({ incidentId, className = "", style }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const resolveIncidentId = useCallback(async () => {
    if (incidentId) return incidentId;

    try {
      const res = await api.get("/rescue/active");
      if (res.data?.has_active_rescue) {
        return res.data?.data?.incident?.id ?? null;
      }
    } catch {
      // no-op, handled by fallback in openChat
    }

    return null;
  }, [incidentId]);

  const openChat = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const resolvedIncidentId = await resolveIncidentId();
      if (!resolvedIncidentId) {
        return;
      }

      let conversationId = null;
      try {
        const conversation =
          await responseModeService.getConversation(resolvedIncidentId);
        conversationId =
          conversation?.id ?? conversation?.conversationId ?? null;
      } catch (error) {
        console.error("Failed to fetch conversation for incident:", error);
      }

      // Navigate to messages with the incident context so the Messages
      // component can auto-select the correct conversation thread.
      navigate("/patient/messages", {
        state: {
          openIncidentChat: {
            incidentId: resolvedIncidentId,
            conversationId,
          },
        },
      });
    } catch (err) {
      console.error("Failed to open rescue chat:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, navigate, resolveIncidentId]);

  return (
    <button
      type="button"
      onClick={openChat}
      disabled={loading}
      className={`fixed bottom-24 right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-info px-4 font-semibold text-info-foreground shadow-lg ring-4 ring-info/20 transition-[transform,filter] hover:brightness-110 active:scale-95 disabled:opacity-70 lg:bottom-6 lg:right-6 lg:px-5 ${className}`}
      style={style}
      aria-label="Chat with your responder"
    >
      {loading ? (
        <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <MessageCircle className="size-6" aria-hidden="true" />
      )}
      <span className="text-sm">Chat with responder</span>
    </button>
  );
}
