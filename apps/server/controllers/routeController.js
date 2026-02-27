const routeService = require('../services/routeService');
const notificationService = require('../services/notificationService');

async function createRoute(req, res, next) {
  try {
    const { date, bookingIds } = req.body;
    if (!date || !bookingIds?.length) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'date and bookingIds are required' } });
    }
    const route = await routeService.createRoute(req.user._id, date, bookingIds);
    res.status(201).json({ success: true, data: { route } });
  } catch (err) { next(err); }
}

async function getActiveRoute(req, res, next) {
  try {
    const route = await routeService.getActiveRoute(req.user._id);
    res.json({ success: true, data: { route } });
  } catch (err) { next(err); }
}

async function getPlannedRoute(req, res, next) {
  try {
    const date = req.query.date || new Date().toISOString();
    const route = await routeService.getPlannedRoute(req.user._id, date);
    res.json({ success: true, data: { route } });
  } catch (err) { next(err); }
}

async function startRoute(req, res, next) {
  try {
    const route = await routeService.startRoute(req.params.id, req.user._id);

    const io = req.app.locals.io;
    for (const [i, stop] of route.stops.entries()) {
      const bId = stop.bookingId?._id || stop.bookingId;
      const userId = stop.bookingId?.userId?._id || stop.bookingId?.userId;
      if (i === 0) {
        const msg = 'Your servicer is on the way! You are the first stop.';
        await notificationService.create({ userId, type: 'booking:status', title: 'Servicer En Route', body: msg, bookingId: bId, meta: { status: 'en-route' } });
        if (io) io.of('/notifications').to(`user:${userId}`).emit('booking:status', { bookingId: bId, status: 'en-route', message: msg });
      } else {
        const msg = `Your servicer has started their route. You are stop #${i + 1} of ${route.stops.length}.`;
        await notificationService.create({ userId, type: 'queue:position', title: 'Route Started', body: msg, bookingId: bId, meta: { position: i + 1, total: route.stops.length } });
        if (io) io.of('/notifications').to(`user:${userId}`).emit('queue:position', { bookingId: bId, position: i + 1, total: route.stops.length, message: msg });
      }
    }

    res.json({ success: true, data: { route } });
  } catch (err) { next(err); }
}

async function completeStop(req, res, next) {
  try {
    const route = await routeService.completeCurrentStop(req.params.id, req.user._id);

    const io = req.app.locals.io;
    const completedIdx = route.currentStopIndex - 1;
    if (completedIdx >= 0 && completedIdx < route.stops.length) {
      const completed = route.stops[completedIdx];
      const cUserId = completed.bookingId?.userId?._id || completed.bookingId?.userId;
      const cBId = completed.bookingId?._id || completed.bookingId;
      const msg = 'Your service is complete! Tap to view the summary.';
      await notificationService.create({ userId: cUserId, type: 'booking:completed', title: 'Job Completed', body: msg, bookingId: cBId, meta: { status: 'completed' } });
      if (io) io.of('/notifications').to(`user:${cUserId}`).emit('booking:status', { bookingId: cBId, status: 'completed', message: msg });
    }

    if (route.status === 'in-progress') {
      for (const [i, stop] of route.stops.entries()) {
        if (stop.status === 'completed' || stop.status === 'skipped') continue;
        const bId = stop.bookingId?._id || stop.bookingId;
        const userId = stop.bookingId?.userId?._id || stop.bookingId?.userId;
        if (i === route.currentStopIndex) {
          const msg = 'Your servicer is heading to you next! Track them live.';
          await notificationService.create({ userId, type: 'booking:status', title: 'Servicer En Route', body: msg, bookingId: bId, meta: { status: 'en-route' } });
          if (io) io.of('/notifications').to(`user:${userId}`).emit('booking:status', { bookingId: bId, status: 'en-route', message: msg });
        } else {
          const remaining = route.stops.filter((s, si) => si >= route.currentStopIndex && s.status !== 'completed' && s.status !== 'skipped');
          const pos = remaining.findIndex((s) => (s.bookingId?._id || s.bookingId).toString() === bId.toString());
          if (pos >= 0) {
            const msg = `You are now stop #${pos + 1} of ${remaining.length}.`;
            await notificationService.create({ userId, type: 'queue:position', title: 'Queue Updated', body: msg, bookingId: bId, meta: { position: pos + 1, total: remaining.length } });
            if (io) io.of('/notifications').to(`user:${userId}`).emit('queue:position', { bookingId: bId, position: pos + 1, total: remaining.length, message: msg });
          }
        }
      }
    }

    res.json({ success: true, data: { route } });
  } catch (err) { next(err); }
}

async function markArrived(req, res, next) {
  try {
    const route = await routeService.markStopArrived(req.params.id, req.user._id);

    const stop = route.stops[route.currentStopIndex];
    const userId = stop.bookingId?.userId?._id || stop.bookingId?.userId;
    const bId = stop.bookingId?._id || stop.bookingId;
    const svcName = stop.bookingId?.serviceTypeId?.name || 'Service';
    const msg = `Your servicer has arrived for your ${svcName}!`;

    await notificationService.create({ userId, type: 'booking:status', title: 'Servicer Arrived', body: msg, bookingId: bId, meta: { status: 'arrived' } });

    const io = req.app.locals.io;
    if (io) {
      io.of('/notifications').to(`user:${userId}`).emit('booking:status', { bookingId: bId, status: 'arrived', message: msg });
      io.of('/tracking').to(`booking:${bId}`).emit('status:update', {
        bookingId: bId,
        status: 'arrived',
        timestamp: Date.now(),
      });
    }

    res.json({ success: true, data: { route } });
  } catch (err) { next(err); }
}

async function skipStop(req, res, next) {
  try {
    const route = await routeService.skipCurrentStop(req.params.id, req.user._id);
    res.json({ success: true, data: { route } });
  } catch (err) { next(err); }
}

module.exports = { createRoute, getActiveRoute, getPlannedRoute, startRoute, completeStop, markArrived, skipStop };
