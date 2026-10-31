// src/components/logistics/registry/MaintenanceSchedule.jsx 
import { useState, useEffect, useMemo } from "react";
import { Plus, Calendar, Clock, X, Save } from "lucide-react";
import assetService from "@/services/assetService";
import { maintenanceCalendarService } from "@/services/maintenanceCalendarService";

const MaintenanceSchedule = ({ maintenanceData, onRefresh, onQuickAction, onScheduleUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    assetId: "",
    scheduledDate: "",
    description: "",
    priority: "medium",
    technician: "",
    estimatedHours: "2",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState([]);
  const [busyId, setBusyId] = useState(null);

  // Open (not completed) items from the real maintenance API, soonest first.
  const upcomingMaintenance = useMemo(
    () =>
      [...(maintenanceData?.overdue || []), ...(maintenanceData?.upcoming || [])]
        .filter((item) => item.status !== "completed")
        .sort((a, b) => String(a.scheduledDate).localeCompare(String(b.scheduledDate))),
    [maintenanceData]
  );

  const { next7Days, thisMonth } = useMemo(() => {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    let week = 0;
    let month = 0;
    upcomingMaintenance.forEach((item) => {
      const d = new Date(item.scheduledDate);
      if (Number.isNaN(d.getTime())) return;
      if (d <= in7) week += 1;
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) month += 1;
    });
    return { next7Days: week, thisMonth: month };
  }, [upcomingMaintenance]);

  useEffect(() => {
    if (!showForm) return;
    assetService
      .getAssets()
      .then((data) => setAssets(Array.isArray(data) ? data : data?.data || []))
      .catch((error) => console.error("Error fetching assets:", error));
  }, [showForm]);

  const refresh = async () => {
    await onRefresh?.();
    onScheduleUpdate?.();
  };

  const handleComplete = async (item) => {
    setBusyId(item.id);
    try {
      await onQuickAction?.("complete", item.id, { notes: "" });
    } finally {
      setBusyId(null);
    }
  };

  const handleReschedule = async (item) => {
    const newDate = window.prompt("New date (YYYY-MM-DD):", item.scheduledDate || "");
    if (!newDate) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      alert("Please enter the date as YYYY-MM-DD.");
      return;
    }
    setBusyId(item.id);
    try {
      await onQuickAction?.("reschedule", item.id, { newDate });
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.assetId || !formData.scheduledDate || !formData.description) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    
    try {
      const hoursNote = formData.estimatedHours && formData.estimatedHours !== "custom"
        ? `Estimated ${formData.estimatedHours} hour(s).`
        : "";
      await maintenanceCalendarService.scheduleMaintenance({
        ...formData,
        notes: [hoursNote, formData.notes].filter(Boolean).join(" "),
      });
      
      // Reset form
      setFormData({
        assetId: "",
        scheduledDate: "",
        description: "",
        priority: "medium",
        technician: "",
        estimatedHours: "2",
        notes: ""
      });
      
      setShowForm(false);
      await refresh();
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
      alert(error?.response?.data?.message || "Failed to schedule maintenance. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Reset form when drawer opens/closes
  useEffect(() => {
    if (!showForm) {
      setFormData({
        assetId: "",
        scheduledDate: "",
        description: "",
        priority: "medium",
        technician: "",
        estimatedHours: "2",
        notes: ""
      });
    }
  }, [showForm]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-900">Scheduled Maintenance</h3>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-yellow-500 text-gray-800 rounded-lg font-semibold hover:bg-yellow-600 transition text-sm w-full sm:w-auto justify-center"
        >
          <Plus className="h-4 w-4" />
          New Schedule
        </button>
      </div>

      {/* Upcoming Maintenance List */}
      <div className="space-y-3">
        {upcomingMaintenance.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p>No upcoming maintenance scheduled.</p>
          </div>
        ) : (
          upcomingMaintenance.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">{item.assetId}</span>
                    </div>
                    <span className="text-sm text-gray-600 hidden sm:inline">({item.assetType || item.assetName})</span>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(item.priority)} w-fit`}>
                      {item.priority} priority
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">📅 {formatDate(item.scheduledDate)}</span>
                    {item.isOverdue && (
                      <span className="flex items-center gap-1 text-red-600 font-semibold">Overdue</span>
                    )}
                    {item.technician && (
                      <span className="flex items-center gap-1">👤 {item.technician}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 justify-end sm:justify-start">
                  <button
                    onClick={() => handleComplete(item)}
                    disabled={busyId === item.id}
                    className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition whitespace-nowrap disabled:opacity-50"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => handleReschedule(item)}
                    disabled={busyId === item.id}
                    className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition whitespace-nowrap disabled:opacity-50"
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="font-semibold text-blue-900 text-sm">Next 7 Days</div>
          <div className="text-blue-700 text-sm">{next7Days} maintenance task{next7Days === 1 ? "" : "s"} scheduled</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
          <div className="font-semibold text-yellow-900 text-sm">This Month</div>
          <div className="text-yellow-700 text-sm">{thisMonth} maintenance task{thisMonth === 1 ? "" : "s"} total</div>
        </div>
      </div>

      {/* Schedule Maintenance Drawer */}
      {showForm && (
        <>
          {/* Full-screen blurred background */}
          <div
            className="fixed inset-0 -bottom-5 z-40 transition-opacity duration-300 opacity-100"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }}
            onClick={() => setShowForm(false)}
          />
          
          {/* Centered Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 opacity-100">
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scroll-smooth transform transition-all duration-300 border border-gray-200 scale-100 opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
                  <div className="flex items-center">
                    <Calendar className="h-6 w-6 text-yellow-600 mr-3" />
                    <h2 className="text-xl font-bold text-gray-900">
                      Schedule Maintenance
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Asset Selection */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Asset *
                      </label>
                      <select
                        value={formData.assetId}
                        onChange={(e) => handleChange('assetId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                        required
                      >
                        <option value="">Choose an asset...</option>
                        {assets.map(asset => (
                          <option key={asset.id} value={asset.id}>
                            {asset.id} - {asset.name || asset.type} ({asset.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Scheduled Date */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Scheduled Date *
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          value={formData.scheduledDate}
                          onChange={(e) => handleChange('scheduledDate', e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                          required
                        />
                      </div>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority *
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => handleChange('priority', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                        required
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    {/* Estimated Hours */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Hours
                      </label>
                      <select
                        value={formData.estimatedHours}
                        onChange={(e) => handleChange('estimatedHours', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                      >
                        <option value="1">1 hour</option>
                        <option value="2">2 hours</option>
                        <option value="4">4 hours</option>
                        <option value="8">8 hours</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    {/* Technician */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assigned Technician
                      </label>
                      <input
                        type="text"
                        value={formData.technician}
                        onChange={(e) => handleChange('technician', e.target.value)}
                        placeholder="Enter technician name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                      />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        rows="3"
                        placeholder="Describe the maintenance work to be performed..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm resize-none"
                        required
                      />
                    </div>

                    {/* Notes */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Notes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        rows="2"
                        placeholder="Any additional information or special instructions..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm resize-none"
                      />
                    </div>
                  </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium text-sm"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-gray-800 rounded-lg hover:bg-yellow-600 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-800"></div>
                          Scheduling...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Schedule Maintenance
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MaintenanceSchedule;