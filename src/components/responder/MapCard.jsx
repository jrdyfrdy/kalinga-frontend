import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import nodeApi from "../../services/nodeApi";
import { Card, CardDescription, CardHeader, CardTitle, LoadingState } from "@/components/ui";

const MANILA = [14.5995, 120.9842];

// ✅ Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const SetViewOnLocation = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView(coords, 13);
  }, [coords, map]);
  return null;
};

const MapCard = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);

  useEffect(() => {
    nodeApi
      .get("/hospitals", { params: { limit: 20 } })
      .then(({ data }) => {
        const list = (data?.data || []).filter(
          (h) => h.latitude && h.longitude,
        );
        setHospitals(list);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const fallback = () => setUserLocation((current) => current || MANILA);
    if (!navigator.geolocation) return fallback();
    // Don't wait forever on an unanswered permission prompt.
    const timer = setTimeout(fallback, 8000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        clearTimeout(timer);
        fallback();
      },
      { timeout: 8000, maximumAge: 60000 },
    );
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader>
        <CardTitle>Nearest hospitals</CardTitle>
        <CardDescription>{hospitals.length ? `${hospitals.length} facilities on the map` : "Facilities near your location"}</CardDescription>
      </CardHeader>
      <div className="relative min-h-[380px] flex-1 border-t border-border">
        {userLocation ? (
          <MapContainer center={userLocation} zoom={13} className="absolute inset-0 size-full">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <Marker position={userLocation}>
              <Popup>You are here</Popup>
            </Marker>
            {hospitals.map((h) => (
              <Marker key={h.id} position={[parseFloat(h.latitude), parseFloat(h.longitude)]}>
                <Popup>
                  <strong>{h.name}</strong>
                  <br />
                  {h.level || h.code}
                  {h.bed_capacity && (
                    <>
                      <br />
                      Beds: {h.current_occupancy}/{h.bed_capacity}
                    </>
                  )}
                </Popup>
              </Marker>
            ))}
            <SetViewOnLocation coords={userLocation} />
          </MapContainer>
        ) : (
          <LoadingState className="absolute inset-0" label="Finding your location…" />
        )}
      </div>
    </Card>
  );
};

export default MapCard;
