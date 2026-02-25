const Address = require('../models/Address');
const ServiceZone = require('../models/ServiceZone');
const User = require('../models/User');

async function create(userId, data) {
  const zone = await ServiceZone.findOne({
    polygon: { $geoIntersects: { $geometry: { type: 'Point', coordinates: [data.lng, data.lat] } } },
    isActive: true,
  });

  const address = await Address.create({
    userId,
    street: data.street,
    unit: data.unit,
    city: data.city,
    state: data.state,
    zip: data.zip,
    formatted: data.formatted,
    location: { type: 'Point', coordinates: [data.lng, data.lat] },
    isDefault: data.isDefault || false,
    serviceZoneId: zone?._id,
  });

  await User.findByIdAndUpdate(userId, { $addToSet: { addresses: address._id } });

  if (data.isDefault) {
    await Address.updateMany({ userId, _id: { $ne: address._id } }, { isDefault: false });
    await User.findByIdAndUpdate(userId, { defaultAddressId: address._id });
  }

  return { address, inServiceZone: !!zone, zone: zone?.name };
}

async function list(userId) {
  return Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
}

async function remove(userId, addressId) {
  const address = await Address.findOneAndDelete({ _id: addressId, userId });
  if (!address) {
    const err = new Error('Address not found');
    err.status = 404;
    throw err;
  }
  await User.findByIdAndUpdate(userId, { $pull: { addresses: addressId } });
  return address;
}

async function checkZone(lat, lng) {
  const zone = await ServiceZone.findOne({
    polygon: { $geoIntersects: { $geometry: { type: 'Point', coordinates: [lng, lat] } } },
    isActive: true,
  });
  return { eligible: !!zone, zone: zone?.name || null };
}

module.exports = { create, list, remove, checkZone };
