const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User');
const ServiceZone = require('../models/ServiceZone');
const AppSettings = require('../models/AppSettings');
const ServiceType = require('../models/ServiceType');
const userService = require('../services/userService');

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
    if (!req.body.assignedTo) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELD', message: 'assignedTo is required' } });
    }
    const servicer = await User.findById(req.body.assignedTo);
    if (!servicer || !['servicer', 'admin', 'superadmin'].includes(servicer.role)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_SERVICER', message: 'Assigned user must be a servicer' } });
    }
    const booking = await Booking.findByIdAndUpdate(req.params.id, { assignedTo: req.body.assignedTo }, { new: true }).populate('userId addressId serviceTypeId assignedTo');
    if (!booking) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } });
    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
});

router.patch('/bookings/:id/status', async (req, res, next) => {
  try {
    if (!req.body.status) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELD', message: 'status is required' } });
    }
    const bookingService = require('../services/bookingService');
    const booking = await bookingService.updateStatus(req.params.id, req.body.status, req.user._id);
    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
});

router.get('/customers', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const query = { role: 'customer', email: { $ne: 'atyors.support@gmail.com' } };
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

router.get('/users', async (req, res, next) => {
  try {
    const { search, role, page = 1, limit = 50 } = req.query;
    const query = { email: { $ne: 'atyors.support@gmail.com' } };
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    const users = await User.find(query)
      .select('-passwordHash -__v')
      .populate('addresses')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await User.countDocuments(query);
    res.json({ success: true, data: { users, total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const deleted = await userService.deleteUser(req.params.id, req.user._id);
    res.json({ success: true, data: { message: `User ${deleted.email} deleted`, ...deleted } });
  } catch (err) { next(err); }
});

router.patch('/users/:id/role', async (req, res, next) => {
  try {
    if (!req.body.role) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELD', message: 'role is required' } });
    }
    const user = await userService.updateRole(req.params.id, req.body.role);
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
});

router.patch('/users/:id/deactivate', async (req, res, next) => {
  try {
    const user = await userService.deactivate(req.params.id);
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
});

router.get('/servicers', async (req, res, next) => {
  try {
    const servicers = await User.find({ role: { $in: ['servicer', 'admin', 'superadmin'] }, isActive: true })
      .select('firstName lastName email role averageRating totalReviews')
      .sort({ firstName: 1 });
    res.json({ success: true, data: { servicers } });
  } catch (err) { next(err); }
});

router.get('/reports/summary', async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const revenueExpr = { $ifNull: ['$serviceValue', '$amount'] };
    const completedMatch = { status: 'completed' };

    const ecType = await ServiceType.findOne({ slug: 'entrance-cleaning' }).select('_id').lean();
    const ecTypeId = ecType?._id;
    const nonEcFilter = ecTypeId ? { serviceTypeId: { $ne: ecTypeId } } : {};
    const todayStatusFilter = { scheduledDate: { $gte: todayStart, $lt: todayEnd }, status: { $in: ['pending', 'active', 'en-route', 'arrived', 'completed'] } };

    const [totalBookings, activeBookings, completedBookings, totalCustomers, settings, todayBooked, ecTodayBooked, revenueAll, revenueWeek, revenueMonth] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: { $in: ['pending', 'active', 'en-route', 'arrived', 'in-progress'] } }),
      Booking.countDocuments({ status: 'completed' }),
      User.countDocuments({ role: 'customer' }),
      AppSettings.get(),
      Booking.countDocuments({ ...todayStatusFilter, ...nonEcFilter }),
      ecTypeId
        ? Booking.countDocuments({ ...todayStatusFilter, serviceTypeId: ecTypeId })
        : Promise.resolve(0),
      Booking.aggregate([{ $match: completedMatch }, { $group: { _id: null, total: { $sum: revenueExpr } } }]),
      Booking.aggregate([{ $match: { ...completedMatch, completedAt: { $gte: weekStart } }, }, { $group: { _id: null, total: { $sum: revenueExpr } } }]),
      Booking.aggregate([{ $match: { ...completedMatch, completedAt: { $gte: monthStart } }, }, { $group: { _id: null, total: { $sum: revenueExpr } } }]),
    ]);

    const totalRevenue = revenueAll[0]?.total || 0;
    const weekRevenue = revenueWeek[0]?.total || 0;
    const monthRevenue = revenueMonth[0]?.total || 0;

    res.json({ success: true, data: { totalBookings, activeBookings, completedBookings, totalCustomers, dailyBookingCap: settings.dailyBookingCap, todayBooked, entranceCleaningDailyCap: settings.entranceCleaningDailyCap, ecTodayBooked, totalRevenue, weekRevenue, monthRevenue } });
  } catch (err) { next(err); }
});

router.get('/settings', async (req, res, next) => {
  try {
    const settings = await AppSettings.get();
    res.json({ success: true, data: { settings } });
  } catch (err) { next(err); }
});

router.patch('/settings', async (req, res, next) => {
  try {
    const { dailyBookingCap, entranceCleaningDailyCap } = req.body;
    const updates = {};
    if (dailyBookingCap !== undefined) {
      const cap = parseInt(dailyBookingCap);
      if (isNaN(cap) || cap < 1) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_VALUE', message: 'dailyBookingCap must be a positive number' } });
      }
      updates.dailyBookingCap = cap;
    }
    if (entranceCleaningDailyCap !== undefined) {
      const cap = parseInt(entranceCleaningDailyCap);
      if (isNaN(cap) || cap < 0) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_VALUE', message: 'entranceCleaningDailyCap must be 0 (unlimited) or a positive number' } });
      }
      updates.entranceCleaningDailyCap = cap;
    }
    const settings = await AppSettings.set(updates);
    res.json({ success: true, data: { settings } });
  } catch (err) { next(err); }
});

