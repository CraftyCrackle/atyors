describe('stripeService module', () => {
  it('exports all expected functions', () => {
    const svc = require('../services/stripeService');
    expect(typeof svc.ensureCustomer).toBe('function');
    expect(typeof svc.createSetupIntent).toBe('function');
    expect(typeof svc.listPaymentMethods).toBe('function');
    expect(typeof svc.removePaymentMethod).toBe('function');
    expect(typeof svc.setDefaultPaymentMethod).toBe('function');
    expect(typeof svc.createPaymentIntent).toBe('function');
    expect(typeof svc.getOrCreatePrice).toBe('function');
    expect(typeof svc.createStripeSubscription).toBe('function');
    expect(typeof svc.refundPaymentIntent).toBe('function');
  });
});

describe('payment routes mock mode (SKIP_STRIPE=true)', () => {
  const request = require('supertest');
  const express = require('express');

  let app;

  beforeAll(() => {
    process.env.SKIP_STRIPE = 'true';

    jest.resetModules();

    jest.mock('../middleware/auth', () => ({
      authenticate: (req, _res, next) => {
        req.user = { _id: '507f1f77bcf86cd799439011', email: 'test@test.com', firstName: 'Test', lastName: 'User' };
        next();
      },
      requireRole: () => (req, res, next) => next(),
    }));

    app = express();
    app.use(express.json());
    app.use('/payments', require('../routes/payments'));
    app.use((err, _req, res, _next) => res.status(500).json({ error: err.message }));
  });

  afterAll(() => jest.restoreAllMocks());

  it('GET /payments/methods returns mock methods', async () => {
    const res = await request(app).get('/payments/methods');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.methods).toHaveLength(2);
    expect(res.body.data.methods[0]).toHaveProperty('brand');
    expect(res.body.data.methods[0]).toHaveProperty('last4');
    expect(res.body.data.methods[0]).toHaveProperty('isDefault', true);
  });

  it('POST /payments/setup-intent returns mock secret', async () => {
    const res = await request(app).post('/payments/setup-intent');
    expect(res.status).toBe(200);
    expect(res.body.data.clientSecret).toBe('dev_mock_setup_secret');
  });

  it('DELETE /payments/methods/:id succeeds', async () => {
    const res = await request(app).delete('/payments/methods/pm_mock_visa');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PATCH /payments/methods/:id/default succeeds', async () => {
    const res = await request(app).patch('/payments/methods/pm_mock_visa/default');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /payments/history returns empty charges', async () => {
    const res = await request(app).get('/payments/history');
    expect(res.status).toBe(200);
    expect(res.body.data.charges).toEqual([]);
  });
});

describe('subscriptionService module', () => {
  it('exports expected functions', () => {
    const svc = require('../services/subscriptionService');
    expect(typeof svc.create).toBe('function');
    expect(typeof svc.cancel).toBe('function');
    expect(typeof svc.getByUser).toBe('function');
    expect(typeof svc.generateUpcomingBookings).toBe('function');
  });
});

describe('bookingController module', () => {
  it('exports confirmPayment handler', () => {
    const ctrl = require('../controllers/bookingController');
    expect(typeof ctrl.confirmPayment).toBe('function');
    expect(typeof ctrl.create).toBe('function');
    expect(typeof ctrl.list).toBe('function');
    expect(typeof ctrl.getById).toBe('function');
  });
});

describe('booking routes', () => {
  it('has confirm-payment route registered', () => {
    const router = require('../routes/bookings');
    const routes = router.stack
      .filter((layer) => layer.route)
      .map((layer) => ({ path: layer.route.path, methods: Object.keys(layer.route.methods) }));

    const confirmRoute = routes.find((r) => r.path === '/:id/confirm-payment');
    expect(confirmRoute).toBeDefined();
    expect(confirmRoute.methods).toContain('post');
  });
});
