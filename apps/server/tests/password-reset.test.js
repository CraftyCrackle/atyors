process.env.JWT_SECRET = 'test-secret';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

jest.mock('../models/RefreshToken', () => ({
  create: jest.fn().mockResolvedValue({}),
  updateMany: jest.fn().mockResolvedValue({}),
}));

jest.mock('../services/emailService', () => ({
  send: jest.fn().mockResolvedValue({ messageId: 'test-123' }),
}));

const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  email: 'teresa@example.com',
  firstName: 'Teresa',
  passwordHash: null,
  passwordResetToken: null,
  passwordResetExpires: null,
  isActive: true,
  save: jest.fn().mockResolvedValue(true),
  toObject: function () { return { ...this }; },
};

jest.mock('../models/User', () => ({
  findOne: jest.fn(),
}));

const User = require('../models/User');
const emailService = require('../services/emailService');
const { forgotPassword, resetPassword } = require('../services/authService');

describe('Password Reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('forgotPassword', () => {
    test('sends reset email for existing user', async () => {
      User.findOne.mockResolvedValue({ ...mockUser, save: jest.fn() });

      await forgotPassword('teresa@example.com');

      expect(User.findOne).toHaveBeenCalledWith({ email: 'teresa@example.com' });
      expect(emailService.send).toHaveBeenCalledTimes(1);
      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'teresa@example.com',
          subject: 'Reset your atyors password',
        })
      );
    });

    test('does not throw for non-existent email', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(forgotPassword('nobody@example.com')).resolves.toBeUndefined();
      expect(emailService.send).not.toHaveBeenCalled();
    });

    test('stores hashed token with expiry on user', async () => {
      const saveFn = jest.fn();
      const user = { ...mockUser, save: saveFn };
      User.findOne.mockResolvedValue(user);

      await forgotPassword('teresa@example.com');

      expect(saveFn).toHaveBeenCalled();
      expect(user.passwordResetToken).toBeDefined();
      expect(user.passwordResetToken.length).toBe(64);
      expect(user.passwordResetExpires).toBeInstanceOf(Date);
      expect(user.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('resetPassword', () => {
    test('resets password with valid token', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
      const saveFn = jest.fn();

      const user = {
        ...mockUser,
        passwordResetToken: hashed,
        passwordResetExpires: new Date(Date.now() + 3600000),
        passwordHash: 'old-hash',
        save: saveFn,
        toObject: function () { return { ...this }; },
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      const result = await resetPassword(rawToken, 'newpassword123');

      expect(result.message).toContain('successfully');
      expect(saveFn).toHaveBeenCalled();
      expect(user.passwordResetToken).toBeUndefined();
      expect(user.passwordResetExpires).toBeUndefined();
      const passwordUpdated = await bcrypt.compare('newpassword123', user.passwordHash);
      expect(passwordUpdated).toBe(true);
    });

    test('throws for invalid token', async () => {
      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(resetPassword('bad-token', 'newpassword123'))
        .rejects
        .toThrow('Reset link is invalid or has expired');
    });
  });
});
