const { getServiceWindowStart } = require('../services/servicerService');

describe('getServiceWindowStart', () => {
  const scheduledDate = new Date(2026, 2, 10, 12, 0, 0);

  test('bring-in with 12-4 PM: window starts at noon next day', () => {
    const booking = {
      scheduledDate,
      bringInTime: '12–4 PM (Afternoon)',
      serviceTypeId: { slug: 'bring-in' },
    };
    const start = getServiceWindowStart(booking);
    expect(start.getDate()).toBe(11);
    expect(start.getHours()).toBe(12);
  });

  test('bring-in with 4-9 PM: window starts at 4 PM next day', () => {
    const booking = {
      scheduledDate,
      bringInTime: '4–9 PM (Evening)',
      serviceTypeId: { slug: 'bring-in' },
    };
    const start = getServiceWindowStart(booking);
    expect(start.getDate()).toBe(11);
    expect(start.getHours()).toBe(16);
  });

  test('put-out with 4-9 PM: window starts at 4 PM same day', () => {
    const booking = {
      scheduledDate,
      putOutTime: '4–9 PM (Evening)',
      serviceTypeId: { slug: 'put-out' },
    };
    const start = getServiceWindowStart(booking);
    expect(start.getDate()).toBe(10);
    expect(start.getHours()).toBe(16);
  });

  test('put-out with 5-7 AM: window starts at 5 AM same day', () => {
    const booking = {
      scheduledDate,
      putOutTime: '5–7 AM (Early Morning)',
      serviceTypeId: { slug: 'put-out' },
    };
    const start = getServiceWindowStart(booking);
    expect(start.getDate()).toBe(10);
    expect(start.getHours()).toBe(5);
  });

  test('bring-in with no time string: window starts at midnight next day', () => {
    const booking = {
      scheduledDate,
      bringInTime: '',
      serviceTypeId: { slug: 'bring-in' },
    };
    const start = getServiceWindowStart(booking);
    expect(start.getDate()).toBe(11);
    expect(start.getHours()).toBe(0);
  });

  test('non bring-in with no time: window starts at midnight same day', () => {
    const booking = {
      scheduledDate,
      putOutTime: '',
      serviceTypeId: { slug: 'put-out' },
    };
    const start = getServiceWindowStart(booking);
    expect(start.getDate()).toBe(10);
    expect(start.getHours()).toBe(0);
  });

  test('curb-items job: window starts at midnight same day', () => {
    const booking = {
      scheduledDate,
      serviceTypeId: { slug: 'curb-items' },
    };
    const start = getServiceWindowStart(booking);
    expect(start.getDate()).toBe(10);
    expect(start.getHours()).toBe(0);
  });
});

describe('bring-in en-route blocking', () => {
  test('bring-in scheduled for today should be blocked if window is tomorrow', () => {
    const now = new Date();
    const booking = {
      scheduledDate: now,
      bringInTime: '12–4 PM (Afternoon)',
      serviceTypeId: { slug: 'bring-in' },
    };
    const windowStart = getServiceWindowStart(booking);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    expect(windowStart.getDate()).toBe(tomorrow.getDate());
    expect(windowStart.getHours()).toBe(12);
  });

  test('put-out job with evening time allows en-route on scheduled day evening', () => {
    const today = new Date();
    today.setHours(17, 0, 0, 0);
    const booking = {
      scheduledDate: today,
      putOutTime: '4–9 PM (Evening)',
      serviceTypeId: { slug: 'put-out' },
    };
    const windowStart = getServiceWindowStart(booking);
    expect(today >= windowStart).toBe(true);
  });
});
