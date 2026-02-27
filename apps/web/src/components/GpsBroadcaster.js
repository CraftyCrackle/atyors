'use client';

import { useEffect, useState, useRef, createContext, useContext, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

const GpsContext = createContext({ gpsStatus: null, activeRouteId: null });

export function useGpsStatus() {
  return useContext(GpsContext);
}

export default function GpsBroadcaster({ children }) {
  const user = useAuthStore((s) => s.user);
  const [gpsStatus, setGpsStatus] = useState(null);
  const [activeRouteId, setActiveRouteId] = useState(null);
  const [activeBookingIds, setActiveBookingIds] = useState([]);
  const watchIdRef = useRef(null);
  const socketRef = useRef(null);
  const pollingRef = useRef(null);
  const activeRouteIdRef = useRef(null);
  const activeBookingIdsRef = useRef([]);
  const fallbackRef = useRef(null);
  const lastPosRef = useRef(null);

  activeRouteIdRef.current = activeRouteId;
  activeBookingIdsRef.current = activeBookingIds;

  const isServicer = user && ['servicer', 'admin', 'superadmin'].includes(user.role);
  const shouldBroadcast = activeRouteId || activeBookingIds.length > 0;

  function emitLocation(socket, pos) {
    if (!socket?.connected) return;
    const payload = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
    };
    lastPosRef.current = payload;
    const routeId = activeRouteIdRef.current;
    const bookingIds = activeBookingIdsRef.current;
    if (routeId) {
      socket.emit('location:update', { ...payload, routeId });
    } else {
      bookingIds.forEach((bId) => {
        socket.emit('location:update', { ...payload, bookingId: bId });
      });
    }
  }

  const checkForActiveWork = useCallback(async () => {
    try {
      const { api } = await import('../services/api');

      const routeRes = await api.get('/servicer/routes/active');
      const route = routeRes.data.route;
      if (route && route.status === 'in-progress') {
        setActiveRouteId((prev) => prev !== route._id ? route._id : prev);
        setActiveBookingIds([]);
        return;
      }

      setActiveRouteId(null);

      const jobsRes = await api.get('/servicer/jobs/mine?limit=50');
      const liveJobs = (jobsRes.data.bookings || []).filter(
        (b) => ['en-route', 'arrived'].includes(b.status) && !b.routeId
      );
      const ids = liveJobs.map((b) => b._id).sort();
      setActiveBookingIds((prev) => {
        const prevKey = prev.join(',');
        const newKey = ids.join(',');
        return prevKey !== newKey ? ids : prev;
      });
      if (ids.length === 0) setGpsStatus(null);
    } catch { }
  }, []);

  useEffect(() => {
    if (!isServicer) return;
    checkForActiveWork();
    pollingRef.current = setInterval(checkForActiveWork, 8000);
    return () => {
      clearInterval(pollingRef.current);
      stopGPS();
    };
  }, [isServicer]);

  useEffect(() => {
    if (shouldBroadcast) {
      startGPS();
    } else {
      stopGPS();
    }
    return () => stopGPS();
  }, [shouldBroadcast]);

  async function startGPS() {
    if (watchIdRef.current !== null) return;
    if (!navigator.geolocation) {
      setGpsStatus('unsupported');
      return;
    }

    const { createSocket } = await import('../services/socket');
    const token = localStorage.getItem('accessToken');
    const socket = createSocket('/tracking', token);
    socketRef.current = socket;

    socket.on('connect', () => {
      setGpsStatus('connected');
      if (lastPosRef.current) {
        const routeId = activeRouteIdRef.current;
        const bookingIds = activeBookingIdsRef.current;
        if (routeId) {
          socket.emit('location:update', { ...lastPosRef.current, routeId });
        } else {
          bookingIds.forEach((bId) => {
            socket.emit('location:update', { ...lastPosRef.current, bookingId: bId });
          });
        }
      }
    });
    socket.on('disconnect', () => setGpsStatus('disconnected'));
    socket.on('connect_error', () => setGpsStatus('socket-error'));

    let highAccuracyFailed = false;

    function startWatch(highAccuracy) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      const wid = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsStatus(socket.connected ? 'active' : 'gps-only');
          emitLocation(socket, pos);
        },
        (err) => {
          if (highAccuracy && !highAccuracyFailed && (err.code === 2 || err.code === 3)) {
            highAccuracyFailed = true;
            startWatch(false);
            return;
          }
          if (err.code === 1) setGpsStatus('denied');
          else if (err.code === 2) setGpsStatus('unavailable');
          else setGpsStatus('timeout');
        },
        { enableHighAccuracy: highAccuracy, maximumAge: 5000, timeout: highAccuracy ? 15000 : 30000 },
      );
      watchIdRef.current = wid;
    }

    startWatch(true);

    fallbackRef.current = setInterval(() => {
      if (!socket.connected) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsStatus('active');
          emitLocation(socket, pos);
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 10000, timeout: 15000 },
      );
    }, 10000);
  }

  function stopGPS() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (fallbackRef.current) {
      clearInterval(fallbackRef.current);
      fallbackRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    lastPosRef.current = null;
  }

  return (
    <GpsContext.Provider value={{ gpsStatus, activeRouteId }}>
      {children}
    </GpsContext.Provider>
  );
}
