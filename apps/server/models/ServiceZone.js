const mongoose = require('mongoose');

const serviceZoneSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  polygon: {
    type: { type: String, enum: ['Polygon'], default: 'Polygon' },
    coordinates: { type: [[[Number]]], required: true },
  },
  isActive: { type: Boolean, default: true },
  pricingModifier: { type: Number, default: 1.0 },
}, {
  timestamps: true,
});

serviceZoneSchema.index({ polygon: '2dsphere' });

module.exports = mongoose.model('ServiceZone', serviceZoneSchema);
