const Booking = require('../models/Booking');
const Route = require('../models/Route');

const GRACE_PERIOD_MS = 2 * 60 * 1000;

async function getAvailableJobs({ page = 1, limit = 20 } = {}) {
  const graceThreshold = new Date(Date.now() - GRACE_PERIOD_MS);
  const filter = {
    status: 'pending',
    assignedTo: null,
    paymentStatus: { $ne: 'pending_payment' },
    createdAt: { $lte: graceThreshold },
  };
  const bookings = await Booking.find(filter)
    .populate('addressId serviceTypeId userId')
    .sort({ scheduledDate: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Booking.countDocuments(filter);
  return { bookings, total, page, pages: Math.ceil(total / limit) };
}

async function getMyJobs(servicerId, { status, page = 1, limit = 20, sortBy } = {}) {
  const query = { assignedTo: servicerId };
  if (status) query.status = status;

  const ALLOWED_SORTS = { completedAt: { completedAt: -1 }, updatedAt: { updatedAt: -1 } };
  const sort = ALLOWED_SORTS[sortBy] || { scheduledDate: 1 };

  const bookings = await Booking.find(query)
    .populate('addressId serviceTypeId userId')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Booking.countDocuments(query);
  return { bookings, total, page, pages: Math.ceil(total / limit) };
}

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

async function acceptJob(bookingId, servicerId) {
  const booking = await Booking.findById(bookingId).populate('addressId serviceTypeId userId');
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  if (booking.status !== 'pending') {
    const err = new Error('Job is no longer available');
    err.status = 400;
    err.code = 'JOB_UNAVAILABLE';
    throw err;
  }
  if (booking.assignedTo) {
    const err = new Error('Job already assigned');
    err.status = 400;
    err.code = 'JOB_TAKEN';
    throw err;
  }
  if (booking.paymentStatus === 'pending_payment') {
    const err = new Error('This job is awaiting payment from the customer');
    err.status = 400;
    err.code = 'PAYMENT_PENDING';
    throw err;
  }

  const msSinceCreation = Date.now() - new Date(booking.createdAt).getTime();
  if (msSinceCreation < GRACE_PERIOD_MS) {
    const secsLeft = Math.ceil((GRACE_PERIOD_MS - msSinceCreation) / 1000);
    const err = new Error(`The customer has ${secsLeft}s left to review their booking. Please wait.`);
    err.status = 400;
    err.code = 'GRACE_PERIOD';
    err.meta = { availableAt: new Date(new Date(booking.createdAt).getTime() + GRACE_PERIOD_MS).toISOString() };
    throw err;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const earliest = getEarliestAcceptDate(booking);
  if (now < earliest) {
    const label = earliest.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const err = new Error(`This job cannot be accepted until ${label}`);
    err.status = 400;
    err.code = 'TOO_EARLY';
    err.meta = { earliestAcceptDate: earliest.toISOString() };
    throw err;
  }

  const result = await Booking.findOneAndUpdate(
    { _id: bookingId, status: 'pending', assignedTo: null },
    {
      assignedTo: servicerId,
      status: 'active',
      $push: { statusHistory: { status: 'active', changedAt: new Date(), changedBy: servicerId } },
    },
    { new: true }
  ).populate('addressId serviceTypeId userId assignedTo');

  if (!result) {
    const err = new Error('Job was already taken by another servicer');
    err.status = 409;
    err.code = 'JOB_TAKEN';
    throw err;
  }

  return result;
}

async function syncRouteStop(booking) {
  if (!booking.routeId) return;
  const route = await Route.findOne({ _id: booking.routeId, status: 'in-progress' });
  if (!route) return;

  const stopIdx = route.stops.findIndex(
    (s) => s.bookingId.toString() === booking._id.toString()
  );
  if (stopIdx === -1) return;

  route.stops[stopIdx].status = booking.status === 'completed' ? 'completed' : booking.status;

  if (booking.status === 'completed' && stopIdx === route.currentStopIndex) {
    const nextIdx = stopIdx + 1;
    if (nextIdx < route.stops.length) {
      route.currentStopIndex = nextIdx;
      route.stops[nextIdx].status = 'en-route';
      await Booking.findByIdAndUpdate(route.stops[nextIdx].bookingId, {
        status: 'en-route',
        $push: { statusHistory: { status: 'en-route', changedAt: new Date(), changedBy: booking.assignedTo } },
      });
    } else {
      route.currentStopIndex = route.stops.length;
      route.status = 'completed';
      route.completedAt = new Date();
    }
  }

  await route.save();
}

async function updateJobStatus(bookingId, servicerId, newStatus) {
  const booking = await Booking.findOne({ _id: bookingId, assignedTo: servicerId });
  if (!booking) {
    const err = new Error('Booking not found or not assigned to you');
    err.status = 404;
    throw err;
  }
  if (!booking.canTransitionTo(newStatus)) {
    const err = new Error(`Cannot transition from ${booking.status} to ${newStatus}`);
    err.status = 400;
    err.code = 'INVALID_TRANSITION';
    throw err;
  }

  if (newStatus === 'completed' && booking.paymentStatus !== 'paid') {
    const err = new Error('Cannot complete a booking that has not been paid');
    err.status = 400;
    err.code = 'PAYMENT_REQUIRED';
    throw err;
  }

  booking.status = newStatus;
  booking.statusHistory.push({ status: newStatus, changedAt: new Date(), changedBy: servicerId });
  if (newStatus === 'completed') booking.completedAt = new Date();
  await booking.save();
  await syncRouteStop(booking);
  await booking.populate('addressId serviceTypeId userId');
  return booking;
}

async function getJobDetail(bookingId, servicerId) {
  const booking = await Booking.findOne({
    _id: bookingId,
    $or: [{ assignedTo: servicerId }, { status: 'pending', assignedTo: null }],
  }).populate('addressId serviceTypeId userId');
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  return booking;
}

async function completeWithPhoto(bookingId, servicerId, photoUrl, completionNotes) {
  const booking = await Booking.findOne({ _id: bookingId, assignedTo: servicerId });
  if (!booking) {
    const err = new Error('Booking not found or not assigned to you');
    err.status = 404;
    throw err;
  }
  if (!booking.canTransitionTo('completed')) {
    const err = new Error(`Cannot complete from status: ${booking.status}`);
    err.status = 400;
    err.code = 'INVALID_TRANSITION';
    throw err;
  }
  if (booking.paymentStatus !== 'paid') {
    const err = new Error('Cannot complete a booking that has not been paid');
    err.status = 400;
    err.code = 'PAYMENT_REQUIRED';
    throw err;
  }

  booking.status = 'completed';
  booking.completionPhotoUrl = photoUrl;
  if (completionNotes) booking.notes = completionNotes;
  booking.completedAt = new Date();
  booking.statusHistory.push({ status: 'completed', changedAt: new Date(), changedBy: servicerId });
  await booking.save();

  try { await syncRouteStop(booking); } catch (e) {
    console.error(`syncRouteStop failed for booking ${bookingId}:`, e.message);
  }

  await booking.populate('addressId serviceTypeId userId');
  return booking;
}

module.exports = { getAvailableJobs, getMyJobs, acceptJob, updateJobStatus, completeWithPhoto, getJobDetail };
