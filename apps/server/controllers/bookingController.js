const bookingService = require('../services/bookingService');

async function create(req, res, next) {
  try {
    const booking = await bookingService.create(req.user._id, req.body);
    res.status(201).json({ success: true, data: { booking } });
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    const { status, page, limit } = req.query;
    const result = await bookingService.listByUser(req.user._id, { status, page: parseInt(page) || 1, limit: parseInt(limit) || 20 });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const booking = await bookingService.getById(req.params.id, req.user._id);
    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
}

async function cancel(req, res, next) {
  try {
    const booking = await bookingService.cancel(req.params.id, req.user._id, req.body.reason);
    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
}

async function reschedule(req, res, next) {
  try {
    const booking = await bookingService.reschedule(req.params.id, req.user._id, req.body);
    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
}

module.exports = { create, list, getById, cancel, reschedule };
