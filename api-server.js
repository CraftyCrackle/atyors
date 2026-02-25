const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const { initSocket } = require('./apps/server/socket');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ALLOWED_ORIGINS || '').split(','), credentials: true }));

// Stripe webhooks need raw body — mount before JSON parser
app.use('/api/v1/webhooks', require('./apps/server/routes/webhooks'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Health Check ---
app.get('/api/v1/health', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    service: 'atyors-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongo: mongoStatus,
    environment: process.env.NODE_ENV
  });
});

// --- Mount route modules ---
app.use('/api/v1/auth', require('./apps/server/routes/auth'));
app.use('/api/v1/users', require('./apps/server/routes/users'));
app.use('/api/v1/addresses', require('./apps/server/routes/addresses'));
app.use('/api/v1/services', require('./apps/server/routes/services'));
app.use('/api/v1/bookings', require('./apps/server/routes/bookings'));
app.use('/api/v1/subscriptions', require('./apps/server/routes/subscriptions'));
app.use('/api/v1/payments', require('./apps/server/routes/payments'));
app.use('/api/v1/admin', require('./apps/server/routes/admin'));

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
});

// --- Error handler ---
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' }
  });
});

// --- Startup ---
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    const redis = createClient({ url: process.env.REDIS_URL });
    redis.on('error', (err) => console.error('Redis error:', err));
    await redis.connect();
    console.log('Redis connected');
    app.locals.redis = redis;

    const server = http.createServer(app);
    const io = initSocket(server);
    app.locals.io = io;

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`atyors API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

start();
