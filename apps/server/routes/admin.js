const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User');
const ServiceZone = require('../models/ServiceZone');

router.use(authenticate, requireRole('admin', 'superadmin'));

router.get('/bookings', async (req, res, next) => {
  try {
    const { status, date, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (date) {
      const d = new Date(date);
      query.scheduledDate = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    }
    const bookings = await Booking.find(query)
      .populate('userId addressId serviceTypeId assignedTo')
      .sort({ scheduledDate: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Booking.countDocuments(query);
    res.json({ success: true, data: { bookings, total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.patch('/bookings/:id/assign', async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, { assignedTo: req.body.assignedTo }, { new: true }).populate('userId addressId serviceTypeId assignedTo');
    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
});

router.patch('/bookings/:id/status', async (req, res, next) => {
  try {
    const bookingService = require('../services/bookingService');
    const booking = await bookingService.updateStatus(req.params.id, req.body.status, req.user._id);
    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
});

router.get('/customers', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const query = { role: 'customer' };
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    const customers = await User.find(query).select('-passwordHash -__v').populate('addresses').skip((page - 1) * limit).limit(parseInt(limit));
    const total = await User.countDocuments(query);
    res.json({ success: true, data: { customers, total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get('/customers/:id', async (req, res, next) => {
  try {
    const customer = await User.findById(req.params.id).select('-passwordHash -__v').populate('addresses');
    if (!customer) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    const bookings = await Booking.find({ userId: req.params.id }).populate('addressId serviceTypeId').sort({ scheduledDate: -1 }).limit(50);
    res.json({ success: true, data: { customer, bookings } });
  } catch (err) { next(err); }
});

router.post('/zones', async (req, res, next) => {
  try {
    const zone = await ServiceZone.create(req.body);
    res.status(201).json({ success: true, data: { zone } });
  } catch (err) { next(err); }
});

router.patch('/zones/:id', async (req, res, next) => {
  try {
    const zone = await ServiceZone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: { zone } });
  } catch (err) { next(err); }
});

router.delete('/zones/:id', async (req, res, next) => {
  try {
    await ServiceZone.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: { message: 'Zone deleted' } });
  } catch (err) { next(err); }
});

router.get('/reports/summary', async (req, res, next) => {
  try {
    const [totalBookings, activeBookings, completedBookings, totalCustomers] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: { $in: ['pending', 'confirmed', 'en-route', 'arrived', 'in-progress'] } }),
      Booking.countDocuments({ status: 'completed' }),
      User.countDocuments({ role: 'customer' }),
    ]);
    res.json({ success: true, data: { totalBookings, activeBookings, completedBookings, totalCustomers } });
  } catch (err) { next(err); }
});

module.exports = router;