router.post('/zipcodes', async (req, res, next) => {
  try {
    const { zipcode } = req.body;
    if (!zipcode || !/^\d{5}$/.test(zipcode.trim())) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ZIPCODE', message: 'A valid 5-digit zipcode is required' } });
    }
    const settings = await AppSettings.get();
    const zip = zipcode.trim();
    if (settings.servedZipcodes.includes(zip)) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Zipcode already added' } });
    }
    settings.servedZipcodes.push(zip);
    settings.servedZipcodes.sort();
    await settings.save();

    const Address = require('../models/Address');
    const notificationService = require('../services/notificationService');
    const emailService = require('../services/emailService');
    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://atyors.com';

    Address.find({ zip }).populate('userId').then(async (addresses) => {
      const notifiedUserIds = new Set();
      for (const addr of addresses) {
        const user = addr.userId;
        if (!user || !user.isActive || notifiedUserIds.has(user._id.toString())) continue;
        notifiedUserIds.add(user._id.toString());

        notificationService.create({
          userId: user._id,
          type: 'zone:expanded',
          title: 'We now serve your area!',
          body: `Great news — atyors is now available in your zipcode (${zip}). Book your first service today!`,
        }).catch(() => {});

        emailService.send({
          to: user.email,
          subject: 'atyors is now in your area!',
          text: `Great news, ${user.firstName}! atyors now serves your area (${zip}). You can book your first curbside service at ${BASE_URL}/book. Thank you for your patience — we're excited to help!`,
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;"><tr><td align="center"><table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);"><tr><td align="center" style="padding:32px 24px 16px;"><img src="${BASE_URL}/icons/icon-192.png" alt="atyors" width="48" height="48" style="display:block;border-radius:10px;" /><p style="margin:8px 0 0;font-size:14px;font-weight:600;color:#6b7280;letter-spacing:0.5px;">ATYORS</p></td></tr><tr><td style="padding:0 24px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" /></td></tr><tr><td align="center" style="padding:32px 24px 8px;"><div style="display:inline-block;width:56px;height:56px;background:#dbeafe;border-radius:50%;text-align:center;line-height:56px;"><span style="font-size:28px;">📍</span></div></td></tr><tr><td align="center" style="padding:8px 24px 8px;"><h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;">We're now in your area!</h1></td></tr><tr><td align="center" style="padding:0 24px 24px;"><p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">Hi ${user.firstName}, great news! atyors now serves zipcode <strong>${zip}</strong>. You can start booking curbside services right away.</p></td></tr><tr><td align="center" style="padding:0 24px 32px;"><a href="${BASE_URL}/book" style="display:inline-block;padding:14px 32px;background:#4472c4;color:#fff;font-weight:600;font-size:15px;text-decoration:none;border-radius:8px;">Book a Service</a></td></tr><tr><td style="padding:0 24px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" /></td></tr><tr><td style="padding:24px;text-align:center;"><p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">Questions? Reach us at <a href="mailto:admin@atyors.com" style="color:#2563eb;text-decoration:none;">admin@atyors.com</a></p><p style="margin:0;font-size:12px;color:#d1d5db;">atyors — At Your Service</p></td></tr></table></td></tr></table></body></html>`,
        }).catch((err) => {
          console.error(`[Zipcode] Failed to email ${user.email}:`, err.message);
        });
      }
      if (notifiedUserIds.size > 0) {
        console.log(`[Zipcode] Notified ${notifiedUserIds.size} user(s) about new zipcode ${zip}`);
      }
    }).catch((err) => {
      console.error(`[Zipcode] Failed to notify users for ${zip}:`, err.message);
    });

    res.status(201).json({ success: true, data: { servedZipcodes: settings.servedZipcodes } });
  } catch (err) { next(err); }
});

router.get('/zipcodes/demand', async (req, res, next) => {
  try {
    const Address = require('../models/Address');
    const settings = await AppSettings.get();
    const served = new Set(settings.servedZipcodes);

    const pipeline = [
      { $match: { zip: { $exists: true, $ne: '' } } },
      { $group: {
        _id: '$zip',
        addressCount: { $sum: 1 },
        users: { $addToSet: '$userId' },
      }},
      { $project: {
        zip: '$_id',
        _id: 0,
        addressCount: 1,
        userCount: { $size: '$users' },
      }},
      { $sort: { addressCount: -1 } },
    ];

    const results = await Address.aggregate(pipeline);
    const data = results.map((r) => ({
      ...r,
      served: served.has(r.zip),
    }));

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete('/zipcodes/:zipcode', async (req, res, next) => {
  try {
    const settings = await AppSettings.get();
    const idx = settings.servedZipcodes.indexOf(req.params.zipcode);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Zipcode not in served list' } });
    }
    settings.servedZipcodes.splice(idx, 1);
    await settings.save();
    res.json({ success: true, data: { servedZipcodes: settings.servedZipcodes } });
  } catch (err) { next(err); }
});

module.exports = router;
