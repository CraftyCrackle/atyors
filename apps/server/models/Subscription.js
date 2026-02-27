const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  addressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', required: true },
  serviceTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceType', required: true },
  stripeSubscriptionId: { type: String },
  stripePriceId: { type: String },
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled', 'past_due', 'trialing'],
    default: 'active',
  },
  dayOfWeek: { type: Number, min: 0, max: 6, required: true },
  barrelCount: { type: Number, default: 1, min: 1 },
  monthlyPrice: { type: Number, default: 20.00 },
  currentPeriodStart: { type: Date },
  currentPeriodEnd: { type: Date },
  cancelledAt: { type: Date },
  cancelAtPeriodEnd: { type: Boolean, default: false },
}, {
  timestamps: true,
});

subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });
subscriptionSchema.index({ status: 1, dayOfWeek: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
