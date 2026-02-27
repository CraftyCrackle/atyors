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
    const booking = await servicerService.completeWithPhoto(req.params.id, req.user._id, photoUrl, completionNotes);

    const svcName = booking.serviceTypeId?.name || 'Service';
    const msg = `Your ${svcName} has been completed! Tap to view the summary.`;

    await notificationService.create({
      userId: booking.userId,
      type: 'booking:completed',
      title: 'Job Completed',
      body: msg,
      bookingId: booking._id,
      meta: { status: 'completed', hasPhoto: true },
    });

    const io = req.app.locals.io;
    if (io) {
      io.of('/notifications').to(`user:${booking.userId}`).emit('booking:status', {
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

    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
}

async function getEarnings(req, res, next) {
  try {
    const stats = await earningsService.getServicerStats(req.user._id);
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
}

module.exports = { getAvailableJobs, getMyJobs, getJobDetail, acceptJob, updateJobStatus, completeWithPhoto, getEarnings };
