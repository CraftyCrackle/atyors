const { getEarliestAcceptDate } = (() => {
  function getEarliestAcceptDate(booking) {
    const scheduled = new Date(booking.scheduledDate);
    scheduled.setHours(0, 0, 0, 0);
    const pot = (booking.putOutTime || '').toLowerCase();
    const isEveningBefore = pot.includes('night before') || pot.includes('pm');
    if (isEveningBefore) {
      const dayBefore = new Date(scheduled);
      dayBefore.setDate(dayBefore.getDate() - 1);
      return dayBefore;
    }
    return scheduled;
  }
  return { getEarliestAcceptDate };
})();

describe('Servicer accept-date enforcement', () => {
  const localDate = new Date(2026, 2, 10);

  test('bring-in only job: earliest accept is the scheduled date', () => {
    const booking = { scheduledDate: localDate, putOutTime: '' };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(10);
  });

  test('evening put-out (5-7 PM): earliest accept is one day before', () => {
    const booking = { scheduledDate: localDate, putOutTime: '5–7 PM (Afternoon)' };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(9);
  });

  test('evening put-out (7-9 PM): earliest accept is one day before', () => {
    const booking = { scheduledDate: localDate, putOutTime: '7–9 PM (Evening)' };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(9);
  });

  test('night put-out (9-11 PM): earliest accept is one day before', () => {
    const booking = { scheduledDate: localDate, putOutTime: '9–11 PM (Night)' };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(9);
  });

  test('legacy night-before option: earliest accept is one day before', () => {
    const booking = { scheduledDate: localDate, putOutTime: 'Night before' };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(9);
  });

  test('no putOutTime defaults to scheduled date', () => {
    const booking = { scheduledDate: localDate };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(10);
  });
});
