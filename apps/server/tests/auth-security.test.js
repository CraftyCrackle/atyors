process.env.JWT_SECRET = 'test-secret';

const bcrypt = require('bcryptjs');

jest.mock('../models/RefreshToken', () => ({
  create: jest.fn().mockResolvedValue({}),
  findOne: jest.fn(),
  updateMany: jest.fn().mockResolvedValue({}),
}));

jest.mock('../services/emailService', () => ({
  send: jest.fn().mockResolvedValue({ messageId: 'test-123' }),
}));

const makeMockUser = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'customer',
  isActive: true,
  passwordHash: null,
  failedLoginAttempts: 0,
  lockUntil: undefined,
  save: jest.fn().mockResolvedValue(true),
  toObject: function () { return { ...this }; },
  ...overrides,
});

jest.mock('../models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

const User = require('../models/User');
const { register, login } = require('../services/authService');

describe('Auth Security', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Password Policy', () => {
    test('rejects password without uppercase', async () => {
      await expect(register({
        email: 'new@test.com', phone: '555', password: 'lowercase1', firstName: 'A', lastName: 'B',
      })).rejects.toThrow('Password must be at least 8 characters');
    });

    test('rejects password without lowercase', async () => {
      await expect(register({
        email: 'new@test.com', phone: '555', password: 'UPPERCASE1', firstName: 'A', lastName: 'B',
      })).rejects.toThrow('Password must be at least 8 characters');
    });

    test('rejects password without number', async () => {
      await expect(register({
        email: 'new@test.com', phone: '555', password: 'NoNumberHere', firstName: 'A', lastName: 'B',
      })).rejects.toThrow('Password must be at least 8 characters');
    });

    test('rejects password shorter than 8 chars', async () => {
      await expect(register({
        email: 'new@test.com', phone: '555', password: 'Ab1', firstName: 'A', lastName: 'B',
      })).rejects.toThrow('Password must be at least 8 characters');
    });

    test('accepts valid password', async () => {
      const mockUser = makeMockUser();
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);

      const result = await register({
        email: 'new@test.com', phone: '555', password: 'ValidPass1', firstName: 'A', lastName: 'B',
      });

      expect(result.pendingVerification).toBe(true);
      expect(result.userId).toBeDefined();
    });
  });

  describe('Account Lockout', () => {
    test('locks account after 5 failed attempts', async () => {
      const hash = await bcrypt.hash('Correct1', 12);
      const user = makeMockUser({ failedLoginAttempts: 4, passwordHash: hash });
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      await expect(login({ email: 'test@example.com', password: 'WrongPass1' }))
        .rejects.toThrow('Invalid email or password');

      expect(user.failedLoginAttempts).toBe(5);
      expect(user.lockUntil).toBeInstanceOf(Date);
      expect(user.lockUntil.getTime()).toBeGreaterThan(Date.now());
    });

    test('rejects login for locked account', async () => {
      const user = makeMockUser({
        failedLoginAttempts: 5,
        lockUntil: new Date(Date.now() + 15 * 60 * 1000),
      });
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      await expect(login({ email: 'test@example.com', password: 'AnyPass1' }))
        .rejects.toThrow('Account locked');
    });

    test('unlocks account after lockout expires (unverified)', async () => {
      const hash = await bcrypt.hash('Correct1', 12);
      const user = makeMockUser({
        failedLoginAttempts: 5,
        lockUntil: new Date(Date.now() - 1000),
        passwordHash: hash,
      });
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      const result = await login({ email: 'test@example.com', password: 'Correct1' });

      expect(result.pendingVerification).toBe(true);
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lockUntil).toBeUndefined();
    });

    test('resets failed attempts on successful login', async () => {
      const hash = await bcrypt.hash('Correct1', 12);
      const user = makeMockUser({ failedLoginAttempts: 3, passwordHash: hash });
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      await login({ email: 'test@example.com', password: 'Correct1' });

      expect(user.failedLoginAttempts).toBe(0);
    });
  });
});
