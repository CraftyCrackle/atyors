const Booking = require('../models/Booking');

async function create(userId, data) {
  const booking = await Booking.create({
    userId,
    addressId: data.addressId,
    serviceTypeId: data.serviceTypeId,
    scheduledDate: new Date(data.scheduledDate),
    timeWindow: data.timeWindow,
    amount: data.amount,
    subscriptionId: data.subscriptionId,
    statusHistory: [{ status: 'pending', changedAt: new Date() }],
  });
  return booking.populate(['addressId', 'serviceTypeId']);
}

async function listByUser(userId, { status, page = 1, limit = 20 } = {}) {
  const query = { userId };
  if (status) query.status = status;

  const bookings = await Booking.find(query)
    .populate('addressId serviceTypeId')
    .sort({ scheduledDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Booking.countDocuments(query);
  return { bookings, total, page, pages: Math.ceil(total / limit) };
}

async function getById(bookingId, userId) {
  const booking = await Booking.findOne({ _id: bookingId, userId })
    .populate('addressId serviceTypeId assignedTo');
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  return booking;
}

async function updateStatus(bookingId, newStatus, changedBy) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  if (!booking.canTransitionTo(newStatus)) {
    const err = new Error(`Cannot transition from ${booking.status} to ${newStatus}`);
    err.status = 400;
    err.code = 'INVALID_TRANSITION';
    throw err;
  }

  booking.status = newStatus;
  booking.statusHistory.push({ status: newStatus, changedAt: new Date(), changedBy });
  if (newStatus === 'completed') booking.completedAt = new Date();
  if (newStatus === 'cancelled') booking.cancelledAt = new Date();
  await booking.save();
  return booking;
}

async function cancel(bookingId, userId, reason) {
  const booking = await Booking.findOne({ _id: bookingId, userId });
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  const hoursUntil = (new Date(booking.scheduledDate) - new Date()) / (1000 * 60 * 60);
  if (hoursUntil < 24) {
    const err = new Error('Cannot cancel within 24 hours of scheduled service');
    err.status = 400;
    err.code = 'CANCELLATION_WINDOW';
    throw err;
  }

  if (!booking.canTransitionTo('cancelled')) {
    const err = new Error('Booking cannot be cancelled in current state');
    err.status = 400;
    throw err;
  }

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancellationReason = reason;
  booking.statusHistory.push({ status: 'cancelled', changedAt: new Date(), changedBy: userId });
  await booking.save();
  return booking;
}

async function reschedule(bookingId, userId, { scheduledDate, timeWindow }) {
  const booking = await Booking.findOne({ _id: bookingId, userId });
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  if (!['pending', 'confirmed'].includes(booking.status)) {
    const err = new Error('Can only reschedule pending or confirmed bookings');
    err.status = 400;
    throw err;
  }

  booking.scheduledDate = new Date(scheduledDate);
  booking.timeWindow = timeWindow;
  await booking.save();
  return booking;
}

module.exports = { create, listByUser, getById, updateStatus, cancel, reschedule };
