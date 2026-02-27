const config = require('../config');
const User = require('../models/User');

function getStripe() {
  return require('stripe')(config.stripe.secretKey);
}

async function ensureCustomer(user) {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    phone: user.phone || undefined,
    metadata: { userId: user._id.toString() },
  });

  await User.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id });
  user.stripeCustomerId = customer.id;
  return customer.id;
}

async function createSetupIntent(user) {
  const customerId = await ensureCustomer(user);
  const stripe = getStripe();
  const intent = await stripe.setupIntents.create({
    customer: customerId,
    usage: 'off_session',
  });
  return intent;
}

async function listPaymentMethods(user) {
  const customerId = await ensureCustomer(user);
  const stripe = getStripe();
  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  const customer = await stripe.customers.retrieve(customerId);
  const defaultId = customer.invoice_settings?.default_payment_method || null;

  return methods.data.map((m) => ({
    id: m.id,
    brand: m.card.brand,
    last4: m.card.last4,
    expMonth: m.card.exp_month,
    expYear: m.card.exp_year,
    isDefault: m.id === defaultId,
  }));
}

async function removePaymentMethod(user, methodId) {
  const customerId = await ensureCustomer(user);
  const stripe = getStripe();
  const pm = await stripe.paymentMethods.retrieve(methodId);
  if (pm.customer !== customerId) {
    const err = new Error('Payment method does not belong to you');
    err.status = 403;
    throw err;
  }
  await stripe.paymentMethods.detach(methodId);
}

async function setDefaultPaymentMethod(user, methodId) {
  const customerId = await ensureCustomer(user);
  const stripe = getStripe();
  const pm = await stripe.paymentMethods.retrieve(methodId);
  if (pm.customer !== customerId) {
    const err = new Error('Payment method does not belong to you');
    err.status = 403;
    throw err;
  }
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: methodId },
  });
}

async function createPaymentIntent(user, amount, bookingId) {
  const customerId = await ensureCustomer(user);
  const stripe = getStripe();

  const methods = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
  const customer = await stripe.customers.retrieve(customerId);
  const defaultPm = customer.invoice_settings?.default_payment_method;

  const params = {
    amount: Math.round(amount * 100),
    currency: 'usd',
    customer: customerId,
    metadata: { bookingId, userId: user._id.toString() },
  };

  if (defaultPm) {
    params.payment_method = defaultPm;
  }

  const intent = await stripe.paymentIntents.create(params);
  return intent;
}

async function getOrCreatePrice(amountInDollars) {
  const stripe = getStripe();
  const unitAmount = Math.round(amountInDollars * 100);
  const lookupKey = `atyors_monthly_${unitAmount}`;

  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (existing.data.length > 0) return existing.data[0];

  let product;
  const products = await stripe.products.list({ limit: 1 });
  if (products.data.length > 0 && products.data[0].metadata?.atyors === 'true') {
    product = products.data[0];
  } else {
    product = await stripe.products.create({
      name: 'atyors Monthly Barrel Service',
      metadata: { atyors: 'true' },
    });
  }

  return stripe.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency: 'usd',
    recurring: { interval: 'month' },
    lookup_key: lookupKey,
  });
}

async function createStripeSubscription(user, priceId, metadata = {}) {
  const customerId = await ensureCustomer(user);
  const stripe = getStripe();

  const customer = await stripe.customers.retrieve(customerId);
  const defaultPm = customer.invoice_settings?.default_payment_method;

  const params = {
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata,
  };

  if (defaultPm) {
    params.default_payment_method = defaultPm;
  }

  return stripe.subscriptions.create(params);
}

async function refundPaymentIntent(paymentIntentId, { deductAmountDollars = 0 } = {}) {
  if (!paymentIntentId) return null;
  const stripe = getStripe();
  try {
    const params = { payment_intent: paymentIntentId };
    if (deductAmountDollars > 0) {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const refundCents = intent.amount_received - Math.round(deductAmountDollars * 100);
      if (refundCents <= 0) return null;
      params.amount = refundCents;
    }
    return await stripe.refunds.create(params);
  } catch (err) {
    console.error('Stripe refund failed:', err.message);
    throw err;
  }
}

module.exports = {
  ensureCustomer,
  createSetupIntent,
  listPaymentMethods,
  removePaymentMethod,
  setDefaultPaymentMethod,
  createPaymentIntent,
  getOrCreatePrice,
  createStripeSubscription,
  refundPaymentIntent,
};
