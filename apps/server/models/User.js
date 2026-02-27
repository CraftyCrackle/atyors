const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  cognitoId: { type: String },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  passwordHash: { type: String, select: false },
  role: { type: String, enum: ['customer', 'servicer', 'admin', 'superadmin'], default: 'customer' },
  stripeCustomerId: { type: String },
  addresses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Address' }],
  defaultAddressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    confirmations: { type: Boolean, default: true },
    reminders: { type: Boolean, default: true },
    statusUpdates: { type: Boolean, default: true },
  },
  profilePhotoUrl: { type: String, trim: true },
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.index({ email: 1 });
userSchema.index({ cognitoId: 1 }, { sparse: true });
userSchema.index({ stripeCustomerId: 1 });

module.exports = mongoose.model('User', userSchema);
