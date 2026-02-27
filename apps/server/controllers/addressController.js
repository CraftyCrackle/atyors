const addressService = require('../services/addressService');

async function create(req, res, next) {
  try {
    const result = await addressService.create(req.user._id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    const addresses = await addressService.list(req.user._id);
    res.json({ success: true, data: { addresses } });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await addressService.remove(req.user._id, req.params.id);
    res.json({ success: true, data: { message: 'Address deleted' } });
  } catch (err) { next(err); }
}

async function checkZone(req, res, next) {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, error: { code: 'MISSING_COORDS', message: 'lat and lng required' } });
    const result = await addressService.checkZone(parseFloat(lat), parseFloat(lng));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const address = await addressService.update(req.user._id, req.params.id, req.body);
    res.json({ success: true, data: { address } });
  } catch (err) { next(err); }
}

async function uploadPhoto(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No photo uploaded' } });
    const photoUrl = `/uploads/${req.file.filename}`;
    const address = await addressService.update(req.user._id, req.params.id, { barrelPhotoUrl: photoUrl });
    res.json({ success: true, data: { address, photoUrl } });
  } catch (err) { next(err); }
}

module.exports = { create, list, remove, update, uploadPhoto, checkZone };
