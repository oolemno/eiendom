import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { EnturStop, OverpassPOI } from "../lib/api.ts";

// Fix missing default marker icon in bundled Leaflet
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface StedKartProps {
  lat: number;
  lon: number;
  holdeplasser: EnturStop[];
  dagligvare: OverpassPOI[];
  skoler: OverpassPOI[];
}

export function StedKart({
  lat,
  lon,
  holdeplasser,
  dagligvare,
  skoler,
}: StedKartProps) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm">
      <MapContainer
        center={[lat, lon]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: 300, width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lon]} icon={defaultIcon}>
          <Popup>Frogner plass</Popup>
        </Marker>

        {holdeplasser.map((s, i) => (
          <CircleMarker
            key={`stop-${i}`}
            center={[s.lat, s.lon]}
            radius={5}
            pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.7 }}
          >
            <Popup>
              {s.name} ({s.distance}m)
            </Popup>
          </CircleMarker>
        ))}

        {dagligvare.map((p, i) => (
          <CircleMarker
            key={`shop-${i}`}
            center={[p.lat, p.lon]}
            radius={5}
            pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.7 }}
          >
            <Popup>{p.name}</Popup>
          </CircleMarker>
        ))}

        {skoler.map((p, i) => (
          <CircleMarker
            key={`school-${i}`}
            center={[p.lat, p.lon]}
            radius={5}
            pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.7 }}
          >
            <Popup>{p.name}</Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
