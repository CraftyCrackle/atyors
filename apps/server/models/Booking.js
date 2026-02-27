const mongoose = require('mongoose');

const STATUS_FLOW = {
  pending: ['active', 'cancelled'],
  active: ['en-route', 'cancelled'],
  'en-route': ['arrived', 'cancelled'],
  arrived: ['completed', 'no-show'],
  completed: [],
  cancelled: [],
  'no-show': [],
};

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  addressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', required: true },
  serviceTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceType', required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  scheduledDate: { type: Date, required: true },
  barrelCount: { type: Number, default: 1, min: 1 },
  putOutTime: { type: String, trim: true },
  bringInTime: { type: String, trim: true },
  status: {
    type: String,
    enum: Object.keys(STATUS_FLOW),
    default: 'pending',
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  linkedBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  routeOrder: { type: Number },
  stripePaymentIntentId: { type: String },
  paymentStatus: {
    type: String,
    enum: ['pending_payment', 'paid', 'failed', 'refunded'],
    default: 'pending_payment',
  },
  amount: { type: Number },
  serviceValue: { type: Number },
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  notes: { type: String, trim: true },
  completionPhotoUrl: { type: String },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  cancellationFee: { type: Number, default: 0 },
  cancellationReason: { type: String, trim: true },
}, {
  timestamps: true,
});

bookingSchema.methods.canTransitionTo = function (newStatus) {
  const allowed = STATUS_FLOW[this.status];
  return allowed && allowed.includes(newStatus);
};

bookingSchema.index({ userId: 1, scheduledDate: -1 });
bookingSchema.index({ status: 1, scheduledDate: 1 });
bookingSchema.index({ assignedTo: 1, scheduledDate: 1 });
bookingSchema.index({ paymentStatus: 1, status: 1, createdAt: 1 });
bookingSchema.index({ subscriptionId: 1, scheduledDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.STATUS_FLOW = STATUS_FLOW;
