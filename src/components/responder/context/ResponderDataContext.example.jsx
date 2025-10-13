/**
 * Example: Integrating Backend API with Responder Dashboard
 *
 * This file demonstrates how to replace demo data from ResponderDataContext
 * with real API calls to the Laravel backend.
 *
 * BEFORE: Using hardcoded demo data
 * AFTER: Fetching from backend API
 */

import { createContext, useContext, useState, useEffect } from "react";
import api from "@/lib/api";

// Create context
const ResponderDataContext = createContext();

// Custom hook to use the context
export const useResponderData = () => {
  const context = useContext(ResponderDataContext);
  if (!context) {
    throw new Error(
      "useResponderData must be used within ResponderDataProvider"
    );
  }
  return context;
};

// Provider component with API integration
export const ResponderDataProvider = ({ children }) => {
  // State management
  const [incidents, setIncidents] = useState([]);
  const [roster, setRoster] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch incidents, roster, and patients in parallel
      const [incidentsData, rosterData, patientsData] = await Promise.all([
        api.incidents.getAll(),
        api.responders.getRoster(),
        api.patients.getAll(),
      ]);

      setIncidents(incidentsData);
      setRoster(rosterData);
      setPatients(patientsData);
    } catch (err) {
      console.error("Failed to fetch responder data:", err);
      setError("Failed to load data. Please try again.");

      // Optionally fall back to demo data if API fails
      // loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  // Update incident status
  const updateIncidentStatus = async (incidentId, newStatus) => {
    try {
      const updatedIncident = await api.incidents.update(incidentId, {
        status: newStatus,
      });

      // Update local state
      setIncidents((prevIncidents) =>
        prevIncidents.map((incident) =>
          incident.id === incidentId ? updatedIncident : incident
        )
      );

      return { success: true };
    } catch (err) {
      console.error("Failed to update incident:", err);
      return { success: false, error: err.message };
    }
  };

  // Add new patient
  const addPatient = async (patientData) => {
    try {
      const newPatient = await api.patients.create(patientData);

      // Update local state
      setPatients((prevPatients) => [...prevPatients, newPatient]);

      return { success: true, data: newPatient };
    } catch (err) {
      console.error("Failed to add patient:", err);
      return { success: false, error: err.message };
    }
  };

  // Refresh data manually
  const refresh = () => {
    fetchAllData();
  };

  // Context value
  const value = {
    incidents,
    roster,
    patients,
    loading,
    error,
    updateIncidentStatus,
    addPatient,
    refresh,
  };

  return (
    <ResponderDataContext.Provider value={value}>
      {children}
    </ResponderDataContext.Provider>
  );
};

export default ResponderDataContext;

/**
 * USAGE EXAMPLE:
 *
 * 1. Wrap your responder routes with the provider:
 *
 *    import { ResponderDataProvider } from './components/responder/context/ResponderDataContext';
 *
 *    <ResponderDataProvider>
 *      <ResponderDashboard />
 *      <ResponderIncidents />
 *      <ResponderRoster />
 *    </ResponderDataProvider>
 *
 *
 * 2. Use the hook in your components:
 *
 *    import { useResponderData } from './components/responder/context/ResponderDataContext';
 *
 *    function IncidentsList() {
 *      const { incidents, loading, error, updateIncidentStatus } = useResponderData();
 *
 *      if (loading) return <div>Loading...</div>;
 *      if (error) return <div>Error: {error}</div>;
 *
 *      return (
 *        <div>
 *          {incidents.map(incident => (
 *            <div key={incident.id}>
 *              <h3>{incident.code}</h3>
 *              <p>{incident.description}</p>
 *              <button onClick={() => updateIncidentStatus(incident.id, 'resolved')}>
 *                Mark Resolved
 *              </button>
 *            </div>
 *          ))}
 *        </div>
 *      );
 *    }
 *
 *
 * 3. Handle loading and error states:
 *
 *    function Dashboard() {
 *      const { incidents, loading, error, refresh } = useResponderData();
 *
 *      if (loading) {
 *        return (
 *          <div className="flex items-center justify-center h-screen">
 *            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
 *          </div>
 *        );
 *      }
 *
 *      if (error) {
 *        return (
 *          <div className="p-4 bg-red-100 text-red-700 rounded">
 *            <p>{error}</p>
 *            <button onClick={refresh} className="mt-2 px-4 py-2 bg-red-600 text-white rounded">
 *              Retry
 *            </button>
 *          </div>
 *        );
 *      }
 *
 *      return <div>Dashboard content...</div>;
 *    }
 *
 *
 * 4. Real-time updates with polling (optional):
 *
 *    useEffect(() => {
 *      // Poll for updates every 30 seconds
 *      const interval = setInterval(() => {
 *        refresh();
 *      }, 30000);
 *
 *      return () => clearInterval(interval);
 *    }, [refresh]);
 */
