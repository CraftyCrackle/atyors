const mongoose = require('mongoose');

describe('Review Model', () => {
  let Review;

  beforeAll(() => {
    Review = require('../models/Review');
  });

  test('schema has required fields', () => {
    const fields = Review.schema.paths;
    expect(fields.bookingId).toBeDefined();
    expect(fields.reviewerId).toBeDefined();
    expect(fields.revieweeId).toBeDefined();
    expect(fields.rating).toBeDefined();
    expect(fields.comment).toBeDefined();
    expect(fields.role).toBeDefined();
  });

  test('rating has min 1 and max 5', () => {
    const ratingPath = Review.schema.paths.rating;
    const minValidator = ratingPath.validators.find((v) => v.type === 'min');
    const maxValidator = ratingPath.validators.find((v) => v.type === 'max');
    expect(minValidator).toBeDefined();
    expect(minValidator.min).toBe(1);
    expect(maxValidator).toBeDefined();
    expect(maxValidator.max).toBe(5);
  });

  test('comment has maxlength of 500', () => {
    const commentPath = Review.schema.paths.comment;
    const maxValidator = commentPath.validators.find((v) => v.type === 'maxlength');
    expect(maxValidator).toBeDefined();
    expect(maxValidator.maxlength).toBe(500);
  });

  test('role enum is customer or servicer', () => {
    const rolePath = Review.schema.paths.role;
    expect(rolePath.enumValues).toEqual(['customer', 'servicer']);
  });

  test('compound unique index on bookingId + reviewerId', () => {
    const indexes = Review.schema.indexes();
    const compoundIndex = indexes.find(
      (idx) => idx[0].bookingId === 1 && idx[0].reviewerId === 1
    );
    expect(compoundIndex).toBeDefined();
    expect(compoundIndex[1].unique).toBe(true);
  });
});

describe('Review Service', () => {
  test('exports create, getByBooking, getByUser', () => {
    const svc = require('../services/reviewService');
    expect(typeof svc.create).toBe('function');
    expect(typeof svc.getByBooking).toBe('function');
    expect(typeof svc.getByUser).toBe('function');
  });
});
