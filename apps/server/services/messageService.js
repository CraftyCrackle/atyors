const Message = require('../models/Message');
const Booking = require('../models/Booking');

const ACTIVE_STATUSES = ['active', 'en-route', 'arrived', 'in-progress'];

async function send(bookingId, senderId, body) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  if (!ACTIVE_STATUSES.includes(booking.status)) {
    const err = new Error('Messaging is only available on active bookings');
    err.status = 400;
    err.code = 'BOOKING_NOT_ACTIVE';
    throw err;
  }

  const userId = booking.userId.toString();
  const assignedTo = booking.assignedTo?.toString();
  const sid = senderId.toString();

  if (sid !== userId && sid !== assignedTo) {
    const err = new Error('You are not a participant of this booking');
    err.status = 403;
    throw err;
  }

  const recipientId = sid === userId ? assignedTo : userId;
  if (!recipientId) {
    const err = new Error('No servicer assigned yet');
    err.status = 400;
    throw err;
  }

  const message = await Message.create({ bookingId, senderId, recipientId, body });
  return message.populate('senderId', 'firstName lastName');
}

async function listByBooking(bookingId, userId, page = 1, limit = 50) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  const uid = userId.toString();
  if (uid !== booking.userId.toString() && uid !== booking.assignedTo?.toString()) {
    const err = new Error('You are not a participant of this booking');
    err.status = 403;
    throw err;
  }

  await Message.updateMany(
    { bookingId, recipientId: userId, readAt: null },
    { readAt: new Date() }
  );

  const skip = (page - 1) * limit;
  const [messages, total] = await Promise.all([
    Message.find({ bookingId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'firstName lastName'),
    Message.countDocuments({ bookingId }),
  ]);

  return { messages, total, page, pages: Math.ceil(total / limit) };
}

async function getUnreadCount(userId) {
  return Message.countDocuments({ recipientId: userId, readAt: null });
}

module.exports = { send, listByBooking, getUnreadCount };
