process.env.JWT_SECRET = 'test-secret';

const crypto = require('crypto');

jest.mock('../models/User');
jest.mock('../models/RefreshToken', () => ({
  create: jest.fn().mockResolvedValue({}),
}));
jest.mock('../services/emailService', () => ({
  send: jest.fn().mockResolvedValue({ messageId: 'test-msg' }),
}));

const User = require('../models/User');
const emailService = require('../services/emailService');
const { sendCode, verifyCode, hashCode, maskEmail } = require('../services/verificationService');

function buildMockUser(overrides = {}) {
  const base = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    firstName: 'Test',
    isVerified: false,
    verificationCode: null,
    verificationCodeExpires: null,
    verificationAttempts: 0,
    verificationAttemptsResetAt: null,
    save: jest.fn().mockResolvedValue(true),
    toObject: jest.fn().mockReturnThis(),
    ...overrides,
  };
  return base;
}

describe('verificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendCode', () => {
    test('sends email verification code', async () => {
      const user = buildMockUser();
      User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      const result = await sendCode(user._id);

      expect(result.sent).toBe(true);
      expect(result.method).toBe('email');
      expect(result.destination).toContain('@');
      expect(user.verificationCode).toBeDefined();
      expect(user.verificationCodeExpires).toBeInstanceOf(Date);
      expect(user.save).toHaveBeenCalled();
      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: expect.stringContaining('verification code'),
        }),
      );
    });

    test('throws 404 if user not found', async () => {
      User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      await expect(sendCode('bad-id')).rejects.toThrow('User not found');
    });

    test('throws 400 if already verified', async () => {
      const user = buildMockUser({ isVerified: true });
      User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      await expect(sendCode(user._id)).rejects.toThrow('already verified');
    });

    test('rate limits after max attempts', async () => {
      const user = buildMockUser({
        verificationAttempts: 5,
        verificationAttemptsResetAt: new Date(Date.now() + 60000),
      });
      User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      await expect(sendCode(user._id)).rejects.toThrow('Too many verification attempts');
    });

    test('resets attempts counter after window expires', async () => {
      const user = buildMockUser({
        verificationAttempts: 5,
        verificationAttemptsResetAt: new Date(Date.now() - 1000),
      });
      User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      const result = await sendCode(user._id);
      expect(result.sent).toBe(true);
      expect(user.verificationAttempts).toBe(1);
    });
  });

  describe('verifyCode', () => {
    test('verifies correct code and marks user verified', async () => {
      const code = '123456';
      const user = buildMockUser({
        verificationCode: hashCode(code),
        verificationCodeExpires: new Date(Date.now() + 300000),
      });
      User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      const result = await verifyCode(user._id, code);
      expect(result.isVerified).toBe(true);
      expect(result.verificationCode).toBeUndefined();
      expect(user.save).toHaveBeenCalled();
    });

    test('throws on invalid code', async () => {
      const user = buildMockUser({
        verificationCode: hashCode('123456'),
        verificationCodeExpires: new Date(Date.now() + 300000),
      });
      User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      await expect(verifyCode(user._id, '000000')).rejects.toThrow('Invalid verification code');
    });

    test('throws on expired code', async () => {
      const user = buildMockUser({
        verificationCode: hashCode('123456'),
        verificationCodeExpires: new Date(Date.now() - 1000),
      });
      User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      await expect(verifyCode(user._id, '123456')).rejects.toThrow('expired');
    });

    test('throws when no code has been sent', async () => {
      const user = buildMockUser({ verificationCode: null, verificationCodeExpires: null });
      User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      await expect(verifyCode(user._id, '123456')).rejects.toThrow('No verification code');
    });

    test('returns user if already verified', async () => {
      const user = buildMockUser({ isVerified: true });
      User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      const result = await verifyCode(user._id, '999999');
      expect(result.isVerified).toBe(true);
    });
  });

  describe('maskEmail', () => {
    test('masks email address', () => {
      expect(maskEmail('borgella@gmail.com')).toBe('b***a@gmail.com');
    });

    test('handles single-char local part', () => {
      expect(maskEmail('a@test.com')).toBe('a***@test.com');
    });

    test('handles missing @', () => {
      expect(maskEmail('noemail')).toBe('****');
    });
  });
});

describe('authService — verification flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('register returns pendingVerification instead of tokens', async () => {
    jest.doMock('../models/User', () => {
      const created = {
        _id: 'new-user-id',
        email: 'new@example.com',
        phone: '+16175550000',
        role: 'customer',
        isVerified: false,
        save: jest.fn().mockResolvedValue(true),
        toObject: function () { return this; },
      };
      return {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      };
    });
    jest.doMock('../models/RefreshToken', () => ({
      create: jest.fn().mockResolvedValue({}),
    }));

    const authService = require('../services/authService');
    const result = await authService.register({
      email: 'new@example.com',
      phone: '+16175550000',
      password: 'TestPass1',
      firstName: 'New',
      lastName: 'User',
    });

    expect(result.pendingVerification).toBe(true);
    expect(result.userId).toBe('new-user-id');
    expect(result.email).toBe('new@example.com');
    expect(result.accessToken).toBeUndefined();
  });

  test('login returns pendingVerification for unverified user', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('TestPass1', 4);

    jest.doMock('../models/User', () => {
      const user = {
        _id: 'unverified-id',
        email: 'unverified@example.com',
        phone: '+16175551111',
        role: 'customer',
        isVerified: false,
        passwordHash: hash,
        failedLoginAttempts: 0,
        lockUntil: null,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
        toObject: function () { return this; },
      };
      return {
        findOne: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) }),
      };
    });
    jest.doMock('../models/RefreshToken', () => ({
      create: jest.fn().mockResolvedValue({}),
    }));

    const authService = require('../services/authService');
    const result = await authService.login({ email: 'unverified@example.com', password: 'TestPass1' });

    expect(result.pendingVerification).toBe(true);
    expect(result.userId).toBe('unverified-id');
    expect(result.accessToken).toBeUndefined();
  });

  test('login returns tokens for verified user', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('TestPass1', 4);

    jest.doMock('../models/User', () => {
      const user = {
        _id: 'verified-id',
        email: 'verified@example.com',
        role: 'customer',
        isVerified: true,
        passwordHash: hash,
        failedLoginAttempts: 0,
        lockUntil: null,
        isActive: true,
        lastLoginAt: null,
        save: jest.fn().mockResolvedValue(true),
        toObject: function () { return this; },
      };
      return {
        findOne: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) }),
      };
    });
    jest.doMock('../models/RefreshToken', () => ({
      create: jest.fn().mockResolvedValue({}),
    }));

    const authService = require('../services/authService');
    const result = await authService.login({ email: 'verified@example.com', password: 'TestPass1' });

    expect(result.pendingVerification).toBeUndefined();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });
});
