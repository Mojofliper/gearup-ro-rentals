import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface Props {
  lat: number;
  lng: number;
  address: string;
}

// Fix default marker icon issue in Leaflet with Webpack
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

export const MapCard: React.FC<Props> = ({ lat, lng, address }) => {
  return (
    <div className="rounded border overflow-hidden">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        style={{ height: 300, width: "100%" }}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
        />
        <Marker position={[lat, lng]} icon={markerIcon}>
          <Popup>{address}</Popup>
        </Marker>
      </MapContainer>
      <div className="p-2 text-sm text-muted-foreground">{address}</div>
    </div>
  );
};
