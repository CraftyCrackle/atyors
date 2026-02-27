const mongoose = require('mongoose');

const processedEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  type: { type: String },
  processedAt: { type: Date, default: Date.now },
});

processedEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model('ProcessedEvent', processedEventSchema);
