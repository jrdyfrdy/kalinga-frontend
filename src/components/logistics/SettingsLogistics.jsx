import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, User, Bell, Cog, Lock, ChevronDown, ChevronRight } from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/config/routes";

const Field = ({ label, children }) => (
  <label className="flex flex-col gap-1 text-sm">
    <span className="text-xs font-semibold text-gray-500">{label}</span>
    {children}
  </label>
);

const inputClass =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center justify-between gap-3 py-1 text-sm">
    <span>{label}</span>
    <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
  </label>
);

function DevicesPanel() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/devices")
      .then(({ data }) => setDevices(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load devices", err))
      .finally(() => setLoading(false));
  }, []);

  const logoutDevice = async (id) => {
    if (!window.confirm("Log out this device?")) return;
    try {
      await api.post(`/devices/${id}/logout`);
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to log out device.");
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading sessions…</p>;
  if (!devices.length) return <p className="text-sm text-gray-500">No active sessions.</p>;

  return (
    <ul className="divide-y divide-gray-100">
      {devices.map((d) => (
        <li key={d.id} className="flex items-center justify-between py-2 text-sm">
          <div>
            <p className="font-medium">
              {d.device_name}
              {d.is_current && <span className="ml-2 rounded-full bg-green-100 px-2 text-xs text-green-700">This device</span>}
            </p>
            <p className="text-xs text-gray-500">
              {d.ip_address || "Unknown IP"} · last active {d.last_active ? new Date(d.last_active).toLocaleString() : "—"}
            </p>
          </div>
          {!d.is_current && (
            <button onClick={() => logoutDevice(d.id)} className="text-xs font-semibold text-red-600 hover:underline">
              Log out
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function PasswordPanel() {
  const [form, setForm] = useState({ current_password: "", new_password: "", new_password_confirmation: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.new_password.length < 8) return alert("New password must be at least 8 characters.");
    if (form.new_password !== form.new_password_confirmation) return alert("Passwords do not match.");
    setSaving(true);
    try {
      await api.post("/change-password", form);
      alert("Password changed. Other sessions were signed out.");
      setForm({ current_password: "", new_password: "", new_password_confirmation: "" });
    } catch (err) {
      const errors = err?.response?.data?.errors;
      alert(errors ? Object.values(errors).flat().join("\n") : "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
      {[
        ["current_password", "Current password"],
        ["new_password", "New password"],
        ["new_password_confirmation", "Confirm new password"],
      ].map(([key, label]) => (
        <Field key={key} label={label}>
          <input
            type="password"
            className={inputClass}
            value={form[key]}
            onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
            autoComplete={key === "current_password" ? "current-password" : "new-password"}
          />
        </Field>
      ))}
      <div className="sm:col-span-3">
        <button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? "Saving…" : "Change password"}
        </button>
      </div>
    </form>
  );
}

function AlertSettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [mute, setMute] = useState(null);

  useEffect(() => {
    api.get("/notifications/alert-settings").then(({ data }) => setSettings(data)).catch(() => setSettings({}));
    api.get("/notifications/mute").then(({ data }) => setMute(data)).catch(() => setMute(null));
  }, []);

  const save = async (next) => {
    setSettings(next);
    try {
      await api.post("/notifications/alert-settings", next);
    } catch {
      alert("Failed to save alert settings.");
    }
  };

  const muteFor = async (duration, unit) => {
    try {
      const { data } = unit
        ? await api.post("/notifications/mute", { duration, unit })
        : await api.delete("/notifications/mute");
      setMute(data);
    } catch {
      alert("Failed to update mute setting.");
    }
  };

  if (!settings) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-3">
      <Toggle label="New request alerts" checked={settings.New_incident_alerts} onChange={(v) => save({ ...settings, New_incident_alerts: v })} />
      <Toggle label="Critical alerts" checked={settings.critical_alerts} onChange={(v) => save({ ...settings, critical_alerts: v })} />
      <Toggle label="Messages" checked={settings.messages} onChange={(v) => save({ ...settings, messages: v })} />
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 text-sm">
        <span className="text-gray-600">
          {mute?.muted
            ? mute.permanent
              ? "Notifications muted"
              : `Muted until ${new Date(mute.muted_until).toLocaleString()}`
            : "Notifications on"}
        </span>
        <button onClick={() => muteFor(1, "hours")} className="rounded-full border px-3 py-1 text-xs">Mute 1h</button>
        <button onClick={() => muteFor(8, "hours")} className="rounded-full border px-3 py-1 text-xs">Mute 8h</button>
        {mute?.muted && (
          <button onClick={() => muteFor(null, null)} className="rounded-full border px-3 py-1 text-xs text-primary">
            Unmute
          </button>
        )}
      </div>
    </div>
  );
}

function PreferencesPanel({ fields }) {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    language: user?.language || "English",
    theme: user?.theme || "Light",
    visibility: user?.visibility || "Public",
    availability: user?.availability || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      // PUT /profile requires name + email alongside the preference fields.
      const { data } = await api.put("/profile", { name: user?.name, email: user?.email, ...form });
      const updated = { ...user, ...(data?.user || form) };
      setUser?.(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      alert("Preferences saved.");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const options = {
    language: ["English", "Filipino"],
    theme: ["Light", "Dark"],
    visibility: ["Public", "Private"],
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((key) =>
        options[key] ? (
          <Field key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
            <select className={inputClass} value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}>
              {options[key].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
        ) : (
          <Field key={key} label="Availability">
            <input
              className={inputClass}
              value={form[key]}
              placeholder="e.g. Weekdays 8am–5pm"
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
            />
          </Field>
        ),
      )}
      <div className="sm:col-span-2">
        <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function LogisSettings() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);

  const sections = useMemo(
    () => [
      {
        title: "Account & Security",
        icon: <Shield size={18} className="text-green-600 mr-2" />,
        items: [
          { label: "Personal Information", onClick: () => navigate(ROUTES.LOGISTICS.PROFILE) },
          { label: "Change Password", panel: <PasswordPanel /> },
          { label: "Logged in Devices", panel: <DevicesPanel /> },
        ],
      },
      {
        title: "Professional Information",
        icon: <User size={18} className="text-green-600 mr-2" />,
        items: [
          { label: "Role and Position", onClick: () => navigate(ROUTES.LOGISTICS.PROFILE) },
          { label: "Availability", panel: <PreferencesPanel fields={["availability"]} /> },
        ],
      },
      {
        title: "Notifications",
        icon: <Bell size={18} className="text-green-600 mr-2" />,
        items: [
          { label: "Priority Alerts & Mute", panel: <AlertSettingsPanel /> },
          { label: "Notification Inbox", onClick: () => navigate(ROUTES.LOGISTICS.NOTIFICATIONS) },
        ],
      },
      {
        title: "System Preferences",
        icon: <Cog size={18} className="text-green-600 mr-2" />,
        items: [{ label: "Language & Theme", panel: <PreferencesPanel fields={["language", "theme"]} /> }],
      },
      {
        title: "Privacy and Data",
        icon: <Lock size={18} className="text-green-600 mr-2" />,
        items: [{ label: "Visibility Settings", panel: <PreferencesPanel fields={["visibility"]} /> }],
      },
    ],
    [navigate],
  );

  const q = query.trim().toLowerCase();
  const visible = sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !q || i.label.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)) }))
    .filter((s) => s.items.length);

  return (
    <div className="p-5 bg-gray-50 min-h-[calc(100vh-140px)] font-sans text-left">
      <header className="mb-6 p-4 bg-white rounded-xl shadow-md text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-extrabold text-primary">Settings</h1>
      </header>

      <div className="mb-5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find the setting you need"
          className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      {visible.length === 0 && <p className="text-sm text-gray-500">No settings match “{query}”.</p>}

      {visible.map((section) => (
        <div key={section.title} className="bg-white border border-gray-200 rounded-xl p-4 mb-5 shadow-sm">
          <h3 className="flex items-center text-base font-semibold mb-3 text-gray-900">
            {section.icon}
            {section.title}
          </h3>
          <ul className="divide-y divide-gray-100">
            {section.items.map((item) => {
              const key = `${section.title}:${item.label}`;
              const isOpen = open === key;
              return (
                <li key={key} className="py-2">
                  <button
                    type="button"
                    onClick={() => (item.panel ? setOpen(isOpen ? null : key) : item.onClick?.())}
                    className="flex w-full items-center justify-between text-sm text-gray-700 hover:text-primary"
                  >
                    {item.label}
                    {item.panel && isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {item.panel && isOpen && <div className="mt-3">{item.panel}</div>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
