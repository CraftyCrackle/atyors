const { getEarliestAcceptDate } = (() => {
  function getEarliestAcceptDate(booking) {
    const scheduled = new Date(booking.scheduledDate);
    scheduled.setHours(0, 0, 0, 0);
    if (booking.putOutTime === 'Night before') {
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

  test('standard job: earliest accept is the scheduled date', () => {
    const booking = { scheduledDate: localDate, putOutTime: 'Before 7 AM' };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(10);
  });

  test('night-before job: earliest accept is one day before scheduled date', () => {
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
