const mongoose = require('mongoose');

const serviceTypeSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, trim: true },
  basePrice: { type: Number, required: true },
  recurringPrice: { type: Number },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, {
  timestamps: true,
});

serviceTypeSchema.index({ categoryId: 1 });

module.exports = mongoose.model('ServiceType', serviceTypeSchema);
