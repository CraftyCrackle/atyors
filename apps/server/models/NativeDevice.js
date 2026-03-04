const mongoose = require('mongoose');

const nativeDeviceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  platform: { type: String, enum: ['ios', 'android'], default: 'ios' },
}, { timestamps: true });

nativeDeviceSchema.index({ userId: 1 });
nativeDeviceSchema.index({ token: 1 }, { unique: true });

module.exports = mongoose.model('NativeDevice', nativeDeviceSchema);
