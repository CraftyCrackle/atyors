const Route = require('../models/Route');

describe('Route model', () => {
  test('stop statuses enum', () => {
    const validStatuses = ['pending', 'en-route', 'arrived', 'completed', 'skipped'];
    const stopPath = Route.schema.path('stops.status');
    expect(stopPath.options.enum).toEqual(validStatuses);
  });

  test('route statuses enum', () => {
    expect(Route.schema.path('status').options.enum).toEqual(['planned', 'in-progress', 'completed']);
  });

  test('currentStopIndex defaults to -1', () => {
    expect(Route.schema.path('currentStopIndex').options.default).toBe(-1);
  });

  test('lastLocation has lat, lng, timestamp', () => {
    expect(Route.schema.path('lastLocation.lat')).toBeDefined();
    expect(Route.schema.path('lastLocation.lng')).toBeDefined();
    expect(Route.schema.path('lastLocation.timestamp')).toBeDefined();
  });
});

describe('Route service queue logic', () => {
  const routeService = require('../services/routeService');

  test('module exports all expected functions', () => {
    expect(typeof routeService.createRoute).toBe('function');
    expect(typeof routeService.startRoute).toBe('function');
    expect(typeof routeService.completeCurrentStop).toBe('function');
    expect(typeof routeService.skipCurrentStop).toBe('function');
    expect(typeof routeService.getActiveRoute).toBe('function');
    expect(typeof routeService.getPlannedRoute).toBe('function');
    expect(typeof routeService.getQueuePosition).toBe('function');
    expect(typeof routeService.updateLocation).toBe('function');
  });
});

describe('getPlannedRoute fallback', () => {
  const routeService = require('../services/routeService');
  const Route = require('../models/Route');
  const Booking = require('../models/Booking');

  afterEach(() => jest.restoreAllMocks());

  function mockFindOneChain(results) {
    let callIdx = 0;
    jest.spyOn(Route, 'findOne').mockImplementation(() => {
      const result = results[callIdx] ?? null;
      callIdx++;
      return {
        sort: () => ({ populate: jest.fn().mockResolvedValue(result) }),
        populate: jest.fn().mockResolvedValue(result),
      };
    });
  }

  test('returns today-scoped route when it exists', async () => {
    const todayRoute = { _id: 'today', status: 'planned', date: new Date() };
    mockFindOneChain([todayRoute]);

    const result = await routeService.getPlannedRoute('svc1', new Date().toISOString());
    expect(result).toEqual(todayRoute);
    expect(Route.findOne).toHaveBeenCalledTimes(1);
  });

  test('falls back to stale route when bookings are still actionable', async () => {
    const staleRoute = {
      _id: 'stale', status: 'planned', date: new Date('2026-03-10'),
      stops: [{ bookingId: 'b1' }], save: jest.fn(),
    };
    mockFindOneChain([null, staleRoute]);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(1);

    const result = await routeService.getPlannedRoute('svc1', new Date().toISOString());
    expect(result).toEqual(staleRoute);
    expect(staleRoute.save).not.toHaveBeenCalled();
  });

  test('auto-completes stale route when all bookings are done', async () => {
    const staleRoute = {
      _id: 'stale', status: 'planned', date: new Date('2026-03-10'),
      stops: [{ bookingId: 'b1' }], save: jest.fn().mockResolvedValue(),
    };
    mockFindOneChain([null, staleRoute]);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(0);

    const result = await routeService.getPlannedRoute('svc1', new Date().toISOString());
    expect(result).toBeNull();
    expect(staleRoute.status).toBe('completed');
    expect(staleRoute.save).toHaveBeenCalled();
  });

  test('returns null when no routes exist at all', async () => {
    mockFindOneChain([null, null]);

    const result = await routeService.getPlannedRoute('svc1', new Date().toISOString());
    expect(result).toBeNull();
    expect(Route.findOne).toHaveBeenCalledTimes(2);
  });
});
