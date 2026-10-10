// src/services/logisticsService.js
import api from './api';
import { handlingCapability } from '../utils/handlingClass';

const logisticsService = {
  // Get full allocation with hospital names (Phase 3)
  getAllocation: async (allocationId) => {
    const response = await api.get(`/allocations/${allocationId}`);
    return response.data;
  },

  // Get available vehicles
  getAvailableVehicles: async (handlingClass) => {
    // Accepts "ColdChain", "Cold Chain", "cold_chain", ... (allocations use
    // a different spelling than requests).
    const normalized = handlingCapability(handlingClass);

    const response = await api.get('/assets/available', {
      params: { handling_class: normalized }
    });
    return response.data;
  },

  // Get available responders 
  getAvailableResponders: async (handlingClass) => {
    // Accepts "ColdChain", "Cold Chain", "cold_chain", ... (allocations use
    // a different spelling than requests).
    const normalized = handlingCapability(handlingClass);

    const response = await api.get('/responders/available', {
      params: { handling_class: normalized }
    });
    return response.data;
  },

 
  // Assign vehicle + responder → status = logistics_assigned
assignLogistics: async (allocationId, payload) => {
    const response = await api.patch(`/allocations/${allocationId}/assign`, payload);
    return response.data;
  },

  // Optional: Reassign logistics
  reassignLogistics: async (allocationId, payload) => {
    const response = await api.patch(`/allocations/${allocationId}/reassign`, payload);
    return response.data;
  },

  // Get current assignment details (for edit mode)
  getAssignmentDetails: async (allocationId) => {
    const response = await api.get(`/allocations/${allocationId}/assignment`);
    return response.data;
  },


// RECOMMENDED VEHICLE — GREEN STAR CARD
getSuggestedVehicle: async (allocationId) => {
  return api.get(`/allocations/${allocationId}/suggest-vehicle`);
},

// RECOMMENDED RESPONDER — GREEN STAR CARD
getSuggestedResponder: async (allocationId) => {
  return api.get(`/allocations/${allocationId}/suggest-responder`);
},


// OPTIONAL – current assignment
getCurrentAssignment: async (allocationId) => {
  return api.get(`/allocations/${allocationId}/assignment`);
}

};

export default logisticsService;