const Review = require('../models/Review');
const Booking = require('../models/Booking');
const User = require('../models/User');

async function create(bookingId, reviewerId, { rating, comment }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  if (booking.status !== 'completed') {
    const err = new Error('Reviews can only be submitted for completed bookings');
    err.status = 400;
    err.code = 'BOOKING_NOT_COMPLETED';
    throw err;
  }

  const rid = reviewerId.toString();
  const userId = booking.userId.toString();
  const assignedTo = booking.assignedTo?.toString();

  if (rid !== userId && rid !== assignedTo) {
    const err = new Error('You are not a participant of this booking');
    err.status = 403;
    throw err;
  }

  const role = rid === userId ? 'customer' : 'servicer';
  const revieweeId = rid === userId ? assignedTo : userId;

  if (!revieweeId) {
    const err = new Error('No other party to review');
    err.status = 400;
    throw err;
  }

  const existing = await Review.findOne({ bookingId, reviewerId });
  if (existing) {
    const err = new Error('You have already reviewed this booking');
    err.status = 409;
    err.code = 'ALREADY_REVIEWED';
    throw err;
  }

  const review = await Review.create({ bookingId, reviewerId, revieweeId, rating, comment, role });

  const agg = await Review.aggregate([
    { $match: { revieweeId: review.revieweeId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  if (agg.length) {
    await User.findByIdAndUpdate(revieweeId, {
      averageRating: Math.round(agg[0].avg * 10) / 10,
      totalReviews: agg[0].count,
    });
  }

  return review.populate('reviewerId', 'firstName lastName');
}

async function getByBooking(bookingId) {
  return Review.find({ bookingId })
    .populate('reviewerId', 'firstName lastName')
    .populate('revieweeId', 'firstName lastName');
}

async function getByUser(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    Review.find({ revieweeId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reviewerId', 'firstName lastName'),
    Review.countDocuments({ revieweeId: userId }),
  ]);
  return { reviews, total, page, pages: Math.ceil(total / limit) };
}

async function getMyReviews(reviewerId) {
  return Review.find({ reviewerId }, 'bookingId rating createdAt').lean();
}

module.exports = { create, getByBooking, getByUser, getMyReviews };
