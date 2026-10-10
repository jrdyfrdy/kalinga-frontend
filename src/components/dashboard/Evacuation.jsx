import React, { useEffect, useMemo, useState } from "react";
import {shelterMapImg} from "@images";
import api from "../../services/api";
import { getCurrentLocation } from "../../utils/location";

const formatUpdated = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : `As of ${d.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`;
};

export default function EvacCenter() {
  const [centerOpen, setCenterOpen] = useState(false);
  const [centers, setCenters] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Evacuation centers come from GET /api/evacuation-centers (sorted by
  // distance when the device location is available).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      let params = {};
      try {
        const loc = await getCurrentLocation({ timeout: 6000 });
        if (loc.ok) params = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      } catch {
        // location is optional
      }
      try {
        const { data } = await api.get("/evacuation-centers", { params });
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : data?.data || [];
        setCenters(rows);
        setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
      } catch (err) {
        console.error("Failed to load evacuation centers", err);
        if (!cancelled) setError("Unable to load evacuation centers right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => centers.find((c) => c.id === selectedId) || centers[0] || null,
    [centers, selectedId]
  );

  const center = {
    name: selected?.name || (loading ? "Loading…" : "No evacuation centers"),
    address: selected?.address || "",
    contact: selected?.contact || "",
    update: formatUpdated(selected?.updated_at),
    occupied: selected ? String(selected.occupied ?? 0) : "—",
    available: selected ? String(selected.available ?? Math.max(0, (selected.capacity || 0) - (selected.occupied || 0))) : "—",
    distance:
      selected?.distance_km != null ? `${Number(selected.distance_km).toFixed(1)} km` : "unknown distance",
    resources: selected?.resources || {},
  };
  const selectedLabel = selected?.name || "Select center";

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[5fr_3fr] gap-3">
      <div className="bg-green-500 lg:row-span-3 min-h-[270px] relative rounded-xl overflow-hidden">
        <img src={shelterMapImg}
          alt="Metro Manila Map"
          className="absolute inset-0 w-full h-full object-cover z-0"/>
        <div className="absolute bottom-0 w-full h-[150px] z-10"
          style={{
            background: "linear-gradient(to top, #1A4718, rgba(26, 71, 24, 0.7), transparent)"
          }}
        ></div>

        <div className="absolute bottom-4 left-4 z-20 text-sm text-white text-left">
          <p className="text-[11px] font-normal mt-10 md:mt-20 lg:mt-[90px] mb-0 ml-4 lg:ml-[25px]">{`Nearest Evacuation Center: ${center.distance} away.`}</p>
          <p className="text-xl md:text-2xl font-extrabold mt-0.5 mb-0.5 ml-4 lg:ml-[25px]">{center.name}</p>
          <p className="text-base font-normal mt-0.5 mb-0.5 ml-4 lg:ml-[25px]">{center.address}</p>
          <p className="text-base font-normal mt-0.5 mb-0 ml-4 lg:ml-[25px]">{center.contact}</p>
        </div>
      </div>
      <div className="bg-none min-h-[60px] rounded-md">
        <div className="flex flex-row justify-between">
          <h1 className="text-3xl font-bold text-[#1A4718]">Evacuation Center</h1>
          <div className="relative inline-block">
            <button
              className="bg-[#f0d003] text-white border-none text-xs font-bold rounded-xl px-3 py-1.5 cursor-pointer mt-0 hover:bg-[#2c6b25]"
              onClick={() => setCenterOpen(!centerOpen)}
            >
              {selectedLabel} ▼
            </button>

            {centerOpen && (
              <ul className="absolute left-0 top-full mt-1 bg-white border border-gray-300 rounded-s min-w-[120px] shadow-lg py-2 z-10">
                {centers.map((c) => (
                  <li
                    key={c.id}
                    className="text-[#1A4718] text-sm list-none py-2 px-3 cursor-pointer hover:bg-gray-200"
                    onClick={() => {
                      setSelectedId(c.id);
                      setCenterOpen(false);
                    }}
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
          <p className="text-[15px] mt-1 text-left">{error || center.update}</p>
      </div>


      <div className="bg-[#1A4718] min-h-[200px] rounded-xl px-4 py-3 text-white flex flex-col justify-start">
        <p className="text-lg font-bold mb-6">Shelter Population</p>
        <div className="flex flex-row items-center justify-around gap-4">
          <div className="flex flex-col items-center justify-center gap-2">
            <h3 className="text-5xl font-extrabold leading-none mb-1">{center.occupied}</h3>
            <p className="text-base font-medium mt-0">Current Evacuees:</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-2">
            <h3
              className={`text-5xl font-extrabold leading-none mb-1 ${
                parseInt(center.available) > 0 ? "text-[#f0d003]  " : "text-white"
              }`}
            >
              {center.available}
            </h3>
            <p className="text-base font-medium mt-0">Available Spaces:</p>
          </div>
        </div>
      </div>
      <div className="bg-none min-h-[340px] rounded-md flex flex-col">
        <h3 className="font-bold text-lg ml-2 mt-1.5 mb-0 text-left">Resources and Supplies</h3>
        <p className="text-xs font-normal mt-0.5 ml-2 mb-0 text-left">See essentials ready at the center.</p>
        <div className="grid grid-cols-2 gap-2 bg-none mx-[5px] mt-1   flex-grow overflow-y-auto rounded-md">
          <div className="font-bold text-sm text-white bg-[#1A4718] px-0.5 py-0.5 rounded-sm text-center mt-1.5">
            Category
          </div>
          <div className="font-bold text-sm text-white bg-[#1A4718] px-0.5 py-0.5 rounded-sm text-center mt-1.5">
            Distribution
          </div>
          {Object.entries(center.resources).map(([category, info]) => (
            <React.Fragment key={category}>
              <div className="p-0.5 border-b border-[#f0d003] text-xs text-center">
                {category}
              </div>
              <div className="p-0.5 border-b border-[#f0d003] text-xs text-center">
                {info.distribution}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
