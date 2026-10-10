import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { resolveNodeApiBaseUrl } from "../config/runtime";

const NODE_BASE = resolveNodeApiBaseUrl();

export function useVitalsSync({
  getValues,
  setValue,
  caseNo,
  patientUuid,
  isFieldLocked,
  onStatusChange,
  onPayload,
}) {
  // Callbacks and form helpers change identity on many renders; keep them in
  // refs so the socket is created once per mount instead of on every
  // keystroke in the case-number field.
  const handlersRef = useRef({});
  handlersRef.current = { getValues, setValue, isFieldLocked, onStatusChange, onPayload };
  const targetRef = useRef({ caseNo, patientUuid });
  targetRef.current = { caseNo, patientUuid };
  const socketRef = useRef(null);

  const hasTarget = Boolean(caseNo || patientUuid);

  useEffect(() => {
    if (!hasTarget) {
      handlersRef.current.onStatusChange?.("waiting");
      return undefined;
    }

    const token = localStorage.getItem("token") || undefined;
    const socket = io(NODE_BASE, {
      transports: ["websocket"],
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      handlersRef.current.onStatusChange?.("connected");
      socket.emit("pcr:subscribe", targetRef.current);
    });

    socket.on("disconnect", () => {
      handlersRef.current.onStatusChange?.("waiting");
    });

    socket.on("connect_error", () => {
      handlersRef.current.onStatusChange?.("waiting");
    });

    socket.on("pcr:edge-vitals", (payload) => {
      const target = targetRef.current;
      // Only apply readings addressed to the case/patient this form is on.
      const matchesCase = target.caseNo && payload?.caseNo && String(payload.caseNo) === String(target.caseNo);
      const matchesPatient = target.patientUuid && payload?.patientUuid && String(payload.patientUuid) === String(target.patientUuid);
      if (!matchesCase && !matchesPatient) return;

      const { getValues, setValue, isFieldLocked, onStatusChange, onPayload } = handlersRef.current;
      onPayload?.(payload);
      onStatusChange?.("ingesting");

      const vitals = getValues("vitals") || [];
      const lastIndex = Math.max(vitals.length - 1, 0);
      const current = getValues(`vitals.${lastIndex}`) || {};

      const candidates = [
        {
          path: `vitals.${lastIndex}.temp`,
          value: payload.reading?.temperature,
        },
        {
          path: `vitals.${lastIndex}.spo2`,
          value: payload.reading?.spo2,
        },
        {
          path: `vitals.${lastIndex}.pulse`,
          value: payload.reading?.pulse,
        },
        {
          path: `vitals.${lastIndex}.rr`,
          value: payload.reading?.rr,
        },
        {
          path: `vitals.${lastIndex}.bp`,
          value: payload.reading?.bp,
        },
      ];

      setValue(
        `vitals.${lastIndex}.time`,
        payload.reading?.time || current.time || new Date().toISOString().slice(11, 16),
        { shouldDirty: true }
      );

      for (const field of candidates) {
        if (field.value == null) continue;
        if (isFieldLocked?.(field.path)) continue;
        setValue(field.path, field.value, { shouldDirty: true });
      }

      setValue(`vitals.${lastIndex}.source`, "edge", { shouldDirty: true });
      setValue("edgeMeta", {
        source: "edge",
        lastIngestedAt: payload.ingestedAt,
        sensor: payload.sensor || "GY-906 MLX90614",
        nodeEventId: payload.eventId || null,
      });

      window.setTimeout(() => onStatusChange?.("connected"), 900);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [hasTarget]);

  // Case/patient changed while connected: switch rooms (debounced so typing a
  // case number does not resubscribe on every keystroke).
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !hasTarget) return undefined;
    const timer = setTimeout(() => {
      if (socket.connected) {
        socket.emit("pcr:subscribe", { caseNo, patientUuid });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [caseNo, patientUuid, hasTarget]);
}
