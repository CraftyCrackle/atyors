const mongoose = require('mongoose');

const carouselImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  caption: { type: String, trim: true, default: '' },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

carouselImageSchema.index({ sortOrder: 1, isActive: 1 });

module.exports = mongoose.model('CarouselImage', carouselImageSchema);
