import { useCallback, useEffect, useRef, useState } from "react";
import { getEchoInstance, reconnectEcho, subscribeChannel } from "../services/echo";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

/**
 * Hook to manage supply tracking data with real-time WebSocket updates.
 * Falls back to polling with a configurable interval.
 *
 * @param {Object} options
 * @param {number} options.pollingInterval - Fallback polling interval in ms (default: 60000, set to 0 to disable)
 * @param {boolean} options.enabled - Whether to enable the hook (default: true)
 * @returns {Object} - { shipments, loading, error, refetch, updateShipment }
 */
export const useSupplyTracking = ({
  pollingInterval = 60000,
  enabled = true,
} = {}) => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const subscriptionRef = useRef(null);
  const pollingTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastFetchedRef = useRef(null);

  // Fetch shipments from API
  const fetchShipments = useCallback(
    async ({ silent = false } = {}) => {
      if (!isAuthenticated || authLoading) {
        setLoading(false);
        return;
      }

      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await api.get("/supply-tracking");
        const data = Array.isArray(response.data) ? response.data : [];

        if (isMountedRef.current) {
          setShipments(data);
          lastFetchedRef.current = Date.now();
        }
      } catch (err) {
        console.error("Failed to fetch supply data:", err);
        if (isMountedRef.current) {
          setError(err?.message || "Failed to load tracking data");
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [isAuthenticated, authLoading]
  );

  // Update a single shipment from WebSocket event
  const updateShipment = useCallback((shipment) => {
    if (!shipment?.id) return;

    setShipments((prev) => {
      const index = prev.findIndex((s) => s.id === shipment.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...shipment };
        return updated;
      }
      // New shipment, add to list
      return [shipment, ...prev];
    });
  }, []);

  // Remove a shipment (e.g., when delivered and removed)
  const removeShipment = useCallback((shipmentId) => {
    setShipments((prev) => prev.filter((s) => s.id !== shipmentId));
  }, []);

  // Initial fetch and polling setup
  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || authLoading || !isAuthenticated) {
      setLoading(false);
      return;
    }

    fetchShipments();

    // Setup polling as fallback (reduced interval when WebSocket is active)
    if (pollingInterval > 0) {
      pollingTimerRef.current = setInterval(() => {
        fetchShipments({ silent: true });
      }, pollingInterval);
    }

    return () => {
      isMountedRef.current = false;
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [enabled, authLoading, isAuthenticated, fetchShipments, pollingInterval]);

  // Realtime: supply tracking rows are derived from allocations, and the
  // backend broadcasts every allocation/request status change on the public
  // "logistics-updates" channel (LogisticsStatusUpdated → .status.updated).
  // Refetch on those events; normal polling keeps running as the fallback.
  useEffect(() => {
    if (!enabled || !isAuthenticated || authLoading || !user?.id) {
      return;
    }

    if (!getEchoInstance?.()) {
      return;
    }

    reconnectEcho();

    let refetchTimer = null;
    const scheduleRefetch = () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      refetchTimer = setTimeout(() => fetchShipments({ silent: true }), 500);
    };

    let unsubscribe = null;
    try {
      unsubscribe = subscribeChannel("logistics-updates", "public", {
        ".status.updated": scheduleRefetch,
      });
      subscriptionRef.current = unsubscribe;
    } catch (subscriptionError) {
      console.error(
        "Failed to subscribe to logistics updates channel",
        subscriptionError
      );
    }

    return () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      unsubscribe?.();
      subscriptionRef.current = null;
    };
  }, [
    enabled,
    isAuthenticated,
    authLoading,
    user?.id,
    fetchShipments,
  ]);

  return {
    shipments,
    loading,
    error,
    refetch: fetchShipments,
    updateShipment,
    removeShipment,
  };
};

export default useSupplyTracking;
