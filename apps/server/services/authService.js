const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const emailService = require('./emailService');

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_DAYS = 7;

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

async function createRefreshToken(user) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId: user._id,
    token,
    expiresAt,
  });

  return token;
}

async function generateTokens(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = await createRefreshToken(user);
  return { accessToken, refreshToken };
}

async function register({ email, phone, password, firstName, lastName }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    err.code = 'EMAIL_EXISTS';
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    email: email.toLowerCase(),
    phone,
    firstName,
    lastName,
    passwordHash,
  });

  const tokens = await generateTokens(user);
  user.lastLoginAt = new Date();
  await user.save();

  return { user: sanitizeUser(user), ...tokens };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const tokens = await generateTokens(user);
  user.lastLoginAt = new Date();
  await user.save();

  return { user: sanitizeUser(user), ...tokens };
}

async function refreshAccessToken(oldToken) {
  const stored = await RefreshToken.findOne({ token: oldToken, revokedAt: null });
  if (!stored) {
    const err = new Error('Invalid or expired refresh token');
    err.status = 401;
    err.code = 'INVALID_REFRESH_TOKEN';
    throw err;
  }

  if (stored.expiresAt < new Date()) {
    stored.revokedAt = new Date();
    await stored.save();
    const err = new Error('Refresh token expired');
    err.status = 401;
    err.code = 'TOKEN_EXPIRED';
    throw err;
  }

  const user = await User.findById(stored.userId);
  if (!user || !user.isActive) {
    stored.revokedAt = new Date();
    await stored.save();
    const err = new Error('User not found or inactive');
    err.status = 401;
    throw err;
  }

  const newRefreshToken = await createRefreshToken(user);

  stored.revokedAt = new Date();
  stored.replacedByToken = newRefreshToken;
  await stored.save();

  const accessToken = generateAccessToken(user);
  return { user: sanitizeUser(user), accessToken, refreshToken: newRefreshToken };
}

async function revokeUserTokens(userId) {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date() }
  );
}

function sanitizeUser(user) {
  const obj = user.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
}

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

async function forgotPassword(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.passwordResetToken = hashed;
  user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
  await user.save();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atyors.com';
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

  await emailService.send({
    to: user.email,
    subject: 'Reset your atyors password',
    text: `Hi ${user.firstName},\n\nYou requested a password reset. Use this link to set a new password (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\natyors`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #111827; margin-bottom: 8px;">Reset your password</h2>
        <p style="color: #6b7280; font-size: 15px;">Hi ${user.firstName},</p>
        <p style="color: #6b7280; font-size: 15px;">You requested a password reset for your atyors account. Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: #1b70f5; color: #fff; font-weight: 600; font-size: 15px; text-decoration: none; border-radius: 12px;">Reset Password</a>
        <p style="color: #9ca3af; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">atyors &middot; At Your Service</p>
      </div>
    `,
  });
}

async function resetPassword(token, newPassword) {
  const hashed = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires +passwordHash');

  if (!user) {
    const err = new Error('Reset link is invalid or has expired. Please request a new one.');
    err.status = 400;
    err.code = 'INVALID_RESET_TOKEN';
    throw err;
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await revokeUserTokens(user._id);

  return { message: 'Password has been reset successfully.' };
}

module.exports = { register, login, refreshAccessToken, generateTokens, revokeUserTokens, forgotPassword, resetPassword };
