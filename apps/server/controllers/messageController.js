const messageService = require('../services/messageService');

async function send(req, res, next) {
  try {
    const message = await messageService.send(req.params.id, req.user._id, req.body.body);

    const io = req.app.locals.io;
    if (io) {
      io.of('/notifications').to(`user:${message.recipientId}`).emit('message:new', {
        bookingId: message.bookingId,
        senderId: message.senderId._id || message.senderId,
        senderName: message.senderId.firstName ? `${message.senderId.firstName} ${message.senderId.lastName}` : undefined,
        body: message.body,
        createdAt: message.createdAt,
      });
    }

    res.status(201).json({ success: true, data: { message } });
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const result = await messageService.listByBooking(req.params.id, req.user._id, page);

    const io = req.app.locals.io;
    if (io && result.messages.length) {
      const booking = result.messages[0].bookingId;
      const otherParty = result.messages.find(
        (m) => m.senderId._id?.toString() !== req.user._id.toString()
      );
      if (otherParty) {
        io.of('/notifications').to(`user:${otherParty.senderId._id || otherParty.senderId}`).emit('message:read', {
          bookingId: booking,
          readBy: req.user._id,
        });
      }
    }

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function unreadCount(req, res, next) {
  try {
    const count = await messageService.getUnreadCount(req.user._id);
    res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
}

module.exports = { send, list, unreadCount };
