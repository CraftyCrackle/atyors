const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./config');
const User = require('./models/User');

async function authMiddleware(socket, next) {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.userId).select('_id role isActive');
    if (!user || !user.isActive) return next(new Error('User not found or inactive'));
    socket.userId = user._id.toString();
    socket.userRole = user.role;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}

const liveLocations = new Map();

function setLiveLocation(bookingId, data) {
  liveLocations.set(bookingId.toString(), { ...data, timestamp: Date.now() });
}

function getLiveLocation(bookingId) {
  const loc = liveLocations.get(bookingId.toString());
  if (!loc) return null;
  if (Date.now() - loc.timestamp > 5 * 60 * 1000) {
    liveLocations.delete(bookingId.toString());
    return null;
  }
  return loc;
}

function clearLiveLocation(bookingId) {
  liveLocations.delete(bookingId.toString());
}

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.cors.origins, credentials: true },
  });

  const Route = require('./models/Route');
  const routeService = require('./services/routeService');

  // --- /tracking namespace (live geo tracking) ---
  const tracking = io.of('/tracking');
  tracking.use(authMiddleware);

  tracking.on('connection', (socket) => {
    socket.on('join:booking', (bookingId) => {
      socket.join(`booking:${bookingId}`);
    });
    socket.on('leave:booking', (bookingId) => {
      socket.leave(`booking:${bookingId}`);
    });

    socket.on('location:update', async (data) => {
      if (!['servicer', 'admin', 'superadmin'].includes(socket.userRole)) return;

      if (data.routeId) {
        try {
          const route = await Route.findById(data.routeId);
          if (!route || route.status !== 'in-progress') return;
          if (route.servicerId.toString() !== socket.userId) return;

          await routeService.updateLocation(route._id, data.lat, data.lng);

          const idx = route.currentStopIndex;
          if (idx >= 0 && idx < route.stops.length) {
            const currentStop = route.stops[idx];
            tracking.to(`booking:${currentStop.bookingId}`).emit('location:update', {
              lat: data.lat,
              lng: data.lng,
              heading: data.heading,
              speed: data.speed,
              timestamp: Date.now(),
              providerId: socket.userId,
            });
          }

          route.stops.forEach((stop, i) => {
            if (i <= idx || stop.status === 'completed' || stop.status === 'skipped') return;
            const remaining = route.stops.filter(
              (s, si) => si >= idx && s.status !== 'completed' && s.status !== 'skipped'
            );
            const pos = remaining.findIndex(
              (s) => s.bookingId.toString() === stop.bookingId.toString()
            );
            if (pos > 0) {
              tracking.to(`booking:${stop.bookingId}`).emit('queue:position', {
                bookingId: stop.bookingId,
                position: pos + 1,
                total: remaining.length,
              });
            }
          });
        } catch (err) {
          console.error('Route location:update error:', err.message);
        }
      } else if (data.bookingId) {
        const payload = {
          lat: data.lat,
          lng: data.lng,
          heading: data.heading,
          speed: data.speed,
          timestamp: Date.now(),
          providerId: socket.userId,
        };
        setLiveLocation(data.bookingId, payload);
        tracking.to(`booking:${data.bookingId}`).emit('location:update', payload);
      }
    });

    socket.on('status:update', (data) => {
      tracking.to(`booking:${data.bookingId}`).emit('status:update', {
        bookingId: data.bookingId,
        status: data.status,
        timestamp: Date.now(),
      });
    });
  });

  // --- /notifications namespace (push-style notifications) ---
  const notifications = io.of('/notifications');
  notifications.use(authMiddleware);

  notifications.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
  });

  return io;
}

module.exports = { initSocket, getLiveLocation, clearLiveLocation };
