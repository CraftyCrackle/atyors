process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const { generateTokens } = require('../services/authService');

describe('Auth Service', () => {
  const mockUser = { _id: '507f1f77bcf86cd799439011', email: 'test@test.com', role: 'customer' };

  test('generateTokens returns access and refresh tokens', () => {
    const tokens = generateTokens(mockUser);
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();

    const decoded = jwt.verify(tokens.accessToken, 'test-secret');
    expect(decoded.userId).toBe(mockUser._id);
    expect(decoded.email).toBe(mockUser.email);
    expect(decoded.role).toBe('customer');
  });

  test('refresh token has type field', () => {
    const tokens = generateTokens(mockUser);
    const decoded = jwt.verify(tokens.refreshToken, 'test-secret');
    expect(decoded.type).toBe('refresh');
  });
});
