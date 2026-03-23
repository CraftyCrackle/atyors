describe('AppSettings Model', () => {
  const AppSettings = require('../models/AppSettings');

  test('schema has dailyBookingCap with correct default', () => {
    const paths = AppSettings.schema.paths;
    expect(paths.dailyBookingCap).toBeDefined();
    expect(paths.dailyBookingCap.instance).toBe('Number');
    expect(paths.dailyBookingCap.options.default).toBe(100);
  });

  test('dailyBookingCap enforces min value of 1', () => {
    const paths = AppSettings.schema.paths;
    expect(paths.dailyBookingCap.options.min).toBe(1);
  });

  test('schema has entranceCleaningDailyCap with default 0', () => {
    const paths = AppSettings.schema.paths;
    expect(paths.entranceCleaningDailyCap).toBeDefined();
    expect(paths.entranceCleaningDailyCap.instance).toBe('Number');
    expect(paths.entranceCleaningDailyCap.options.default).toBe(0);
  });

  test('entranceCleaningDailyCap enforces min value of 0', () => {
    const paths = AppSettings.schema.paths;
    expect(paths.entranceCleaningDailyCap.options.min).toBe(0);
  });

  test('get static method is defined', () => {
    expect(typeof AppSettings.get).toBe('function');
  });

  test('set static method is defined', () => {
    expect(typeof AppSettings.set).toBe('function');
  });
});

describe('bookingService capacity exports', () => {
  const bookingService = require('../services/bookingService');

  test('getCapacity is exported', () => {
    expect(typeof bookingService.getCapacity).toBe('function');
  });

  test('getEntranceCleaningCapacity is exported', () => {
    expect(typeof bookingService.getEntranceCleaningCapacity).toBe('function');
  });
});

describe('bookingService dynamic cap', () => {
  test('bookingService no longer uses hardcoded DAILY_BOOKING_CAP', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../services/bookingService.js'), 'utf8');
    expect(src).not.toMatch(/const DAILY_BOOKING_CAP/);
    expect(src).toContain('AppSettings');
    expect(src).toContain('settings.dailyBookingCap');
  });
});
