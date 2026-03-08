const mongoose = require('mongoose');

jest.mock('../models/Booking');
jest.mock('../models/Route', () => ({}));

const Booking = require('../models/Booking');

const { completeWithPhoto, denyJob } = (() => {
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

function mockFindOneChain(result) {
  Booking.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(result) });
}

beforeEach(() => jest.clearAllMocks());

describe('servicerService.completeWithPhoto', () => {
  test('rejects when booking not found', async () => {
    mockFindOneChain(null);
    await expect(completeWithPhoto(bookingId, servicerId, '/photo.jpg', ''))
      .rejects.toMatchObject({ status: 404, message: expect.stringContaining('not found') });
  });

  test('rejects invalid status transition', async () => {
    const fake = makeFakeBooking({ canTransitionTo: jest.fn().mockReturnValue(false), status: 'active' });
    mockFindOneChain(fake);
    await expect(completeWithPhoto(bookingId, servicerId, '/photo.jpg', ''))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_TRANSITION' });
  });

  test('allows completion when payment not yet paid (charge-on-completion model)', async () => {
    const fake = makeFakeBooking({ paymentStatus: 'pending_payment' });
    mockFindOneChain(fake);
    await completeWithPhoto(bookingId, servicerId, '/photo.jpg', '');
    expect(fake.status).toBe('completed');
    expect(fake.save).toHaveBeenCalled();
  });

  test('completes successfully with valid inputs', async () => {
    const fake = makeFakeBooking();
    mockFindOneChain(fake);
    const result = await completeWithPhoto(bookingId, servicerId, '/photo.jpg', 'done');
    expect(fake.status).toBe('completed');
    expect(fake.completionPhotoUrl).toBe('/photo.jpg');
    expect(fake.notes).toBe('done');
    expect(fake.completedAt).toBeInstanceOf(Date);
    expect(fake.statusHistory).toHaveLength(1);
    expect(fake.save).toHaveBeenCalled();
  });

  test('requires placement notes for curb-items jobs', async () => {
    const fake = makeFakeBooking({ serviceTypeId: { slug: 'curb-items', name: 'Curb Items' } });
    mockFindOneChain(fake);
    await expect(completeWithPhoto(bookingId, servicerId, '/photo.jpg', ''))
      .rejects.toMatchObject({ status: 400, code: 'PLACEMENT_NOTES_REQUIRED' });
  });

  test('sets placementConfirmed and placementNotes for curb-items', async () => {
    const fake = makeFakeBooking({ serviceTypeId: { slug: 'curb-items', name: 'Curb Items' } });
    mockFindOneChain(fake);
    await completeWithPhoto(bookingId, servicerId, '/photo.jpg', '', { placementNotes: 'By the mailbox' });
    expect(fake.placementConfirmed).toBe(true);
    expect(fake.placementNotes).toBe('By the mailbox');
    expect(fake.status).toBe('completed');
    expect(fake.save).toHaveBeenCalled();
  });
});

describe('servicerService.denyJob', () => {
  test('rejects when booking not found', async () => {
    mockFindOneChain(null);
    await expect(denyJob(bookingId, servicerId, 'Too heavy'))
      .rejects.toMatchObject({ status: 404, message: expect.stringContaining('not found') });
  });

  test('rejects non-curb-items bookings', async () => {
    const fake = makeFakeBooking({ serviceTypeId: { slug: 'put-out', name: 'Put Out Only' } });
    mockFindOneChain(fake);
    await expect(denyJob(bookingId, servicerId, 'Too heavy'))
      .rejects.toMatchObject({ status: 400, code: 'NOT_CURB_ITEMS' });
  });

  test('rejects invalid status transition', async () => {
    const fake = makeFakeBooking({ serviceTypeId: { slug: 'curb-items' }, status: 'completed', canTransitionTo: jest.fn().mockReturnValue(false) });
    mockFindOneChain(fake);
    await expect(denyJob(bookingId, servicerId, 'Too heavy'))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_TRANSITION' });
  });

  test('denies curb-items job successfully', async () => {
    const fake = makeFakeBooking({ serviceTypeId: { slug: 'curb-items', name: 'Curb Items' }, status: 'active' });
    mockFindOneChain(fake);
    await denyJob(bookingId, servicerId, 'Items are hazardous');
    expect(fake.status).toBe('denied');
    expect(fake.denialReason).toBe('Items are hazardous');
    expect(fake.assignedTo).toBeNull();
    expect(fake.statusHistory).toHaveLength(1);
    expect(fake.save).toHaveBeenCalled();
  });
});
