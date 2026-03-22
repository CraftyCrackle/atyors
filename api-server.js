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

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } } });
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

const sensitiveAuthLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } } });
app.use('/api/v1/auth/refresh', sensitiveAuthLimiter);

const passwordResetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many password reset attempts. Please try again later.' } } });
app.use('/api/v1/auth/forgot-password', passwordResetLimiter);
app.use('/api/v1/auth/reset-password', passwordResetLimiter);

const verificationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many verification attempts. Please try again later.' } } });
app.use('/api/v1/auth/send-verification', verificationLimiter);
app.use('/api/v1/auth/verify', verificationLimiter);

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
app.use('/api/v1/street-cleaning', require('./apps/server/routes/streetCleaning'));
app.use('/api/v1/carousel', require('./apps/server/routes/carousel'));

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
});

// --- Error handler ---
app.use((err, req, res, _next) => {
  if (err.name === 'ValidationError') {
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    err.message = Object.values(err.errors).map(e => e.message).join(', ');
  }
  if (err.name === 'CastError') {
    err.status = 400;
    err.code = 'INVALID_ID';
    err.message = `Invalid ${err.path}: ${err.value}`;
  }
  if (err.code === 11000) {
    err.status = 409;
    err.code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    err.message = `Duplicate value for ${field}`;
  }

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
      startSubscriptionScheduler();
      startExpiryScheduler(io);
      startReminderScheduler();
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

function startSubscriptionScheduler() {
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  async function refreshSubscriptionBookings() {
    try {
      const Subscription = require('./apps/server/models/Subscription');
      const { generateUpcomingBookings } = require('./apps/server/services/subscriptionService');
      const activeSubs = await Subscription.find({ status: 'active' });
      let generated = 0;
      for (const sub of activeSubs) {
        const bookings = await generateUpcomingBookings(sub);
        generated += bookings.length;
      }
      if (generated > 0) console.log(`[Scheduler] Generated ${generated} upcoming bookings for ${activeSubs.length} active subscriptions`);
    } catch (err) {
      console.error('[Scheduler] Subscription booking refresh failed:', err.message);
    }
  }

  refreshSubscriptionBookings();
  setInterval(refreshSubscriptionBookings, SIX_HOURS);
  console.log('[Scheduler] Subscription booking forecaster running (every 6h)');
}

function startExpiryScheduler(io) {
  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  const { expireOverdueBookings } = require('./apps/server/services/bookingService');

  async function runExpiry() {
    try {
      await expireOverdueBookings(io);
    } catch (err) {
      console.error('[Expiry] Scheduler failed:', err.message);
    }
  }

  runExpiry();
  setInterval(runExpiry, FIFTEEN_MINUTES);
  console.log('[Scheduler] Booking expiry checker running (every 15m)');
}

function startReminderScheduler() {
  const THIRTY_MINUTES = 30 * 60 * 1000;
  const { sendTrashDayReminders, sendStreetCleaningReminders } = require('./apps/server/services/reminderService');

  async function runReminders() {
    try {
      await sendTrashDayReminders();
    } catch (err) {
      console.error('[Reminder] Trash day scheduler failed:', err.message);
    }
    try {
      await sendStreetCleaningReminders();
    } catch (err) {
      console.error('[Reminder] Street cleaning scheduler failed:', err.message);
    }
  }

  runReminders();
  setInterval(runReminders, THIRTY_MINUTES);
  console.log('[Scheduler] Trash day + street cleaning reminder checker running (every 30m)');
}

start();
