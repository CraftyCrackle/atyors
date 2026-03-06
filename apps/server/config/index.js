const isProd = process.env.NODE_ENV === 'production';

function requireInProd(name) {
  const val = process.env[name];
  if (isProd && !val) {
    throw new Error(`${name} must be set in production`);
  }
  return val || '';
}

module.exports = {
  port: process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/atyors',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || (isProd ? (() => { throw new Error('JWT_SECRET must be set in production'); })() : 'dev-secret-local-only'),
  cors: {
    origins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  },
  cognito: {
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    clientId: process.env.COGNITO_CLIENT_ID,
    region: process.env.AWS_REGION || 'us-east-1',
  },
  stripe: {
    secretKey: isProd ? requireInProd('STRIPE_SECRET_KEY') : process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID,
    skip: process.env.SKIP_STRIPE === 'true',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    skip: process.env.SKIP_TWILIO === 'true',
  },
  google: {
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  },
  email: {
    from: process.env.FROM_EMAIL || 'noreply@atyors.com',
  },
  vapid: {
    publicKey: isProd ? requireInProd('VAPID_PUBLIC_KEY') : process.env.VAPID_PUBLIC_KEY,
    privateKey: isProd ? requireInProd('VAPID_PRIVATE_KEY') : process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@atyors.com',
  },
};
