jest.mock('../models/Booking');
jest.mock('../models/User');
jest.mock('../models/ServiceZone');
jest.mock('../models/AppSettings');
jest.mock('../models/ServiceType');
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
const AppSettings = require('../models/AppSettings');
const ServiceType = require('../models/ServiceType');

AppSettings.get.mockResolvedValue({ dailyBookingCap: 100, entranceCleaningDailyCap: 0 });
ServiceType.findOne.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'ec-type-id' }) }) });

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
    test('returns aggregate counts with capacity and revenue info', async () => {
      Booking.countDocuments
        .mockResolvedValueOnce(42)  // totalBookings
        .mockResolvedValueOnce(5)   // activeBookings
        .mockResolvedValueOnce(30)  // completedBookings
        .mockResolvedValueOnce(7)   // todayBooked (non-EC)
        .mockResolvedValueOnce(2);  // ecTodayBooked
      User.countDocuments.mockResolvedValue(10);
      Booking.aggregate
        .mockResolvedValueOnce([{ _id: null, total: 500 }])
        .mockResolvedValueOnce([{ _id: null, total: 120 }])
        .mockResolvedValueOnce([{ _id: null, total: 300 }]);

      const res = await request(app).get('/admin/reports/summary');

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        totalBookings: 42,
        activeBookings: 5,
        completedBookings: 30,
        totalCustomers: 10,
        dailyBookingCap: 100,
        todayBooked: 7,
        entranceCleaningDailyCap: 0,
        ecTodayBooked: 2,
        totalRevenue: 500,
        weekRevenue: 120,
        monthRevenue: 300,
      });
    });
  });
});
