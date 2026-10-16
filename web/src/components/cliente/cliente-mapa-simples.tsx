"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const marcadorIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#9c5523;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 18],
});

export function ClienteMapaSimples({ lat, lng, className }: { lat: number; lng: number; className?: string }) {
  return (
    <MapContainer center={[lat, lng]} zoom={16} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} zoomControl={false} className={className} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} icon={marcadorIcon} />
    </MapContainer>
  );
}
