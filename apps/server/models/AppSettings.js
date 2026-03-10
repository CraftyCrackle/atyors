const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema({
  dailyBookingCap: { type: Number, default: 100, min: 1 },
}, { timestamps: true });

appSettingsSchema.statics.get = async function () {
  let settings = await this.findOne();
  if (!settings) settings = await this.create({});
  return settings;
};

appSettingsSchema.statics.set = async function (updates) {
  const settings = await this.get();
  Object.assign(settings, updates);
  await settings.save();
  return settings;
};

module.exports = mongoose.model('AppSettings', appSettingsSchema);
