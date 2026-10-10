// src/services/maintenanceCalendarService.js
// Calendar-friendly wrapper around the real maintenance API
// (backend MaintenanceController via maintenanceService).
import maintenanceService from './maintenanceService';

// The UI uses "in-progress"; the API stores "in_progress".
const toUiStatus = (status) => (status === 'in_progress' ? 'in-progress' : status);
const toApiStatus = (status) => (status === 'in-progress' ? 'in_progress' : status);

const normalizeItem = (item) => ({
  ...item,
  status: toUiStatus(item.status),
  assetType: item.assetType || item.assetName || 'Unknown',
  assetName: item.assetName || item.assetType || item.assetId,
  assetLocation: item.assetLocation || 'Unknown Location',
  assetCategory: item.assetCategory || 'Unknown Category',
  assetCondition: item.assetCondition || 'Unknown',
  priority: item.priority || 'medium',
});

export const maintenanceCalendarService = {
  // Returns { upcoming, overdue, completed } enriched for the calendar views.
  getCalendarData: async () => {
    const data = await maintenanceService.getMaintenanceData();
    return {
      upcoming: (data?.upcoming || []).map(normalizeItem),
      overdue: (data?.overdue || []).map(normalizeItem),
      completed: (data?.completed || []).map(normalizeItem),
    };
  },

  rescheduleMaintenance: async (maintenanceId, newDate) =>
    maintenanceService.rescheduleMaintenance(maintenanceId, newDate),

  updateMaintenanceStatus: async (maintenanceId, status, notes = '') =>
    maintenanceService.updateMaintenanceStatus(maintenanceId, toApiStatus(status), notes || null),

  scheduleMaintenance: async (formData) =>
    maintenanceService.scheduleMaintenance({
      asset_id: formData.assetId,
      scheduled_date: formData.scheduledDate,
      description: formData.description,
      priority: formData.priority,
      technician: formData.technician || null,
      cost: formData.estimatedCost === '' || formData.estimatedCost == null ? null : Number(formData.estimatedCost),
      notes: formData.notes || null,
    }),
};

// Asset type icons mapping
export const assetTypeIcons = {
  'Ambulance': '🚑',
  'Fire Truck': '🚒',
  'Generator': '⚡',
  'Rescue Boat': '🚤',
  'Mobile Command': '📡',
  'Water Purifier': '💧',
  'ATV': '🏍️',
  'Field Hospital': '🏥',
  'Defibrillator': '💓',
  'Medical Supplies': '🩺',
  'Fire Engine': '🚒',
  'Rescue Truck': '🚛',
  'Hazmat Unit': '☣️',
  'Power Distribution': '🔌',
  'Patrol Boat': '🛥️',
  'Satellite Trailer': '📡',
  'Radio Repeater': '📻',
  'UTV': '🛵',
  'Water Tanker': '🚛',
  'Portable Ventilator': '🫁',
  'Mobile Kitchen': '🍳',
  'Fuel Truck': '⛽',
  'Light Tower': '💡',
  'Decontamination Unit': '🧼',
  'Ambulance Bus': '🚌',
  'Air Compressor': '💨',
  'Mobile Laboratory': '🔬',
  'Search & Rescue Truck': '🔍',
  'Thermal Camera': '📷',
  'Command Trailer': '🎛️',
  'Helicopter': '🚁',
  'Drone': '🛸',
  'Mobile Workshop': '🛠️',
  'Patient Transport': '♿',
  'Oxygen Concentrator': '💨',
  'Shelter System': '⛺',
  'Utility Truck': '🚚',
  'Water Pump': '💦',
  'Mobile Morgue': '⚰️',
  'Incident Response': '🚨',
  'Gas Detector': '📊',
  'Mobile Pharmacy': '💊',
  'Equipment': '⚙️',
  'Unknown': '❓'
};

// Priority colors mapping
export const priorityColors = {
  'high': { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' },
  'medium': { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800' },
  'low': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' }
};