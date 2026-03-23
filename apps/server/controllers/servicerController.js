const servicerService = require('../services/servicerService');
const notificationService = require('../services/notificationService');
const earningsService = require('../services/earningsService');

async function getAvailableJobs(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await servicerService.getAvailableJobs({ page: parseInt(page) || 1, limit: parseInt(limit) || 20 });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function getMyJobs(req, res, next) {
  try {
    const { status, page, limit, sortBy } = req.query;
    const result = await servicerService.getMyJobs(req.user._id, { status, page: parseInt(page) || 1, limit: parseInt(limit) || 20, sortBy });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function getJobDetail(req, res, next) {
  try {
    const booking = await servicerService.getJobDetail(req.params.id, req.user._id);
    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
}

async function acceptJob(req, res, next) {
  try {
    const booking = await servicerService.acceptJob(req.params.id, req.user._id);

    const svcName = booking.serviceTypeId?.name || 'Service';
    const servicerName = `${req.user.firstName} ${req.user.lastName}`;
    const msg = `${servicerName} accepted your ${svcName} service.`;

    await notificationService.create({
      userId: booking.userId,
      type: 'booking:accepted',
      title: 'Job Accepted',
      body: msg,
      bookingId: booking._id,
      meta: { servicerName, serviceName: svcName },
    });

    const io = req.app.locals.io;
    if (io) {
      io.of('/notifications').to(`user:${booking.userId}`).emit('booking:accepted', {
        bookingId: booking._id,
        servicerName,
        serviceName: svcName,
        scheduledDate: booking.scheduledDate,
        message: msg,
      });
    }

    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
}

async function updateJobStatus(req, res, next) {
  try {
    const booking = await servicerService.updateJobStatus(req.params.id, req.user._id, req.body.status);

    const svcName = booking.serviceTypeId?.name || 'Service';
    const statusMessages = {
      'en-route': `Your servicer is on the way for your ${svcName}!`,
      arrived: `Your servicer has arrived for your ${svcName}!`,
      completed: `Your ${svcName} has been completed!`,
    };
    const statusTitles = { 'en-route': 'Servicer En Route', arrived: 'Servicer Arrived', completed: 'Job Completed' };
    const msg = statusMessages[booking.status] || `Your service status: ${booking.status}`;

    await notificationService.create({
      userId: booking.userId,
      type: 'booking:status',
      title: statusTitles[booking.status] || 'Status Update',
      body: msg,
      bookingId: booking._id,
      meta: { status: booking.status },
    });

    const io = req.app.locals.io;
    if (io) {
      io.of('/notifications').to(`user:${booking.userId}`).emit('booking:status', {
        bookingId: booking._id,
        status: booking.status,
        message: msg,
      });
      io.of('/tracking').to(`booking:${booking._id}`).emit('status:update', {
        bookingId: booking._id,
        status: booking.status,
        timestamp: Date.now(),
      });
    }

    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
}

async function completeWithPhoto(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('Completion photo is required');
      err.status = 400;
      return next(err);
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    const completionNotes = req.body.notes || '';
    const placementNotes = req.body.placementNotes || '';
    const booking = await servicerService.completeWithPhoto(req.params.id, req.user._id, photoUrl, completionNotes, { placementNotes });

    const customerId = booking.userId?._id || booking.userId;
    const svcName = booking.serviceTypeId?.name || 'Service';
    const msg = `Your ${svcName} has been completed! Tap to view the summary.`;

    try {
      await notificationService.create({
        userId: customerId,
        type: 'booking:completed',
        title: 'Job Completed',
        body: msg,
        bookingId: booking._id,
        meta: { status: 'completed', hasPhoto: true },
      });

      const io = req.app.locals.io;
      if (io) {
        io.of('/notifications').to(`user:${customerId}`).emit('booking:status', {
          bookingId: booking._id,
          status: 'completed',
          message: msg,
        });
        io.of('/tracking').to(`booking:${booking._id}`).emit('status:update', {
          bookingId: booking._id,
          status: 'completed',
          timestamp: Date.now(),
        });
      }
    } catch (notifyErr) {
      console.error(`Post-completion notification failed for booking ${req.params.id}:`, notifyErr.message);
    }

    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
}

async function getEarnings(req, res, next) {
  try {
    const stats = await earningsService.getServicerStats(req.user._id);
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
}

async function updateLocation(req, res, next) {
  try {
    const { lat, lng, heading, speed, bookingId, routeId } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ success: false, error: { message: 'lat and lng required' } });
    }

    const io = req.app.locals.io;
    const routeService = require('../services/routeService');
    const Route = require('../models/Route');
    const { setLiveLocation } = require('../socket');
    const payload = { lat, lng, heading, speed, timestamp: Date.now(), providerId: req.user._id.toString() };

    if (routeId) {
      const route = await Route.findById(routeId);
      if (route && route.status === 'in-progress' && route.servicerId.toString() === req.user._id.toString()) {
        await routeService.updateLocation(route._id, lat, lng);
        const idx = route.currentStopIndex;
        if (idx >= 0 && idx < route.stops.length) {
          const currentStop = route.stops[idx];
          if (io) io.of('/tracking').to(`booking:${currentStop.bookingId}`).emit('location:update', payload);

          route.stops.forEach((stop, i) => {
            if (i <= idx || stop.status === 'completed' || stop.status === 'skipped') return;
            const remaining = route.stops.filter((s, si) => si >= idx && s.status !== 'completed' && s.status !== 'skipped');
            const pos = remaining.findIndex((s) => s.bookingId.toString() === stop.bookingId.toString());
            if (pos > 0 && io) {
              io.of('/tracking').to(`booking:${stop.bookingId}`).emit('queue:position', { bookingId: stop.bookingId, position: pos + 1, total: remaining.length });
            }
          });
        }
      }
    } else if (bookingId) {
      setLiveLocation(bookingId, payload);
      if (io) io.of('/tracking').to(`booking:${bookingId}`).emit('location:update', payload);
    }

    res.json({ success: true });
  } catch (err) { next(err); }
}

async function denyJob(req, res, next) {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      const err = new Error('A reason is required when denying a request');
      err.status = 400;
      return next(err);
    }

    const booking = await servicerService.denyJob(req.params.id, req.user._id, reason.trim());

    const customerId = booking.userId?._id || booking.userId;
    const svcName = booking.serviceTypeId?.name || 'Curb Items';
    const msg = `Your ${svcName} request was denied: "${reason.trim()}"`;

    try {
      await notificationService.create({
        userId: customerId,
        type: 'booking:denied',
        title: 'Request Denied',
        body: msg,
        bookingId: booking._id,
        meta: { status: 'denied' },
      });

      const io = req.app.locals.io;
      if (io) {
        io.of('/notifications').to(`user:${customerId}`).emit('booking:status', {
          bookingId: booking._id,
          status: 'denied',
          message: msg,
        });
      }
    } catch (notifyErr) {
      console.error(`Deny notification failed for booking ${req.params.id}:`, notifyErr.message);
    }

    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
}

async function updateTaskProgress(req, res, next) {
  try {
    const { taskKey, completed } = req.body;
    if (!taskKey || typeof taskKey !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'taskKey is required' } });
    }
    const Booking = require('../models/Booking');
    const booking = await Booking.findOne({ _id: req.params.id, assignedTo: req.user._id }).populate('serviceTypeId');
    if (!booking) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found or not assigned to you' } });
    }
    if (booking.serviceTypeId?.slug !== 'entrance-cleaning') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_SERVICE', message: 'Task progress only applies to entrance cleaning bookings' } });
    }
    if (completed) {
      if (!booking.taskProgress.includes(taskKey)) booking.taskProgress.push(taskKey);
    } else {
      booking.taskProgress = booking.taskProgress.filter((k) => k !== taskKey);
    }
    await booking.save();
    res.json({ success: true, data: { taskProgress: booking.taskProgress } });
  } catch (err) { next(err); }
}

async function getCalendarJobs(req, res, next) {
  try {
    const month = req.query.month;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_MONTH', message: 'month query param required (YYYY-MM)' } });
    }
    const bookings = await servicerService.getCalendarJobs(req.user._id, month);
    res.json({ success: true, data: { bookings } });
  } catch (err) { next(err); }
}

module.exports = { getAvailableJobs, getMyJobs, getJobDetail, acceptJob, updateJobStatus, completeWithPhoto, getEarnings, updateLocation, denyJob, getCalendarJobs, updateTaskProgress };
