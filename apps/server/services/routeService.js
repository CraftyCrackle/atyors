const Route = require('../models/Route');
const Booking = require('../models/Booking');

const DEEP_POPULATE = {
  path: 'stops.bookingId',
  populate: [{ path: 'addressId' }, { path: 'serviceTypeId' }, { path: 'userId' }],
};

async function createRoute(servicerId, date, bookingIds) {
  const routeDate = new Date(date);
  routeDate.setHours(0, 0, 0, 0);

  const existing = await Route.findOne({
    servicerId,
    date: routeDate,
    status: { $in: ['planned', 'in-progress'] },
  });
  if (existing) {
    const err = new Error('A route already exists for this date');
    err.status = 400;
    err.code = 'ROUTE_EXISTS';
    throw err;
  }

  const bookings = await Booking.find({
    _id: { $in: bookingIds },
    assignedTo: servicerId,
    status: 'active',
  });

  if (bookings.length !== bookingIds.length) {
    const err = new Error('Some bookings are invalid, not assigned to you, or not in active status');
    err.status = 400;
    err.code = 'INVALID_BOOKINGS';
    throw err;
  }

  const stops = bookingIds.map((id, i) => ({
    bookingId: id,
    order: i,
    status: 'pending',
  }));

  const route = await Route.create({
    servicerId,
    date: routeDate,
    stops,
    status: 'planned',
  });

  await Promise.all(
    bookingIds.map((id, i) =>
      Booking.findByIdAndUpdate(id, { routeId: route._id, routeOrder: i })
    )
  );

  return route.populate(DEEP_POPULATE);
}

async function startRoute(routeId, servicerId) {
  const route = await Route.findOne({ _id: routeId, servicerId });
  if (!route) {
    const err = new Error('Route not found');
    err.status = 404;
    throw err;
  }
  if (route.status !== 'planned') {
    const err = new Error('Route is already started or completed');
    err.status = 400;
    throw err;
  }

  const firstBooking = await Booking.findById(route.stops[0].bookingId);
  if (!firstBooking || !firstBooking.canTransitionTo('en-route')) {
    const err = new Error(`Cannot start route: first booking cannot transition to en-route`);
    err.status = 400;
    err.code = 'INVALID_TRANSITION';
    throw err;
  }

  route.status = 'in-progress';
  route.currentStopIndex = 0;
  route.startedAt = new Date();
  route.stops[0].status = 'en-route';
  await route.save();

  firstBooking.status = 'en-route';
  firstBooking.statusHistory.push({ status: 'en-route', changedAt: new Date(), changedBy: servicerId });
  await firstBooking.save();

  return route.populate(DEEP_POPULATE);
}

async function completeCurrentStop(routeId, servicerId) {
  const route = await Route.findOne({ _id: routeId, servicerId, status: 'in-progress' });
  if (!route) {
    const err = new Error('No active route found');
    err.status = 404;
    throw err;
  }

  const idx = route.currentStopIndex;
  if (idx < 0 || idx >= route.stops.length) {
    const err = new Error('No current stop to complete');
    err.status = 400;
    throw err;
  }

  const completedBooking = await Booking.findById(route.stops[idx].bookingId);
  if (!completedBooking || !completedBooking.canTransitionTo('completed')) {
    const err = new Error(`Cannot complete: booking cannot transition to completed from ${completedBooking?.status}`);
    err.status = 400;
    err.code = 'INVALID_TRANSITION';
    throw err;
  }
  if (completedBooking.paymentStatus !== 'paid') {
    const err = new Error('Cannot complete a booking that has not been paid');
    err.status = 400;
    err.code = 'PAYMENT_REQUIRED';
    throw err;
  }

  route.stops[idx].status = 'completed';
  completedBooking.status = 'completed';
  completedBooking.completedAt = new Date();
  completedBooking.statusHistory.push({ status: 'completed', changedAt: new Date(), changedBy: servicerId });
  await completedBooking.save();

  const nextIdx = idx + 1;
  if (nextIdx < route.stops.length) {
    const nextBooking = await Booking.findById(route.stops[nextIdx].bookingId);
    if (nextBooking && nextBooking.canTransitionTo('en-route')) {
      route.currentStopIndex = nextIdx;
      route.stops[nextIdx].status = 'en-route';
      nextBooking.status = 'en-route';
      nextBooking.statusHistory.push({ status: 'en-route', changedAt: new Date(), changedBy: servicerId });
      await nextBooking.save();
    } else {
      route.currentStopIndex = nextIdx;
      route.stops[nextIdx].status = 'en-route';
    }
  } else {
    route.currentStopIndex = route.stops.length;
    route.status = 'completed';
    route.completedAt = new Date();
  }

  await route.save();
  return route.populate(DEEP_POPULATE);
}

