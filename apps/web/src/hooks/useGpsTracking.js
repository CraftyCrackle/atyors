'use client';

import { useEffect, useRef, useCallback } from 'react';

const GPS_INTERVAL_MS = 4000;

export default function useGpsTracking({ bookingId, routeId, active }) {
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastEmitRef = useRef(0);

  const cleanup = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
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
      return;
    }

    if (!navigator.geolocation) {
      console.warn('[GPS] Geolocation not supported');
      return;
    }

    let disposed = false;

    async function start() {
      const { createSocket } = await import('../services/socket');
      if (disposed) return;

      const token = localStorage.getItem('accessToken');
      const socket = createSocket('/tracking', token);
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[GPS] Tracking socket connected');
      });

      socket.on('connect_error', (err) => {
        console.error('[GPS] Tracking socket error:', err.message);
      });

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const now = Date.now();
          if (now - lastEmitRef.current < GPS_INTERVAL_MS) return;
          lastEmitRef.current = now;

          const payload = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          };

          if (routeId) {
            payload.routeId = routeId;
          } else {
            payload.bookingId = bookingId;
          }

          socket.emit('location:update', payload);
        },
        (err) => {
          console.error('[GPS] Watch error:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
    }

    start();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [active, bookingId, routeId, cleanup]);
}
