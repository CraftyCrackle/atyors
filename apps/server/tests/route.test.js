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
