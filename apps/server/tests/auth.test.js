process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');

jest.mock('../models/RefreshToken', () => ({
  create: jest.fn().mockResolvedValue({}),
}));

const { generateTokens } = require('../services/authService');

describe('Auth Service', () => {
  const mockUser = { _id: '507f1f77bcf86cd799439011', email: 'test@test.com', role: 'customer' };

  test('generateTokens returns access and refresh tokens', async () => {
    const tokens = await generateTokens(mockUser);
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(typeof tokens.refreshToken).toBe('string');
    expect(tokens.refreshToken.length).toBe(80);

    const decoded = jwt.verify(tokens.accessToken, 'test-secret');
    expect(decoded.userId).toBe(mockUser._id);
    expect(decoded.email).toBe(mockUser.email);
    expect(decoded.role).toBe('customer');
  });

  test('refresh token is an opaque hex string (not a JWT)', async () => {
    const tokens = await generateTokens(mockUser);
    expect(() => jwt.verify(tokens.refreshToken, 'test-secret')).toThrow();
    expect(/^[a-f0-9]+$/.test(tokens.refreshToken)).toBe(true);
  });
});
