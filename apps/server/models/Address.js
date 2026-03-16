const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  street: { type: String, required: true, trim: true },
  unit: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  zip: { type: String, required: true, trim: true },
  formatted: { type: String, trim: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  barrelCount: { type: Number, default: 1, min: 1 },
  barrelLocation: { type: String, trim: true },
  barrelPhotoUrl: { type: String, trim: true },
  photos: [{ type: String, trim: true }],
  barrelNotes: { type: String, trim: true },
  barrelPlacementInstructions: { type: String, trim: true },
  barrelReturnInstructions: { type: String, trim: true },
  trashDay: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], trim: true },
  streetCleaning: [{
    side: { type: String, trim: true },
    dayOfWeek: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], trim: true },
    weekPattern: { type: String, enum: ['every', '1st', '2nd', '3rd', '4th', '1st_and_3rd', '2nd_and_4th'], default: 'every' },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    seasonStart: { type: String, trim: true },
    seasonEnd: { type: String, trim: true },
    signPhotoUrl: { type: String, trim: true },
    rawSignText: { type: String, trim: true },
  }],
  isDefault: { type: Boolean, default: false },
  serviceZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceZone' },
}, {
  timestamps: true,
});

addressSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Address', addressSchema);
