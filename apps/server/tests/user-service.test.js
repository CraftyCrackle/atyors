const mongoose = require('mongoose');

jest.mock('../models/User');
jest.mock('../models/Address');
jest.mock('../models/Booking');
jest.mock('../models/Subscription');
jest.mock('../models/Notification');
jest.mock('../models/RefreshToken');
jest.mock('../models/PushSubscription');
jest.mock('../models/NativeDevice');
jest.mock('../services/stripeService');

const mockConfig = { stripe: { skip: true } };
jest.mock('../config', () => mockConfig);

const User = require('../models/User');
const Address = require('../models/Address');
const Booking = require('../models/Booking');
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');
const RefreshToken = require('../models/RefreshToken');
const PushSubscription = require('../models/PushSubscription');
const NativeDevice = require('../models/NativeDevice');
const stripeService = require('../services/stripeService');
const { deleteUser, updateRole, deactivate } = require('../services/userService');

const userId = new mongoose.Types.ObjectId();
const requesterId = new mongoose.Types.ObjectId();

function makeFakeUser(overrides = {}) {
  return {
    _id: userId,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'customer',
    isActive: true,
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('deleteUser', () => {
  test('deletes user and all associated data', async () => {
    User.findById.mockResolvedValue(makeFakeUser());
    Subscription.find.mockResolvedValue([]);
    Address.deleteMany.mockResolvedValue({ deletedCount: 1 });
    Booking.updateMany.mockResolvedValue({ modifiedCount: 2 });
    Subscription.deleteMany.mockResolvedValue({ deletedCount: 0 });
    Notification.deleteMany.mockResolvedValue({ deletedCount: 5 });
    RefreshToken.deleteMany.mockResolvedValue({ deletedCount: 1 });
    PushSubscription.deleteMany.mockResolvedValue({ deletedCount: 0 });
    NativeDevice.deleteMany.mockResolvedValue({ deletedCount: 0 });
    User.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const result = await deleteUser(userId, requesterId);

    expect(result.email).toBe('test@example.com');
    expect(User.deleteOne).toHaveBeenCalledWith({ _id: userId });
    expect(Address.deleteMany).toHaveBeenCalledWith({ userId });
    expect(Booking.updateMany).toHaveBeenCalledWith(
      { userId, status: { $in: ['pending', 'active'] } },
      { status: 'cancelled', cancelledAt: expect.any(Date) },
    );
    expect(Notification.deleteMany).toHaveBeenCalledWith({ userId });
    expect(RefreshToken.deleteMany).toHaveBeenCalledWith({ userId });
  });

  test('throws 404 if user not found', async () => {
    User.findById.mockResolvedValue(null);
    await expect(deleteUser(userId, requesterId)).rejects.toThrow('User not found');
  });

  test('throws 403 when deleting admin as non-self', async () => {
    User.findById.mockResolvedValue(makeFakeUser({ role: 'admin' }));
    await expect(deleteUser(userId, requesterId)).rejects.toThrow('Cannot delete admin users');
  });

  test('allows admin to delete self', async () => {
    User.findById.mockResolvedValue(makeFakeUser({ _id: userId, role: 'admin' }));
    Subscription.find.mockResolvedValue([]);
    Address.deleteMany.mockResolvedValue({});
    Booking.updateMany.mockResolvedValue({});
    Subscription.deleteMany.mockResolvedValue({});
    Notification.deleteMany.mockResolvedValue({});
    RefreshToken.deleteMany.mockResolvedValue({});
    PushSubscription.deleteMany.mockResolvedValue({});
    NativeDevice.deleteMany.mockResolvedValue({});
    User.deleteOne.mockResolvedValue({});

    const result = await deleteUser(userId, userId);
    expect(result.email).toBe('test@example.com');
  });

  test('cancels active Stripe subscriptions when Stripe is enabled', async () => {
    mockConfig.stripe.skip = false;
    const sub = { _id: 's1', stripeSubscriptionId: 'sub_123', status: 'active' };
    User.findById.mockResolvedValue(makeFakeUser());
    Subscription.find.mockResolvedValue([sub]);
    stripeService.cancelSubscription.mockResolvedValue({});
    Address.deleteMany.mockResolvedValue({});
    Booking.updateMany.mockResolvedValue({});
    Subscription.deleteMany.mockResolvedValue({});
    Notification.deleteMany.mockResolvedValue({});
    RefreshToken.deleteMany.mockResolvedValue({});
    PushSubscription.deleteMany.mockResolvedValue({});
    NativeDevice.deleteMany.mockResolvedValue({});
    User.deleteOne.mockResolvedValue({});

    await deleteUser(userId, requesterId);
    expect(stripeService.cancelSubscription).toHaveBeenCalledWith('sub_123');
    mockConfig.stripe.skip = true;
  });
});

describe('updateRole', () => {
  test('updates user role', async () => {
    const updated = makeFakeUser({ role: 'servicer' });
    User.findByIdAndUpdate.mockReturnValue({ select: jest.fn().mockResolvedValue(updated) });

    const result = await updateRole(userId, 'servicer');
    expect(result.role).toBe('servicer');
  });

  test('throws on invalid role', async () => {
    await expect(updateRole(userId, 'wizard')).rejects.toThrow('Invalid role');
  });

  test('throws 404 if user not found', async () => {
    User.findByIdAndUpdate.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    await expect(updateRole(userId, 'servicer')).rejects.toThrow('User not found');
  });
});

describe('deactivate', () => {
  test('deactivates user and clears tokens', async () => {
    const deactivated = makeFakeUser({ isActive: false });
    User.findByIdAndUpdate.mockReturnValue({ select: jest.fn().mockResolvedValue(deactivated) });
    RefreshToken.deleteMany.mockResolvedValue({});

    const result = await deactivate(userId);
    expect(result.isActive).toBe(false);
    expect(RefreshToken.deleteMany).toHaveBeenCalledWith({ userId });
  });

  test('throws 404 if user not found', async () => {
    User.findByIdAndUpdate.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    await expect(deactivate(userId)).rejects.toThrow('User not found');
  });
});
