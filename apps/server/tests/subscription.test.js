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
const { toggleAutoRenew, cancel, create } = require('../services/subscriptionService');

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

describe('create — duplicate subscription check', () => {
  const ServiceType = require('../models/ServiceType');
  const addressId = new mongoose.Types.ObjectId();
  const svcTypeId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    Subscription.create.mockImplementation((data) => Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId(), save: jest.fn() }));
    Booking.create.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
    Booking.findOne.mockResolvedValue(null);
    ServiceType.findById.mockResolvedValue({ _id: svcTypeId, slug: 'entrance-cleaning', name: 'Multi-Family Entrance Cleaning' });
  });

  it('blocks duplicate subscription for same address + service type', async () => {
    Subscription.findOne.mockResolvedValue(makeFakeSub());
    await expect(create(userId, {
      serviceTypeId: svcTypeId.toString(),
      addressId: addressId.toString(),
      dayOfWeek: 1,
      floors: 1,
    })).rejects.toMatchObject({ code: 'DUPLICATE_SUBSCRIPTION' });
    expect(Subscription.findOne).toHaveBeenCalledWith(expect.objectContaining({
      userId,
      addressId: addressId.toString(),
      serviceTypeId: svcTypeId.toString(),
    }));
  });

  it('allows different service type at same address', async () => {
    // findOne returns null (no existing sub for this service type)
    Subscription.findOne.mockResolvedValue(null);
    const { subscription } = await create(userId, {
      serviceTypeId: svcTypeId.toString(),
      addressId: addressId.toString(),
      dayOfWeek: 1,
      floors: 2,
      staircases: 0,
    });
    expect(subscription).toBeDefined();
  });
});

describe('create — entrance cleaning subscription', () => {
  const ServiceType = require('../models/ServiceType');

  beforeEach(() => {
    jest.clearAllMocks();
    Subscription.findOne.mockResolvedValue(null);
    Subscription.create.mockImplementation((data) => Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId(), save: jest.fn() }));
    Booking.create.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
    Booking.findOne.mockResolvedValue(null);
  });

  it('calculates monthly price from floors and staircases', async () => {
    ServiceType.findById.mockResolvedValue({ _id: new mongoose.Types.ObjectId(), slug: 'entrance-cleaning', name: 'Multi-Family Entrance Cleaning' });
    const { subscription } = await create(userId, {
      serviceTypeId: new mongoose.Types.ObjectId().toString(),
      addressId: new mongoose.Types.ObjectId().toString(),
      dayOfWeek: 1,
      floors: 2,
      staircases: 1,
      frontEntrance: false,
      backEntrance: false,
    });
    // 2 floors × $12 + 1 staircase × $6 = $30
    expect(subscription.monthlyPrice).toBe(30);
    expect(subscription.floors).toBe(2);
    expect(subscription.staircases).toBe(1);
  });

  it('throws FLOORS_REQUIRED when floors is missing', async () => {
    ServiceType.findById.mockResolvedValue({ _id: new mongoose.Types.ObjectId(), slug: 'entrance-cleaning', name: 'Multi-Family Entrance Cleaning' });
    await expect(create(userId, {
      serviceTypeId: new mongoose.Types.ObjectId().toString(),
      addressId: new mongoose.Types.ObjectId().toString(),
      dayOfWeek: 1,
    })).rejects.toThrow('Number of floors is required');
  });

  it('includes entrance fees when selected', async () => {
    ServiceType.findById.mockResolvedValue({ _id: new mongoose.Types.ObjectId(), slug: 'entrance-cleaning', name: 'Multi-Family Entrance Cleaning' });
    const { subscription } = await create(userId, {
      serviceTypeId: new mongoose.Types.ObjectId().toString(),
      addressId: new mongoose.Types.ObjectId().toString(),
      dayOfWeek: 2,
      floors: 1,
      staircases: 0,
      frontEntrance: true,
      backEntrance: true,
    });
    // 1 floor × $12 + 2 entrances × $12 = $36
    expect(subscription.monthlyPrice).toBe(36);
    expect(subscription.frontEntrance).toBe(true);
    expect(subscription.backEntrance).toBe(true);
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
