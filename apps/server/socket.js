const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./config');

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.cors.origins, credentials: true },
  });

  const tracking = io.of('/tracking');

  tracking.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  tracking.on('connection', (socket) => {
    socket.on('join:booking', (bookingId) => {
      socket.join(`booking:${bookingId}`);
    });

    socket.on('leave:booking', (bookingId) => {
      socket.leave(`booking:${bookingId}`);
    });

    socket.on('location:update', (data) => {
      if (!['admin', 'superadmin'].includes(socket.userRole)) return;
      tracking.to(`booking:${data.bookingId}`).emit('location:update', {
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
        speed: data.speed,
        timestamp: Date.now(),
        providerId: socket.userId,
      });
    });

    socket.on('status:update', (data) => {
      tracking.to(`booking:${data.bookingId}`).emit('status:update', {
        bookingId: data.bookingId,
        status: data.status,
        timestamp: Date.now(),
      });
    });
  });

  return io;
}

module.exports = { initSocket };
