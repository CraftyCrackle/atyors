const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

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

module.exports = { register, login, refreshAccessToken, generateTokens, revokeUserTokens };
