const { STATUS_FLOW } = require('../models/Booking');

describe('Booking Status Flow', () => {
  test('pending can transition to confirmed or cancelled', () => {
    expect(STATUS_FLOW.pending).toContain('confirmed');
    expect(STATUS_FLOW.pending).toContain('cancelled');
  });

  test('confirmed can transition to en-route or cancelled', () => {
    expect(STATUS_FLOW.confirmed).toContain('en-route');
    expect(STATUS_FLOW.confirmed).toContain('cancelled');
  });

  test('completed is a terminal state', () => {
    expect(STATUS_FLOW.completed).toEqual([]);
  });

  test('cancelled is a terminal state', () => {
    expect(STATUS_FLOW.cancelled).toEqual([]);
  });

  test('full happy path flow is valid', () => {
    const path = ['pending', 'confirmed', 'en-route', 'arrived', 'in-progress', 'completed'];
    for (let i = 0; i < path.length - 1; i++) {
      expect(STATUS_FLOW[path[i]]).toContain(path[i + 1]);
    }
  });
});
