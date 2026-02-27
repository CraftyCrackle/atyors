'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const servicerIcon = new L.DivIcon({
  html: '<div style="width:20px;height:20px;background:#1b70f5;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  className: '',
});

const customerIcon = new L.DivIcon({
  html: '<div style="width:16px;height:16px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: '',
});

function FitBounds({ servicerPos, customerPos }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!servicerPos || !customerPos) return;
    if (fittedRef.current) return;
    const bounds = L.latLngBounds(
      [servicerPos.lat, servicerPos.lng],
      [customerPos.lat, customerPos.lng]
    );
    map.fitBounds(bounds.pad(0.3));
    fittedRef.current = true;
  }, [servicerPos, customerPos, map]);

  return null;
}

export default function TrackingMap({ servicerPos, customerPos }) {
  const center = servicerPos
    ? [servicerPos.lat, servicerPos.lng]
    : customerPos
    ? [customerPos.lat, customerPos.lng]
    : [42.36, -71.06];

  return (
    <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {servicerPos && (
        <Marker position={[servicerPos.lat, servicerPos.lng]} icon={servicerIcon}>
          <Popup>Servicer</Popup>
        </Marker>
      )}
      {customerPos && (
        <Marker position={[customerPos.lat, customerPos.lng]} icon={customerIcon}>
          <Popup>Your address</Popup>
        </Marker>
      )}
      <FitBounds servicerPos={servicerPos} customerPos={customerPos} />
    </MapContainer>
  );
}