async function markStopArrived(routeId, servicerId) {
  const route = await Route.findOne({ _id: routeId, servicerId, status: 'in-progress' });
  if (!route) {
    const err = new Error('No active route found');
    err.status = 404;
    throw err;
  }

  const idx = route.currentStopIndex;
  if (idx < 0 || idx >= route.stops.length) {
    const err = new Error('No current stop');
    err.status = 400;
    throw err;
  }

  const stop = route.stops[idx];
  if (stop.status !== 'en-route') {
    const err = new Error(`Cannot mark arrived from status: ${stop.status}`);
    err.status = 400;
    throw err;
  }

  const booking = await Booking.findById(stop.bookingId);
  if (!booking || !booking.canTransitionTo('arrived')) {
    const err = new Error(`Cannot mark arrived: booking cannot transition from ${booking?.status} to arrived`);
    err.status = 400;
    err.code = 'INVALID_TRANSITION';
    throw err;
  }

  stop.status = 'arrived';
  booking.status = 'arrived';
  booking.statusHistory.push({ status: 'arrived', changedAt: new Date(), changedBy: servicerId });
  await booking.save();

  await route.save();
  return route.populate(DEEP_POPULATE);
}

async function skipCurrentStop(routeId, servicerId) {
  const route = await Route.findOne({ _id: routeId, servicerId, status: 'in-progress' });
  if (!route) {
    const err = new Error('No active route found');
    err.status = 404;
    throw err;
  }

  const idx = route.currentStopIndex;
  route.stops[idx].status = 'skipped';

  const nextIdx = idx + 1;
  if (nextIdx < route.stops.length) {
    route.currentStopIndex = nextIdx;
    route.stops[nextIdx].status = 'en-route';

    await Booking.findByIdAndUpdate(route.stops[nextIdx].bookingId, {
      status: 'en-route',
      $push: { statusHistory: { status: 'en-route', changedAt: new Date(), changedBy: servicerId } },
    });
  } else {
    route.currentStopIndex = route.stops.length;
    route.status = 'completed';
    route.completedAt = new Date();
  }

  await route.save();
  return route.populate(DEEP_POPULATE);
}

async function getActiveRoute(servicerId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const route = await Route.findOne({
    servicerId,
    date: { $gte: today, $lt: tomorrow },
    status: 'in-progress',
  }).populate(DEEP_POPULATE);

  return route;
}

async function getPlannedRoute(servicerId, date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const next = new Date(d);
  next.setDate(next.getDate() + 1);

  return Route.findOne({
    servicerId,
    date: { $gte: d, $lt: next },
    status: { $in: ['planned', 'in-progress'] },
  }).populate(DEEP_POPULATE);
}

async function getQueuePosition(bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) return { inRoute: false };

  if (!booking.routeId) {
    const isLive = ['en-route', 'arrived'].includes(booking.status);
    if (isLive) {
      const { getLiveLocation } = require('../socket');
      const loc = getLiveLocation(bookingId);
      return {
        inRoute: false,
        isNext: true,
        servicerLocation: loc ? { lat: loc.lat, lng: loc.lng, timestamp: loc.timestamp } : null,
      };
    }
    return { inRoute: false };
  }

  const route = await Route.findById(booking.routeId);
  if (!route || route.status !== 'in-progress') {
    return { inRoute: true, routeStatus: route?.status || 'unknown', position: null, total: null, isNext: false };
  }

  const stopIndex = route.stops.findIndex(
    (s) => s.bookingId.toString() === bookingId.toString()
  );
  if (stopIndex === -1) {
    return { inRoute: false };
  }

  const stop = route.stops[stopIndex];
  if (stop.status === 'completed' || stop.status === 'skipped') {
    return { inRoute: true, routeStatus: 'in-progress', position: 0, total: route.stops.length, isNext: false, stopStatus: stop.status };
  }

  const remaining = route.stops.filter(
    (s, i) => i >= route.currentStopIndex && s.status !== 'completed' && s.status !== 'skipped'
  );
  const posInRemaining = remaining.findIndex(
    (s) => s.bookingId.toString() === bookingId.toString()
  );

  const isNext = stopIndex === route.currentStopIndex;
  const servicerLocation = isNext && route.lastLocation?.lat ? route.lastLocation : null;

  return {
    inRoute: true,
    routeStatus: 'in-progress',
    position: posInRemaining + 1,
    total: remaining.length,
    isNext,
    servicerLocation,
    stopStatus: stop.status,
  };
}

async function updateLocation(routeId, lat, lng) {
  await Route.findByIdAndUpdate(routeId, {
    lastLocation: { lat, lng, timestamp: new Date() },
  });
}

module.exports = {
  createRoute,
  startRoute,
  completeCurrentStop,
  markStopArrived,
  skipCurrentStop,
  getActiveRoute,
  getPlannedRoute,
  getQueuePosition,
  updateLocation,
};
