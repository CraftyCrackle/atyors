const { getEarliestAcceptDate } = (() => {
  function getEarliestAcceptDate(booking) {
    const scheduled = new Date(booking.scheduledDate);
    scheduled.setHours(0, 0, 0, 0);

    const pot = (booking.putOutTime || '').toLowerCase();
    const svcName = (booking.serviceTypeId?.name || booking.serviceTypeId?.slug || '').toLowerCase();
    const isPutOut = svcName.includes('put-out') || svcName.includes('put out');
    const hasEveningTime = pot.includes('night before') || pot.includes('pm');

    if (isPutOut || hasEveningTime) {
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
    const booking = { scheduledDate: localDate, putOutTime: '', serviceTypeId: { name: 'Bring-In Only' } };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(10);
  });

  test('put-out service type (no putOutTime): earliest accept is one day before', () => {
    const booking = { scheduledDate: localDate, putOutTime: '', serviceTypeId: { name: 'Put-Out Only' } };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(9);
  });

  test('put-out with slug: earliest accept is one day before', () => {
    const booking = { scheduledDate: localDate, putOutTime: '', serviceTypeId: { slug: 'put-out' } };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(9);
  });

  test('evening put-out (5-7 PM): earliest accept is one day before', () => {
    const booking = { scheduledDate: localDate, putOutTime: '5–7 PM (Afternoon)', serviceTypeId: { name: 'Put-Out Only' } };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(9);
  });

  test('evening put-out (9-11 PM): earliest accept is one day before', () => {
    const booking = { scheduledDate: localDate, putOutTime: '9–11 PM (Night)', serviceTypeId: { name: 'Put-Out Only' } };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(9);
  });

  test('legacy night-before option: earliest accept is one day before', () => {
    const booking = { scheduledDate: localDate, putOutTime: 'Night before', serviceTypeId: {} };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(9);
  });

  test('no putOutTime and no service type defaults to scheduled date', () => {
    const booking = { scheduledDate: localDate };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(10);
  });
});
