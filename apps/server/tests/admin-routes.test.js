jest.mock('../models/Booking');
jest.mock('../models/User');
jest.mock('../models/ServiceZone');
jest.mock('../middleware/auth');

const { authenticate, requireRole } = require('../middleware/auth');
authenticate.mockImplementation((req, _res, next) => {
  req.user = { _id: 'admin1', role: 'admin' };
  next();
});
requireRole.mockReturnValue((_req, _res, next) => next());

const request = require('supertest');
const express = require('express');
const adminRoutes = require('../routes/admin');
const User = require('../models/User');
const Booking = require('../models/Booking');

const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);

describe('Admin routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /admin/servicers', () => {
    test('returns list of servicer users', async () => {
      const mockServicers = [
        { _id: 's1', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com', role: 'servicer' },
        { _id: 's2', firstName: 'Bob', lastName: 'Admin', email: 'bob@test.com', role: 'admin' },
      ];
      User.find.mockReturnValue({ select: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(mockServicers) }) });

      const res = await request(app).get('/admin/servicers');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.servicers).toHaveLength(2);
      expect(res.body.data.servicers[0].firstName).toBe('Alice');
    });
  });

  describe('GET /admin/reports/summary', () => {
    test('returns aggregate counts', async () => {
      Booking.countDocuments
        .mockResolvedValueOnce(42)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(30);
      User.countDocuments.mockResolvedValue(10);

      const res = await request(app).get('/admin/reports/summary');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        totalBookings: 42,
        activeBookings: 5,
        completedBookings: 30,
        totalCustomers: 10,
      });
    });
  });
});
