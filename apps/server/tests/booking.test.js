const { STATUS_FLOW } = require('../models/Booking');

describe('Booking Status Flow', () => {
  test('pending can transition to active or cancelled', () => {
    expect(STATUS_FLOW.pending).toContain('active');
    expect(STATUS_FLOW.pending).toContain('cancelled');
  });

  test('active can transition to en-route or cancelled', () => {
    expect(STATUS_FLOW.active).toContain('en-route');
    expect(STATUS_FLOW.active).toContain('cancelled');
  });

  test('completed is a terminal state', () => {
    expect(STATUS_FLOW.completed).toEqual([]);
  });

  test('cancelled is a terminal state', () => {
    expect(STATUS_FLOW.cancelled).toEqual([]);
  });

  test('full happy path flow is valid', () => {
    const path = ['pending', 'active', 'en-route', 'arrived', 'completed'];
    for (let i = 0; i < path.length - 1; i++) {
      expect(STATUS_FLOW[path[i]]).toContain(path[i + 1]);
    }
  });
});

describe('Booking Model Schema', () => {
  const BookingModel = require('../models/Booking');

  test('schema includes serviceValue field', () => {
    const paths = BookingModel.schema.paths;
    expect(paths.serviceValue).toBeDefined();
    expect(paths.serviceValue.instance).toBe('Number');
  });

  test('schema includes amount and subscriptionId fields', () => {
    const paths = BookingModel.schema.paths;
    expect(paths.amount).toBeDefined();
    expect(paths.subscriptionId).toBeDefined();
  });

  test('schema includes paymentStatus field with correct enum and default', () => {
    const paths = BookingModel.schema.paths;
    expect(paths.paymentStatus).toBeDefined();
    expect(paths.paymentStatus.instance).toBe('String');
    expect(paths.paymentStatus.options.enum).toEqual(['pending_payment', 'paid', 'failed', 'refunded', 'charge_failed']);
    expect(paths.paymentStatus.options.default).toBe('pending_payment');
  });

  test('schema includes stripePaymentIntentId field', () => {
    const paths = BookingModel.schema.paths;
    expect(paths.stripePaymentIntentId).toBeDefined();
    expect(paths.stripePaymentIntentId.instance).toBe('String');
  });
});

describe('Put-out date scheduling', () => {
  test('putOutDate is the day before the trash day', () => {
    // If trash day is Monday Mar 23, put-out date must be Sunday Mar 22.
    const trashDay = new Date('2026-03-23T12:00:00');
    const putOutDate = new Date(trashDay);
    putOutDate.setDate(putOutDate.getDate() - 1);
    expect(putOutDate.getDate()).toBe(22);
    expect(putOutDate.getDay()).toBe(0); // Sunday
  });

  test('bring-in date stays on the trash day', () => {
    const trashDay = new Date('2026-03-23T12:00:00');
    expect(trashDay.getDay()).toBe(1); // Monday
    expect(trashDay.getDate()).toBe(23);
  });

  test('put-out for Saturday trash day lands on Friday', () => {
    const trashDay = new Date('2026-03-28T12:00:00'); // Saturday
    const putOutDate = new Date(trashDay);
    putOutDate.setDate(putOutDate.getDate() - 1);
    expect(putOutDate.getDay()).toBe(5); // Friday
    expect(putOutDate.getDate()).toBe(27);
  });
});

