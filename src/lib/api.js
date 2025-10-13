// API Configuration
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// Helper function for API requests
const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("API Request Failed:", error);
    throw error;
  }
};

// API Endpoints
export const api = {
  // Health check
  status: () => apiFetch("/status"),

  // Incidents
  incidents: {
    getAll: () => apiFetch("/responder/incidents"),
    getById: (id) => apiFetch(`/responder/incidents/${id}`),
    create: (data) =>
      apiFetch("/admin/incidents", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiFetch(`/responder/incidents/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      apiFetch(`/admin/incidents/${id}`, {
        method: "DELETE",
      }),
  },

  // Emergency Reports
  emergencyReports: {
    create: (data) =>
      apiFetch("/resident/emergency-reports", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getById: (id) => apiFetch(`/resident/emergency-reports/${id}`),
  },

  // Evacuation Centers
  evacuationCenters: {
    getAll: () => apiFetch("/public/evacuation-centers"),
    create: (data) =>
      apiFetch("/admin/evacuation-centers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiFetch(`/admin/evacuation-centers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  // Hospitals
  hospitals: {
    getAll: () => apiFetch("/public/hospitals"),
    getNearby: (lat, lng) =>
      apiFetch(`/responder/hospitals/nearby?lat=${lat}&lng=${lng}`),
  },

  // Responders
  responders: {
    getRoster: () => apiFetch("/responder/roster"),
  },

  // Patients
  patients: {
    getAll: () => apiFetch("/responder/patients"),
    create: (data) =>
      apiFetch("/responder/patients", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getAppointments: () => apiFetch("/patient/appointments"),
    getHealthRecords: () => apiFetch("/patient/health-records"),
    getMessages: () => apiFetch("/patient/messages"),
  },

  // Assets (Logistics)
  assets: {
    getAll: () => apiFetch("/logistics/assets"),
    create: (data) =>
      apiFetch("/logistics/assets", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiFetch(`/logistics/assets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  // Supplies (Logistics)
  supplies: {
    getAll: () => apiFetch("/logistics/supplies"),
    create: (data) =>
      apiFetch("/logistics/supplies", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiFetch(`/logistics/supplies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    getStats: () => apiFetch("/logistics/dashboard/stats"),
  },

  // Notifications
  notifications: {
    getAll: () => apiFetch("/resident/notifications"),
    markAsRead: (id) =>
      apiFetch(`/resident/notifications/${id}/read`, {
        method: "PATCH",
      }),
  },

  // Admin Dashboard
  admin: {
    getStats: () => apiFetch("/admin/dashboard/stats"),
  },
};

export default api;
