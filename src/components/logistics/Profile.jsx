import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { User, Phone, Mail, MapPin, Calendar, Edit3, Download, Save, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";

const formatJoined = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export default function LogisProfile() {
  const qrRef = useRef(null);
  const [showButton, setShowButton] = useState(false);
  const { user: authUser, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  const hospitals = (authUser?.hospitals || []).map((h) => h.name).filter(Boolean);
  const roleLabel = authUser?.role
    ? authUser.role.charAt(0).toUpperCase() + authUser.role.slice(1)
    : "Logistics";

  const user = {
    name: authUser?.name || "—",
    role: hospitals.length ? `${roleLabel} · ${hospitals.join(", ")}` : roleLabel,
    phone: authUser?.phone || authUser?.contact_number || "—",
    email: authUser?.email || "—",
    location: authUser?.address || [authUser?.city, authUser?.barangay].filter(Boolean).join(", ") || "—",
    joined: formatJoined(authUser?.created_at),
    qrValue: [authUser?.name, roleLabel, authUser?.email].filter(Boolean).join(" | ") || "Kalinga user",
  };

  const startEdit = () => {
    setForm({
      name: authUser?.name || "",
      phone: authUser?.phone || "",
      address: authUser?.address || "",
    });
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!form.name.trim()) {
      alert("Name is required.");
      return;
    }
    setSaving(true);
    try {
      // PUT /api/profile requires name + email (AuthController::updateProfile)
      const { data } = await api.put("/profile", {
        name: form.name.trim(),
        email: authUser?.email,
        phone: form.phone || null,
        address: form.address || null,
      });
      const updated = { ...authUser, ...(data?.user || {}) };
      setUser?.(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      setEditing(false);
    } catch (error) {
      console.error("Failed to update profile", error);
      alert(error?.response?.data?.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const downloadQR = () => {
    const canvas = qrRef.current.querySelector("canvas");
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${user.name}_QR.png`;
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Layout wrapper */}
      <div className="flex-1 m-5 p-5 overflow-y-auto flex justify-center">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-md p-5 flex flex-col gap-5">
          {/* Header Section */}
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4 flex-1 min-w-[250px]">
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-green-600">
                <User size={40} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                <p className="text-green-600 text-sm font-semibold mt-1">{user.role}</p>
              </div>
            </div>

            {editing ? (
              <div className="flex gap-2">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={startEdit}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
              >
                <Edit3 size={16} />
                Edit Profile
              </button>
            )}
          </div>

          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: "name", label: "Full name" },
                { key: "phone", label: "Phone" },
                { key: "address", label: "Address" },
              ].map(({ key, label }) => (
                <label key={key} className="flex flex-col text-left text-sm">
                  <span className="text-xs text-gray-500 font-semibold mb-1">{label}</span>
                  <input
                    value={form[key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                  />
                </label>
              ))}
            </div>
          )}

          {/* Info Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem icon={<Phone size={18} className="text-green-600" />} label="Phone" value={user.phone} />
            <InfoItem icon={<Mail size={18} className="text-green-600" />} label="Email" value={user.email} />
            <InfoItem icon={<MapPin size={18} className="text-green-600" />} label="Location" value={user.location} />
            <InfoItem icon={<Calendar size={18} className="text-green-600" />} label="Joined" value={user.joined} />
          </div>

          {/* QR Code Section */}
          <div
            ref={qrRef}
            className="relative text-center border-t border-gray-200 pt-5"
            onMouseEnter={() => setShowButton(true)}
            onMouseLeave={() => setShowButton(false)}
            onClick={() => setShowButton((prev) => !prev)} // For mobile tap toggle
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-3">QR Code</h3>

            <div className="inline-block bg-white p-3 rounded-xl shadow">
              <QRCodeCanvas
                value={user.qrValue}
                size={160}
                bgColor="#ffffff"
                fgColor="#16a34a"
              />
            </div>

            <p className="text-gray-600 text-sm mt-2">Scan to view profile info</p>

            {/* Hover/Tap Button */}
            <button
              onClick={downloadQR}
              className={`flex items-center justify-center gap-2 mx-auto mt-4 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-opacity duration-300 ${
                showButton ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <Download size={16} />
              Download QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Info field component */
function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 shadow-inner">
      {icon}
      <div className="flex flex-col text-left">
        <span className="text-xs text-gray-500 font-semibold">{label}</span>
        <span className="text-sm text-gray-800 font-medium">{value}</span>
      </div>
    </div>
  );
}
