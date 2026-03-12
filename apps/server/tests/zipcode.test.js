describe('AppSettings servedZipcodes', () => {
  const AppSettings = require('../models/AppSettings');

  test('schema has servedZipcodes field with default empty array', () => {
    const paths = AppSettings.schema.paths;
    expect(paths.servedZipcodes).toBeDefined();
    expect(paths.servedZipcodes.options.default).toEqual([]);
  });

  test('servedZipcodes is an array of strings', () => {
    const paths = AppSettings.schema.paths;
    expect(paths.servedZipcodes.instance).toBe('Array');
  });
});

describe('Admin zipcode routes', () => {
  const express = require('express');
  const request = require('supertest');

  jest.mock('../middleware/auth', () => ({
    authenticate: (req, res, next) => { req.user = { _id: 'u1', role: 'admin' }; next(); },
    requireRole: () => (req, res, next) => next(),
  }));

  jest.mock('../models/AppSettings');
  const AppSettings = require('../models/AppSettings');

  const adminRoutes = require('../routes/admin');
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRoutes);

  beforeEach(() => { jest.clearAllMocks(); });

  describe('POST /admin/zipcodes', () => {
    test('adds a valid zipcode', async () => {
      const mockSettings = { servedZipcodes: ['02148'], save: jest.fn() };
      AppSettings.get.mockResolvedValue(mockSettings);

      const res = await request(app).post('/admin/zipcodes').send({ zipcode: '02149' });

      expect(res.status).toBe(201);
      expect(res.body.data.servedZipcodes).toContain('02149');
      expect(mockSettings.save).toHaveBeenCalled();
    });

    test('rejects invalid zipcode', async () => {
      const res = await request(app).post('/admin/zipcodes').send({ zipcode: 'abc' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ZIPCODE');
    });

    test('rejects duplicate zipcode', async () => {
      const mockSettings = { servedZipcodes: ['02149'], save: jest.fn() };
      AppSettings.get.mockResolvedValue(mockSettings);

      const res = await request(app).post('/admin/zipcodes').send({ zipcode: '02149' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE');
    });

    test('rejects missing zipcode', async () => {
      const res = await request(app).post('/admin/zipcodes').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /admin/zipcodes/:zipcode', () => {
    test('removes an existing zipcode', async () => {
      const mockSettings = { servedZipcodes: ['02148', '02149'], save: jest.fn() };
      AppSettings.get.mockResolvedValue(mockSettings);

      const res = await request(app).delete('/admin/zipcodes/02149');
      expect(res.status).toBe(200);
      expect(res.body.data.servedZipcodes).not.toContain('02149');
      expect(mockSettings.save).toHaveBeenCalled();
    });

    test('returns 404 for non-existent zipcode', async () => {
      const mockSettings = { servedZipcodes: ['02148'], save: jest.fn() };
      AppSettings.get.mockResolvedValue(mockSettings);

      const res = await request(app).delete('/admin/zipcodes/99999');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});

describe('GET /services/check-zipcode', () => {
  const express = require('express');
  const request = require('supertest');

  jest.mock('../models/AppSettings');
  const AppSettings = require('../models/AppSettings');

  const serviceRoutes = require('../routes/services');
  const app = express();
  app.use(express.json());
  app.use('/services', serviceRoutes);

  beforeEach(() => { jest.clearAllMocks(); });

  test('returns served: true for a served zipcode', async () => {
    AppSettings.get.mockResolvedValue({ servedZipcodes: ['02149', '02150'] });
    const res = await request(app).get('/services/check-zipcode?zip=02149');
    expect(res.status).toBe(200);
    expect(res.body.data.served).toBe(true);
  });

  test('returns served: false for an unserved zipcode', async () => {
    AppSettings.get.mockResolvedValue({ servedZipcodes: ['02149'] });
    const res = await request(app).get('/services/check-zipcode?zip=90210');
    expect(res.status).toBe(200);
    expect(res.body.data.served).toBe(false);
  });

  test('rejects invalid zipcode format', async () => {
    const res = await request(app).get('/services/check-zipcode?zip=abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ZIPCODE');
  });

  test('rejects missing zip param', async () => {
    const res = await request(app).get('/services/check-zipcode');
    expect(res.status).toBe(400);
  });
});
