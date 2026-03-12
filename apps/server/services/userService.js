const User = require('../models/User');
const Address = require('../models/Address');
const Booking = require('../models/Booking');
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');
const RefreshToken = require('../models/RefreshToken');
const PushSubscription = require('../models/PushSubscription');
const NativeDevice = require('../models/NativeDevice');
const config = require('../config');

let stripeService;
try { stripeService = require('./stripeService'); } catch {}

async function deleteUser(userId, requestingUserId) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  if (['admin', 'superadmin'].includes(user.role) && String(userId) !== String(requestingUserId)) {
    const err = new Error('Cannot delete admin users');
    err.status = 403;
    throw err;
  }

  const activeSubs = await Subscription.find({
    userId,
    status: { $in: ['active', 'past_due'] },
  });
  for (const sub of activeSubs) {
    if (!config.stripe?.skip && sub.stripeSubscriptionId && stripeService) {
      try { await stripeService.cancelSubscription(sub.stripeSubscriptionId); } catch (e) {
        console.error(`Failed to cancel Stripe subscription ${sub.stripeSubscriptionId}:`, e.message);
      }
    }
  }

  const assignedBookings = await Booking.find({
    userId,
    status: { $in: ['pending', 'active'] },
    assignedTo: { $ne: null },
  }).select('_id assignedTo serviceTypeId').populate('serviceTypeId');

  await Promise.all([
    Address.deleteMany({ userId }),
    Booking.updateMany(
      { userId, status: { $in: ['pending', 'active'] } },
      { status: 'cancelled', assignedTo: null, cancelledAt: new Date() },
    ),
    Subscription.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
    RefreshToken.deleteMany({ userId }),
    PushSubscription.deleteMany({ userId }),
    NativeDevice.deleteMany({ userId }),
  ]);

  if (assignedBookings.length > 0) {
    const notificationService = require('./notificationService');
    for (const b of assignedBookings) {
      notificationService.create({
        userId: b.assignedTo,
        type: 'booking:status',
        title: 'Job Cancelled',
        body: `A ${b.serviceTypeId?.name || 'service'} job has been cancelled — the customer's account was removed.`,
        bookingId: b._id,
        meta: { status: 'cancelled' },
      }).catch(() => {});
    }
  }

  await User.deleteOne({ _id: userId });

  return { email: user.email, firstName: user.firstName, lastName: user.lastName };
}

async function updateRole(userId, newRole) {
  const validRoles = ['customer', 'servicer', 'admin', 'superadmin'];
  if (!validRoles.includes(newRole)) {
    const err = new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { role: newRole },
    { new: true, runValidators: true },
  ).select('-passwordHash -__v');

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return user;
}

async function deactivate(userId) {
  const user = await User.findByIdAndUpdate(
    userId,
    { isActive: false },
    { new: true },
  ).select('-passwordHash -__v');

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  await RefreshToken.deleteMany({ userId });
  return user;
}

module.exports = { deleteUser, updateRole, deactivate };
