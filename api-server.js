const http = require('http');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const { initSocket } = require('./apps/server/socket');

const app = express();
const PORT = process.env.PORT || 8080;

app.set('trust proxy', 1);
app.use(helmet());
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').filter(Boolean)
  : (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3001']);
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Stripe webhooks need raw body — mount before JSON parser
app.use('/api/v1/webhooks', require('./apps/server/routes/webhooks'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } } });
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

const apiLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 100, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' } } });
app.use('/api/v1', apiLimiter);

app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

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
app.use('/api/v1/servicer', require('./apps/server/routes/servicer'));
app.use('/api/v1/notifications', require('./apps/server/routes/notifications'));
app.use('/api/v1/push', require('./apps/server/routes/push'));

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
});

// --- Error handler ---
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(`[${req.id}] ${req.method} ${req.path}:`, err.message, err.stack);
  const isDev = process.env.NODE_ENV === 'development';
  res.status(status).json({
    success: false,
    error: {
      code: err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
      message: status >= 500 && !isDev ? 'Internal server error' : err.message,
      requestId: req.id,
    },
  });
});

// --- Startup ---
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    const { seedAll } = require('./apps/server/services/seedService');
    try {
      const result = await seedAll();
      if (result.services?.seeded) console.log('Service types seeded');
      if (result.users.length > 0) console.log('Demo accounts seeded:', result.users.map(u => u.email).join(', '));
    } catch (seedErr) {
      console.warn('Seed check failed (non-fatal):', seedErr.message);
    }

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
