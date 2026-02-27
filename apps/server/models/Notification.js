const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['booking:accepted', 'booking:status', 'booking:completed', 'booking:reviewed', 'message:new', 'queue:position'],
    required: true,
  },
  title: { type: String, required: true, maxlength: 200 },
  body: { type: String, required: true, maxlength: 500 },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  meta: { type: mongoose.Schema.Types.Mixed },
  readAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
