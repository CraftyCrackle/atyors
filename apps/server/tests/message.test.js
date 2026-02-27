const mongoose = require('mongoose');

describe('Message Model', () => {
  let Message;

  beforeAll(() => {
    Message = require('../models/Message');
  });

  test('schema has required fields', () => {
    const fields = Message.schema.paths;
    expect(fields.bookingId).toBeDefined();
    expect(fields.senderId).toBeDefined();
    expect(fields.recipientId).toBeDefined();
    expect(fields.body).toBeDefined();
    expect(fields.readAt).toBeDefined();
    expect(fields.createdAt).toBeDefined();
  });

  test('body has maxlength of 1000', () => {
    const bodyPath = Message.schema.paths.body;
    const maxValidator = bodyPath.validators.find((v) => v.type === 'maxlength');
    expect(maxValidator).toBeDefined();
    expect(maxValidator.maxlength).toBe(1000);
  });

  test('readAt defaults to null', () => {
    const readAtPath = Message.schema.paths.readAt;
    expect(readAtPath.defaultValue).toBeNull();
  });

  test('indexes are defined for bookingId+createdAt and recipientId+readAt', () => {
    const indexes = Message.schema.indexes();
    const bookingIndex = indexes.find((idx) => idx[0].bookingId === 1 && idx[0].createdAt === 1);
    const recipientIndex = indexes.find((idx) => idx[0].recipientId === 1 && idx[0].readAt === 1);
    expect(bookingIndex).toBeDefined();
    expect(recipientIndex).toBeDefined();
  });
});

describe('Message Service', () => {
  test('exports send, listByBooking, getUnreadCount', () => {
    const svc = require('../services/messageService');
    expect(typeof svc.send).toBe('function');
    expect(typeof svc.listByBooking).toBe('function');
    expect(typeof svc.getUnreadCount).toBe('function');
  });
});
