const mongoose = require('mongoose');

jest.mock('../models/Booking');
jest.mock('../models/Route', () => ({}));

const Booking = require('../models/Booking');

const { completeWithPhoto } = (() => {
  let mod;
  jest.isolateModules(() => { mod = require('../services/servicerService'); });
  return mod;
})();

const servicerId = new mongoose.Types.ObjectId();
const bookingId = new mongoose.Types.ObjectId();

function makeFakeBooking(overrides = {}) {
  return {
    _id: bookingId,
    assignedTo: servicerId,
    status: 'arrived',
    paymentStatus: 'paid',
    statusHistory: [],
    canTransitionTo: jest.fn().mockReturnValue(true),
    save: jest.fn().mockResolvedValue(true),
    populate: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('servicerService.completeWithPhoto', () => {
  test('rejects when booking not found', async () => {
    Booking.findOne.mockResolvedValue(null);
    await expect(completeWithPhoto(bookingId, servicerId, '/photo.jpg', ''))
      .rejects.toMatchObject({ status: 404, message: expect.stringContaining('not found') });
  });

  test('rejects invalid status transition', async () => {
    const fake = makeFakeBooking({ canTransitionTo: jest.fn().mockReturnValue(false), status: 'active' });
    Booking.findOne.mockResolvedValue(fake);
    await expect(completeWithPhoto(bookingId, servicerId, '/photo.jpg', ''))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_TRANSITION' });
  });

  test('rejects when payment not paid', async () => {
    const fake = makeFakeBooking({ paymentStatus: 'pending_payment' });
    Booking.findOne.mockResolvedValue(fake);
    await expect(completeWithPhoto(bookingId, servicerId, '/photo.jpg', ''))
      .rejects.toMatchObject({ status: 400, code: 'PAYMENT_REQUIRED' });
  });

  test('completes successfully with valid inputs', async () => {
    const fake = makeFakeBooking();
    Booking.findOne.mockResolvedValue(fake);
    const result = await completeWithPhoto(bookingId, servicerId, '/photo.jpg', 'done');
    expect(fake.status).toBe('completed');
    expect(fake.completionPhotoUrl).toBe('/photo.jpg');
    expect(fake.notes).toBe('done');
    expect(fake.completedAt).toBeInstanceOf(Date);
    expect(fake.statusHistory).toHaveLength(1);
    expect(fake.save).toHaveBeenCalled();
  });
});
