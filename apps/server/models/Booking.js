const mongoose = require('mongoose');

const STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['en-route', 'cancelled'],
  'en-route': ['arrived', 'cancelled'],
  arrived: ['in-progress'],
  'in-progress': ['completed', 'no-show'],
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
  timeWindow: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
  status: {
    type: String,
    enum: Object.keys(STATUS_FLOW),
    default: 'pending',
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  stripePaymentIntentId: { type: String },
  amount: { type: Number },
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  notes: { type: String, trim: true },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
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

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.STATUS_FLOW = STATUS_FLOW;
