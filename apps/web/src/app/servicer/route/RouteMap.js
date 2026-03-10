'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function stopIcon(label, status) {
  const bg = status === 'completed' ? '#16a34a' : status === 'en-route' || status === 'arrived' ? '#6366f1' : '#4b5563';
  return new L.DivIcon({
    html: `<div style="width:28px;height:28px;background:${bg};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    className: '',
  });
}

function FitAll({ stops }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || stops.length === 0) return;
    const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    fitted.current = true;
  }, [stops, map]);

  return null;
}

export default function RouteMap({ stops, currentIndex }) {
  if (stops.length === 0) return null;

  const center = [stops[0].lat, stops[0].lng];
  const polyline = stops.map((s) => [s.lat, s.lng]);

  return (
    <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      <FitAll stops={stops} />
      <Polyline positions={polyline} pathOptions={{ color: '#6366f1', weight: 3, opacity: 0.6, dashArray: '8 6' }} />
      {stops.map((s, i) => (
        <Marker key={i} position={[s.lat, s.lng]} icon={stopIcon(s.label, s.status)} />
      ))}
    </MapContainer>
  );
}
