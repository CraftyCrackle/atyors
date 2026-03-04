'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

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
      if (isNative()) {
        try {
          const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');
          BackgroundGeolocation.removeWatcher({ id: watchIdRef.current });
        } catch {}
      } else {
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

    if (isNative()) {
      startNativeTracking();
    } else {
      startWebTracking();
    }

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

    async function startNativeTracking() {
      const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

      try {
        const watcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: 'atyors is sharing your location with the customer.',
            backgroundTitle: 'Live tracking active',
            requestPermissions: true,
            stale: false,
            distanceFilter: 20,
          },
          function callback(location, error) {
            if (disposed) return;

            if (error) {
              if (error.code === 'NOT_AUTHORIZED') {
                setStatus('denied');
              } else {
                console.error('[GPS] Native error:', error);
                setStatus('gps-error');
              }
              return;
            }

            setStatus('tracking');

            const now = Date.now();
            if (now - lastEmitRef.current < GPS_INTERVAL_MS) return;
            lastEmitRef.current = now;

            sendLocationHttp(location.latitude, location.longitude, location.bearing, location.speed);
          }
        );

        watchIdRef.current = watcherId;
        if (!disposed) setStatus('waiting-gps');
      } catch (err) {
        console.error('[GPS] Failed to start native tracking:', err);
        if (!disposed) setStatus('gps-error');
      }
    }

    async function startWebTracking() {
      if (!navigator.geolocation) {
        setStatus('unsupported');
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

          if (routeId) {
            payload.routeId = routeId;
          } else {
            payload.bookingId = bookingId;
          }

          socket.emit('location:update', payload);
        },
        (err) => {
          console.error('[GPS] Watch error:', err.code, err.message);
          if (disposed) return;
          if (err.code === 1) setStatus('denied');
          else if (err.code === 2) setStatus('unavailable');
          else setStatus('gps-error');
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
    }

    return () => {
      disposed = true;
      cleanup();
    };
  }, [active, bookingId, routeId, cleanup]);

  return status;
}
