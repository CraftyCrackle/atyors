const mongoose = require('mongoose');

const STOP_STATUSES = ['pending', 'en-route', 'arrived', 'completed', 'skipped'];

const routeSchema = new mongoose.Schema({
  servicerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  stops: [{
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    order: { type: Number, required: true },
    status: { type: String, enum: STOP_STATUSES, default: 'pending' },
  }],
  currentStopIndex: { type: Number, default: -1 },
  status: { type: String, enum: ['planned', 'in-progress', 'completed'], default: 'planned' },
  lastLocation: {
    lat: Number,
    lng: Number,
    timestamp: Date,
  },
  startedAt: Date,
  completedAt: Date,
}, {
  timestamps: true,
});

routeSchema.index({ servicerId: 1, date: 1 });
routeSchema.index({ 'stops.bookingId': 1 });
routeSchema.index({ status: 1, servicerId: 1 });

module.exports = mongoose.model('Route', routeSchema);
