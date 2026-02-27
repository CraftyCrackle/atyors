const reviewService = require('../services/reviewService');

async function create(req, res, next) {
  try {
    const review = await reviewService.create(req.params.id, req.user._id, req.body);
    res.status(201).json({ success: true, data: { review } });
  } catch (err) { next(err); }
}

async function getByBooking(req, res, next) {
  try {
    const reviews = await reviewService.getByBooking(req.params.id);
    res.json({ success: true, data: { reviews } });
  } catch (err) { next(err); }
}

async function getByUser(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const result = await reviewService.getByUser(req.params.id, page);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function getMyReviews(req, res, next) {
  try {
    const reviews = await reviewService.getMyReviews(req.user._id);
    res.json({ success: true, data: { reviews } });
  } catch (err) { next(err); }
}

module.exports = { create, getByBooking, getByUser, getMyReviews };
