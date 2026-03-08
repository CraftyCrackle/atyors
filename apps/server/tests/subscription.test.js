const mongoose = require('mongoose');

jest.mock('../models/Subscription');
jest.mock('../models/Booking');
jest.mock('../models/ServiceType');
jest.mock('../models/User');
jest.mock('../services/stripeService');

const mockConfig = { stripe: { skip: true } };
jest.mock('../config', () => mockConfig);

const Subscription = require('../models/Subscription');
const Booking = require('../models/Booking');
const stripeService = require('../services/stripeService');
const { toggleAutoRenew, cancel } = require('../services/subscriptionService');

const userId = new mongoose.Types.ObjectId();
const subId = new mongoose.Types.ObjectId();

function makeFakeSub(overrides = {}) {
  return {
    _id: subId,
    userId,
    status: 'active',
    cancelAtPeriodEnd: false,
    stripeSubscriptionId: 'sub_test123',
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('toggleAutoRenew', () => {
  beforeEach(() => jest.clearAllMocks());

  it('disables auto-renewal (sets cancelAtPeriodEnd to true)', async () => {
    const sub = makeFakeSub();
    Subscription.findOne.mockResolvedValue(sub);

    const result = await toggleAutoRenew(subId, userId, false);

    expect(result.cancelAtPeriodEnd).toBe(true);
    expect(sub.save).toHaveBeenCalled();
  });

  it('enables auto-renewal (sets cancelAtPeriodEnd to false)', async () => {
    const sub = makeFakeSub({ cancelAtPeriodEnd: true });
    Subscription.findOne.mockResolvedValue(sub);

    const result = await toggleAutoRenew(subId, userId, true);

    expect(result.cancelAtPeriodEnd).toBe(false);
    expect(sub.save).toHaveBeenCalled();
  });

  it('throws 404 when subscription not found', async () => {
    Subscription.findOne.mockResolvedValue(null);
    await expect(toggleAutoRenew(subId, userId, true)).rejects.toThrow('Subscription not found');
  });

  it('throws 400 when subscription is cancelled', async () => {
    const sub = makeFakeSub({ status: 'cancelled' });
    Subscription.findOne.mockResolvedValue(sub);
    await expect(toggleAutoRenew(subId, userId, true)).rejects.toThrow('Cannot modify a cancelled subscription');
  });
});

describe('cancel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cancels subscription and future bookings', async () => {
    const sub = makeFakeSub();
    Subscription.findOne.mockResolvedValue(sub);
    Booking.updateMany.mockResolvedValue({ modifiedCount: 3 });

    const result = await cancel(subId, userId);

    expect(result.status).toBe('cancelled');
    expect(result.cancelledAt).toBeTruthy();
    expect(sub.save).toHaveBeenCalled();
    expect(Booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: subId, status: { $in: ['pending', 'active'] } }),
      expect.objectContaining({ status: 'cancelled' }),
    );
  });

  it('throws 404 when subscription not found', async () => {
    Subscription.findOne.mockResolvedValue(null);
    await expect(cancel(subId, userId)).rejects.toThrow('Subscription not found');
  });
});

describe('toggleAutoRenew with Stripe enabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.stripe.skip = false;
    stripeService.updateSubscription.mockResolvedValue({});
  });

  afterEach(() => {
    mockConfig.stripe.skip = true;
  });

  it('calls Stripe to set cancel_at_period_end when disabling', async () => {
    const sub = makeFakeSub();
    Subscription.findOne.mockResolvedValue(sub);

    await toggleAutoRenew(subId, userId, false);

    expect(stripeService.updateSubscription).toHaveBeenCalledWith('sub_test123', { cancel_at_period_end: true });
  });

  it('calls Stripe to unset cancel_at_period_end when enabling', async () => {
    const sub = makeFakeSub({ cancelAtPeriodEnd: true });
    Subscription.findOne.mockResolvedValue(sub);

    await toggleAutoRenew(subId, userId, true);

    expect(stripeService.updateSubscription).toHaveBeenCalledWith('sub_test123', { cancel_at_period_end: false });
  });
});
