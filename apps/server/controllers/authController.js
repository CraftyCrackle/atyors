const authService = require('../services/authService');
const verificationService = require('../services/verificationService');

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_TOKEN', message: 'Refresh token required' } });
    }
    const result = await authService.refreshAccessToken(refreshToken);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

const PROMO_CREDIT_EXPIRY = new Date('2026-04-30T23:59:59.000-04:00');

async function me(req, res) {
  let user = req.user;
  if (user.role === 'customer' && (!user.promoCredit || user.promoCredit.balance == null)) {
    const User = require('../models/User');
    user = await User.findByIdAndUpdate(
      user._id,
      { $set: { promoCredit: { balance: 15, expiresAt: PROMO_CREDIT_EXPIRY } } },
      { new: true }
    );
  }
  res.json({ success: true, data: { user } });
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_EMAIL', message: 'Email is required' } });
    }
    await authService.forgotPassword(email);
    res.json({ success: true, data: { message: 'If an account with that email exists, a reset link has been sent.' } });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Token and password are required' } });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' } });
    }
    const result = await authService.resetPassword(token, password);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function sendVerification(req, res, next) {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'userId is required' } });
    }
    const result = await verificationService.sendCode(userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function verify(req, res, next) {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'userId and code are required' } });
    }
    const user = await verificationService.verifyCode(userId, code);
    const tokens = await authService.generateTokens(user);
    user.lastLoginAt = new Date();
    await user.save();
    res.json({ success: true, data: { user, ...tokens } });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const crypto = require('crypto');
      const RefreshToken = require('../models/RefreshToken');
      const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await RefreshToken.updateMany(
        { token: hashed, revokedAt: null },
        { revokedAt: new Date() }
      );
    }
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, me, forgotPassword, resetPassword, sendVerification, verify, logout };
