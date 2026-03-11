'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';

const GPS_INTERVAL_MS = 4000;

function isNative() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export default function useGpsTracking({ bookingId, routeId, active }) {
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastEmitRef = useRef(0);
  const [status, setStatus] = useState('idle');

  const cleanup = useCallback(() => {
    if (watchIdRef.current != null) {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!active || (!bookingId && !routeId)) {
      cleanup();
      setStatus('idle');
      return;
    }

    let disposed = false;
    setStatus('connecting');

    async function sendLocationHttp(lat, lng, heading, speed) {
      try {
        const token = localStorage.getItem('accessToken');
        const body = { lat, lng, heading, speed };
        if (routeId) body.routeId = routeId;
        else body.bookingId = bookingId;
        await fetch('/api/v1/servicer/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
      } catch (err) {
        console.error('[GPS] HTTP location send failed:', err.message);
      }
    }

    async function startTracking() {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setStatus('unsupported');
        return;
      }

      if (isNative()) {
        if (!disposed) setStatus('waiting-gps');
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            if (!disposed) setStatus('tracking');

            const now = Date.now();
            if (now - lastEmitRef.current < GPS_INTERVAL_MS) return;
            lastEmitRef.current = now;

            sendLocationHttp(pos.coords.latitude, pos.coords.longitude, pos.coords.heading, pos.coords.speed);
          },
          (err) => {
            console.error('[GPS] Watch error:', err.code, err.message);
            if (disposed) return;
            if (err.code === 1) setStatus('denied');
            else if (err.code === 2) setStatus('unavailable');
            else setStatus('gps-error');
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
        return;
      }

      const { createSocket } = await import('../services/socket');
      if (disposed) return;

      const token = localStorage.getItem('accessToken');
      const socket = createSocket('/tracking', token);
      socketRef.current = socket;

      socket.on('connect', () => {
        if (!disposed) setStatus('waiting-gps');
      });

      socket.on('connect_error', (err) => {
        console.error('[GPS] Tracking socket error:', err.message);
        if (!disposed) setStatus('socket-error');
      });

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (!disposed) setStatus('tracking');

          const now = Date.now();
          if (now - lastEmitRef.current < GPS_INTERVAL_MS) return;
          lastEmitRef.current = now;

          const payload = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          };

          if (routeId) payload.routeId = routeId;
          else payload.bookingId = bookingId;

          socket.emit('location:update', payload);
        },
        (err) => {
          console.error('[GPS] Watch error:', err.code, err.message);
          if (disposed) return;
          if (err.code === 1) setStatus('denied');
          else if (err.code === 2) setStatus('unavailable');
          else setStatus('gps-error');
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    }

    startTracking();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [active, bookingId, routeId, cleanup]);

  return status;
}
