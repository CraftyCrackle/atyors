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

module.exports = { create, list, remove, checkZone };
