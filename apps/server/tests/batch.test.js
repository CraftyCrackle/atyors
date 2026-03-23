describe('Booking Model — batch fields', () => {
  const Booking = require('../models/Booking');

  test('schema includes batchId field as String', () => {
    expect(Booking.schema.paths.batchId).toBeDefined();
    expect(Booking.schema.paths.batchId.instance).toBe('String');
  });

  test('schema includes isGuaranteed field defaulting to false', () => {
    expect(Booking.schema.paths.isGuaranteed).toBeDefined();
    expect(Booking.schema.paths.isGuaranteed.options.default).toBe(false);
  });
});

describe('Subscription Model — batchId field', () => {
  const Subscription = require('../models/Subscription');

  test('schema includes batchId field', () => {
    expect(Subscription.schema.paths.batchId).toBeDefined();
    expect(Subscription.schema.paths.batchId.instance).toBe('String');
  });
});

describe('bookingService.getCapacity — subscriber bypass', () => {
  jest.mock('../models/AppSettings', () => ({
    get: jest.fn().mockResolvedValue({ dailyBookingCap: 10 }),
  }));

  jest.mock('../models/Booking', () => ({
    countDocuments: jest.fn().mockResolvedValue(3),
    create: jest.fn(),
    deleteMany: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    schema: { paths: {} },
  }));

  jest.mock('../models/ServiceType', () => ({
    findById: jest.fn(),
    findOne: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
  }));
  jest.mock('../models/Address', () => ({ findOne: jest.fn() }));
  jest.mock('../models/Subscription', () => ({ findOne: jest.fn(), schema: { paths: {} } }));

  const { getCapacity } = require('../services/bookingService');
  const AppSettings = require('../models/AppSettings');
  const Booking = require('../models/Booking');

  test('returns guaranteed=true and available=true for subscribers (bypass)', async () => {
    const result = await getCapacity('2026-06-01', { isSubscriber: true });
    expect(result.guaranteed).toBe(true);
    expect(result.available).toBe(true);
  });

  test('unavailable when booked + count exceeds cap', async () => {
    AppSettings.get.mockResolvedValueOnce({ dailyBookingCap: 10 });
    Booking.countDocuments.mockResolvedValueOnce(8);
    const result = await getCapacity('2026-06-01', { count: 5, isSubscriber: false });
    expect(result.available).toBe(false);
  });

  test('available when booked + count is within cap', async () => {
    AppSettings.get.mockResolvedValueOnce({ dailyBookingCap: 10 });
    Booking.countDocuments.mockResolvedValueOnce(3);
    const result = await getCapacity('2026-06-01', { count: 5, isSubscriber: false });
    expect(result.available).toBe(true);
  });
});

describe('POST /bookings/batch — input validation', () => {
  const express = require('express');
  const request = require('supertest');

  jest.mock('../middleware/auth', () => ({
    authenticate: (req, res, next) => { req.user = { _id: 'user123', role: 'customer' }; next(); },
    requireRole: () => (req, res, next) => next(),
  }));

  jest.mock('../services/bookingService', () => ({
    createBatch: jest.fn().mockResolvedValue({ bookings: [{ _id: 'b1', batchId: 'uuid1' }], batchId: 'uuid1' }),
    create: jest.fn(),
    getCapacity: jest.fn(),
    listByUser: jest.fn(),
    getById: jest.fn(),
    cancel: jest.fn(),
    reschedule: jest.fn(),
  }));

  jest.mock('../services/stripeService', () => ({
    hasDefaultPaymentMethod: jest.fn().mockResolvedValue(true),
  }));

  jest.mock('../services/notificationService', () => ({
    notifyServicers: jest.fn().mockResolvedValue(),
    create: jest.fn(),
  }));

  jest.mock('../config', () => ({ stripe: { skip: true }, env: 'test' }));

  jest.mock('../models/Booking', () => ({
    findById: jest.fn().mockResolvedValue({ status: 'pending' }),
    schema: { paths: {} },
  }));

  jest.mock('multer', () => {
    const m = () => ({ array: () => (req, res, next) => next(), single: () => (req, res, next) => next() });
    m.diskStorage = jest.fn();
    return m;
  });

  jest.mock('../middleware/validateUpload', () => (req, res, next) => next());

  jest.mock('../controllers/messageController', () => ({ unreadCount: jest.fn(), list: jest.fn(), send: jest.fn() }));
  jest.mock('../controllers/reviewController', () => ({ getMyReviews: jest.fn(), getByBooking: jest.fn(), create: jest.fn() }));

  const bookingsRouter = require('../routes/bookings');
  const testApp = express();
  testApp.use(express.json());
  testApp.locals = { io: null };
  testApp.use('/bookings', bookingsRouter);
  testApp.use((err, req, res, _next) => res.status(err.status || 500).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } }));

  beforeEach(() => jest.clearAllMocks());

  test('rejects missing addresses', async () => {
    const res = await request(testApp)
      .post('/bookings/batch')
      .send({ serviceTypeId: 'st1', scheduledDate: '2026-06-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  test('rejects empty addresses array', async () => {
    const res = await request(testApp)
      .post('/bookings/batch')
      .send({ addresses: [], serviceTypeId: 'st1', scheduledDate: '2026-06-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  test('calls createBatch and returns 201 with batchId', async () => {
    const { createBatch } = require('../services/bookingService');
    const res = await request(testApp)
      .post('/bookings/batch')
      .send({ addresses: ['addr1', 'addr2'], serviceTypeId: 'st1', scheduledDate: '2026-06-02', barrelCount: 1 });
    expect(res.status).toBe(201);
    expect(createBatch).toHaveBeenCalledWith('user123', expect.objectContaining({ addresses: ['addr1', 'addr2'] }));
    expect(res.body.data.batchId).toBe('uuid1');
  });
});

describe('POST /subscriptions/batch/cancel — input validation', () => {
  const express = require('express');
  const request = require('supertest');

  jest.mock('../middleware/auth', () => ({
    authenticate: (req, res, next) => { req.user = { _id: 'user123', role: 'customer' }; next(); },
    requireRole: () => (req, res, next) => next(),
  }));

  jest.mock('../services/subscriptionService', () => ({
    create: jest.fn(),
    cancel: jest.fn(),
    cancelBatch: jest.fn().mockRejectedValue(Object.assign(new Error('No active subscriptions found for this batch.'), { status: 404 })),
    toggleAutoRenew: jest.fn(),
    getByUser: jest.fn().mockResolvedValue([]),
  }));

  const subsRouter = require('../routes/subscriptions');
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/subscriptions', subsRouter);
  testApp.use((err, req, res, _next) => res.status(err.status || 500).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } }));

  test('rejects missing batchId', async () => {
    const res = await request(testApp).post('/subscriptions/batch/cancel').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_BATCH_ID');
  });

  test('returns 404 for unknown batchId', async () => {
    const res = await request(testApp).post('/subscriptions/batch/cancel').send({ batchId: 'nope' });
    expect(res.status).toBe(404);
  });
});
