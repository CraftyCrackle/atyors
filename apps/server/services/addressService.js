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
    barrelCount: data.barrelCount || 1,
    barrelLocation: data.barrelLocation,
    barrelPhotoUrl: data.barrelPhotoUrl,
    barrelNotes: data.barrelNotes,
    barrelPlacementInstructions: data.barrelPlacementInstructions,
    barrelReturnInstructions: data.barrelReturnInstructions,
    trashDay: data.trashDay,
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

async function update(userId, addressId, data) {
  const allowed = ['street', 'unit', 'city', 'state', 'zip', 'formatted', 'barrelCount', 'barrelLocation', 'barrelPhotoUrl', 'barrelNotes', 'barrelPlacementInstructions', 'barrelReturnInstructions', 'trashDay', 'isDefault'];
  const updates = {};
  for (const key of allowed) {
    if (data[key] !== undefined) updates[key] = data[key];
  }

  const address = await Address.findOneAndUpdate({ _id: addressId, userId }, updates, { new: true });
  if (!address) {
    const err = new Error('Address not found');
    err.status = 404;
    throw err;
  }
  return address;
}

module.exports = { create, list, remove, update, checkZone };
