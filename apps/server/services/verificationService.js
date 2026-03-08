const crypto = require('crypto');
const User = require('../models/User');
const emailService = require('./emailService');

const CODE_EXPIRY_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function generateCode() {
  return String(crypto.randomInt(100000, 999999));
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function sendCode(userId) {
  const user = await User.findById(userId).select(
    '+verificationCode +verificationCodeExpires +verificationAttempts +verificationAttemptsResetAt',
  );
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  if (user.isVerified) {
    const err = new Error('Account is already verified');
    err.status = 400;
    err.code = 'ALREADY_VERIFIED';
    throw err;
  }

  const now = new Date();
  if (user.verificationAttemptsResetAt && now > user.verificationAttemptsResetAt) {
    user.verificationAttempts = 0;
  }
  if (user.verificationAttempts >= MAX_ATTEMPTS) {
    const err = new Error('Too many verification attempts. Please wait 15 minutes.');
    err.status = 429;
    err.code = 'RATE_LIMITED';
    throw err;
  }

  const code = generateCode();
  user.verificationCode = hashCode(code);
  user.verificationCodeExpires = new Date(Date.now() + CODE_EXPIRY_MS);
  user.verificationAttempts = (user.verificationAttempts || 0) + 1;
  if (!user.verificationAttemptsResetAt || now > user.verificationAttemptsResetAt) {
    user.verificationAttemptsResetAt = new Date(Date.now() + ATTEMPT_WINDOW_MS);
  }
  await user.save();

  await sendEmail(user.email, code, user.firstName);

  return { sent: true, method: 'email', destination: maskEmail(user.email) };
}

async function verifyCode(userId, code) {
  const user = await User.findById(userId).select('+verificationCode +verificationCodeExpires');
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  if (user.isVerified) {
    return user;
  }
  if (!user.verificationCode || !user.verificationCodeExpires) {
    const err = new Error('No verification code has been sent. Please request a new one.');
    err.status = 400;
    err.code = 'NO_CODE';
    throw err;
  }
  if (new Date() > user.verificationCodeExpires) {
    const err = new Error('Verification code has expired. Please request a new one.');
    err.status = 400;
    err.code = 'CODE_EXPIRED';
    throw err;
  }
  if (hashCode(code) !== user.verificationCode) {
    const err = new Error('Invalid verification code');
    err.status = 400;
    err.code = 'INVALID_CODE';
    throw err;
  }

  user.isVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  user.verificationAttempts = 0;
  user.verificationAttemptsResetAt = undefined;
  await user.save();
  return user;
}

async function sendEmail(to, code, firstName) {
  const name = firstName || 'there';
  await emailService.send({
    to,
    subject: `${code} is your atyors verification code`,
    text: `Hi ${name}, your verification code is: ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px">
        <h2 style="margin:0 0 8px;font-size:22px;color:#111">Verify your account</h2>
        <p style="margin:0 0 24px;color:#666;font-size:15px">Hi ${name}, enter this code to finish setting up your atyors account:</p>
        <div style="background:#f4f4f5;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
          <span style="font-size:32px;font-weight:700;letter-spacing:6px;color:#111">${code}</span>
        </div>
        <p style="margin:0;color:#999;font-size:13px">This code expires in 10 minutes. If you didn't create an account, you can ignore this email.</p>
      </div>
    `,
  });
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '****';
  const masked = local[0] + '***' + (local.length > 1 ? local[local.length - 1] : '');
  return `${masked}@${domain}`;
}

module.exports = { sendCode, verifyCode, generateCode, hashCode, maskEmail };
