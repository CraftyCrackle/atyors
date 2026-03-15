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
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function validatePasswordStrength(password) {
  if (!PASSWORD_REGEX.test(password)) {
    const err = new Error('Password must be at least 8 characters with 1 uppercase letter, 1 lowercase letter, and 1 number');
    err.status = 400;
    err.code = 'WEAK_PASSWORD';
    throw err;
  }
}

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    config.jwtSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function createRefreshToken(user) {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const hashed = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId: user._id,
    token: hashed,
    expiresAt,
  });

  return rawToken;
}

async function generateTokens(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = await createRefreshToken(user);
  return { accessToken, refreshToken };
}

async function register({ email, phone, password, firstName, lastName }) {
  validatePasswordStrength(password);

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

  return {
    pendingVerification: true,
    userId: user._id,
    email: user.email,
    phone: user.phone || null,
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash +failedLoginAttempts +lockUntil');
  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
    const err = new Error(`Account locked. Try again in ${remaining} minute${remaining === 1 ? '' : 's'}`);
    err.status = 423;
    err.code = 'ACCOUNT_LOCKED';
    throw err;
  }

  if (user.lockUntil && user.lockUntil <= new Date()) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await user.save();
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  if (!user.isVerified) {
    return {
      pendingVerification: true,
      userId: user._id,
      email: user.email,
      phone: user.phone || null,
    };
  }

  const tokens = await generateTokens(user);
  user.lastLoginAt = new Date();
  await user.save();

  return { user: sanitizeUser(user), ...tokens };
}

async function refreshAccessToken(oldToken) {
  const hashedOld = hashToken(oldToken);
  const stored = await RefreshToken.findOne({ token: hashedOld });

  if (!stored) {
    const err = new Error('Invalid or expired refresh token');
    err.status = 401;
    err.code = 'INVALID_REFRESH_TOKEN';
    throw err;
  }

  if (stored.revokedAt) {
    await revokeTokenFamily(stored);
    const err = new Error('Token reuse detected — all sessions revoked');
    err.status = 401;
    err.code = 'TOKEN_REUSE';
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
  const hashedNew = hashToken(newRefreshToken);

  stored.revokedAt = new Date();
  stored.replacedByToken = hashedNew;
  await stored.save();

  const accessToken = generateAccessToken(user);
  return { user: sanitizeUser(user), accessToken, refreshToken: newRefreshToken };
}

async function revokeTokenFamily(startToken) {
  const now = new Date();
  let current = startToken;
  const visited = new Set([current.token]);
  while (current.replacedByToken) {
    const next = await RefreshToken.findOne({ token: current.replacedByToken });
    if (!next || visited.has(next.token)) break;
    visited.add(next.token);
    if (!next.revokedAt) {
      next.revokedAt = now;
      await next.save();
    }
    current = next;
  }
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
  delete obj.failedLoginAttempts;
  delete obj.lockUntil;
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
    subject: 'Password reset',
    text: `Password reset\n\nSomeone requested that the password be reset for your account.\n\nTo reset your password, visit the following address:\n${resetUrl}\n\nYour email: ${user.email}\n\nIf this was a mistake, just ignore this email and nothing will happen.\n\natyors — At Your Service`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

<tr><td align="center" style="padding-bottom:24px;">
  <img src="${baseUrl}/icons/favicon-48x48.png" alt="atyors" width="48" height="48" style="display:block;" />
</td></tr>

<tr><td align="center" style="padding-bottom:32px;">
  <h1 style="margin:0;font-size:28px;font-weight:700;color:#111827;">Password reset</h1>
</td></tr>

<tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;padding:32px 28px;">
<tr><td>
  <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#111827;text-align:center;">
    Someone requested that the password be reset for the following account:
  </p>
  <p style="margin:16px 0 0;font-size:15px;color:#6b7280;text-align:center;">
    To reset your password, click the button below:
  </p>
</td></tr>
<tr><td align="center" style="padding:24px 0;">
  <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:#4472c4;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;border-radius:8px;">
    Click here to reset your password
  </a>
</td></tr>
<tr><td>
  <p style="margin:0 0 16px;font-size:14px;color:#6b7280;text-align:center;">
    Your email: <a href="mailto:${user.email}" style="color:#4472c4;text-decoration:none;">${user.email}</a>
  </p>
  <p style="margin:0;font-size:14px;color:#6b7280;text-align:center;">
    If this was a mistake, just ignore this email and nothing will happen.
  </p>
</td></tr>
</table>
</td></tr>

<tr><td align="center" style="padding-top:32px;">
  <p style="margin:0;font-size:12px;color:#9ca3af;">
    &copy; ${new Date().getFullYear()} <strong>atyors</strong>. At Your Service.
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>
    `,
  });
}

async function resetPassword(token, newPassword) {
  validatePasswordStrength(newPassword);

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
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  await revokeUserTokens(user._id);

  return { message: 'Password has been reset successfully.' };
}

module.exports = { register, login, refreshAccessToken, generateTokens, revokeUserTokens, forgotPassword, resetPassword };
