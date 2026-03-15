const crypto = require('crypto');
const config = require('../config');
const User = require('../models/User');

function getStripe() {
  return require('stripe')(config.stripe.secretKey);
}

async function ensureCustomer(user) {
  const stripe = getStripe();

  if (user.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!existing.deleted) return user.stripeCustomerId;
    } catch (err) {
      if (err.code !== 'resource_missing') throw err;
    }
    await User.findByIdAndUpdate(user._id, { $unset: { stripeCustomerId: 1 } });
  }

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
    payment_method_types: ['card'],
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

  const idempotencyKey = `pi_${bookingId}_${customerId}_${Date.now()}`;
  const intent = await stripe.paymentIntents.create(params, { idempotencyKey });
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
  let defaultPm = customer.invoice_settings?.default_payment_method;

  if (!defaultPm) {
    const methods = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
    if (methods.data.length > 0) {
      defaultPm = methods.data[0].id;
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: defaultPm },
      });
    } else {
      const err = new Error('A payment method is required to subscribe. Please add a card first.');
      err.status = 400;
      err.code = 'NO_PAYMENT_METHOD';
      throw err;
    }
  }

  const params = {
    customer: customerId,
    items: [{ price: priceId }],
    default_payment_method: defaultPm,
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata,
  };

  return stripe.subscriptions.create(params);
}

async function hasDefaultPaymentMethod(user) {
  const customerId = await ensureCustomer(user);
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.invoice_settings?.default_payment_method) return true;

  const methods = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
  if (methods.data.length > 0) {
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: methods.data[0].id },
    });
    return true;
  }
  return false;
}

async function chargeOffSession(user, amount, bookingId, { description } = {}) {
  const customerId = await ensureCustomer(user);
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  let defaultPm = customer.invoice_settings?.default_payment_method;
  if (!defaultPm) {
    const methods = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
    if (methods.data.length > 0) {
      defaultPm = methods.data[0].id;
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: defaultPm },
      });
    } else {
      const err = new Error('No payment method on file');
      err.code = 'NO_PAYMENT_METHOD';
      throw err;
    }
  }
  const idempotencyKey = `off_${bookingId}_${defaultPm}`;
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    customer: customerId,
    payment_method: defaultPm,
    off_session: true,
    confirm: true,
    description: description || `atyors service — booking ${bookingId}`,
    metadata: { bookingId, userId: user._id?.toString() || user.toString() },
  }, { idempotencyKey });
}

async function listCharges(customerId, limit = 20) {
  const stripe = getStripe();
  const charges = await stripe.charges.list({ customer: customerId, limit });
  return charges.data;
}

async function verifyCardZip(user, paymentMethodId) {
  const customerId = await ensureCustomer(user);
  const stripe = getStripe();
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== customerId) {
    const err = new Error('Payment method does not belong to you');
    err.status = 403;
    throw err;
  }
  const zipCheck = pm.card?.checks?.address_postal_code_check;
  if (zipCheck === 'fail') {
    await stripe.paymentMethods.detach(paymentMethodId);
    return { verified: false, reason: 'zip_mismatch' };
  }
  return { verified: true };
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

async function updateSubscription(stripeSubscriptionId, params) {
  const stripe = getStripe();
  return stripe.subscriptions.update(stripeSubscriptionId, params);
}

async function cancelSubscription(stripeSubscriptionId) {
  const stripe = getStripe();
  return stripe.subscriptions.cancel(stripeSubscriptionId);
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
  updateSubscription,
  cancelSubscription,
  refundPaymentIntent,
  hasDefaultPaymentMethod,
  chargeOffSession,
  listCharges,
  verifyCardZip,
};
