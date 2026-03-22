const CarouselImage = require('../models/CarouselImage');

jest.mock('../models/CarouselImage');

describe('CarouselImage model', () => {
  test('schema has required fields', () => {
    const paths = CarouselImage.schema.paths;
    expect(paths.url).toBeDefined();
    expect(paths.caption).toBeDefined();
    expect(paths.sortOrder).toBeDefined();
    expect(paths.isActive).toBeDefined();
  });

  test('isActive defaults to true', () => {
    expect(CarouselImage.schema.paths.isActive.options.default).toBe(true);
  });

  test('sortOrder defaults to 0', () => {
    expect(CarouselImage.schema.paths.sortOrder.options.default).toBe(0);
  });
});

describe('GET /carousel', () => {
  const express = require('express');
  const request = require('supertest');

  jest.mock('../middleware/auth', () => ({
    authenticate: (req, res, next) => { req.user = { _id: 'u1', role: 'admin' }; next(); },
    requireRole: () => (req, res, next) => next(),
  }));

  const carouselRoutes = require('../routes/carousel');
  const app = express();
  app.use(express.json());
  app.use('/carousel', carouselRoutes);

  beforeEach(() => jest.clearAllMocks());

  test('returns active images sorted by sortOrder', async () => {
    const mockImages = [
      { _id: '1', url: '/uploads/a.jpg', caption: 'A', sortOrder: 0, isActive: true },
      { _id: '2', url: '/uploads/b.jpg', caption: 'B', sortOrder: 1, isActive: true },
    ];
    CarouselImage.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(mockImages) });

    const res = await request(app).get('/carousel');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.images).toHaveLength(2);
    expect(CarouselImage.find).toHaveBeenCalledWith({ isActive: true });
  });

  test('admin GET /all returns all images', async () => {
    CarouselImage.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      }),
    });
    const res = await request(app).get('/carousel/all');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE returns 404 when image not found', async () => {
    CarouselImage.findByIdAndDelete.mockResolvedValue(null);
    const res = await request(app).delete('/carousel/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('PATCH updates caption', async () => {
    const updated = { _id: '1', url: '/uploads/a.jpg', caption: 'Updated', isActive: true };
    CarouselImage.findByIdAndUpdate.mockResolvedValue(updated);
    const res = await request(app).patch('/carousel/1').send({ caption: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.image.caption).toBe('Updated');
  });

  test('PATCH /reorder rejects non-array body', async () => {
    const res = await request(app).patch('/carousel/reorder').send({ order: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_BODY');
  });
});
