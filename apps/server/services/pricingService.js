const PRICE_PER_BARREL = 1.50;
const MONTHLY_BASE = 15;
const MONTHLY_BASE_BOTH = 25;
const MONTHLY_INCLUDED_BARRELS = 3;
const EXTRA_BARREL_MONTHLY = 2;

const CURB_ITEM_PRICE = 0.80;

const SUBSCRIPTION_DISCOUNT_STANDARD = 1;
const SUBSCRIPTION_DISCOUNT_LARGE = 2;
const SUBSCRIPTION_DISCOUNT_THRESHOLD = 3;

function calculateOneTimePrice(barrelCount) {
  return PRICE_PER_BARREL * barrelCount;
}

function calculateSubscriptionDiscount(barrelCount) {
  return barrelCount <= SUBSCRIPTION_DISCOUNT_THRESHOLD
    ? SUBSCRIPTION_DISCOUNT_STANDARD
    : SUBSCRIPTION_DISCOUNT_LARGE;
}

function calculateMonthlyPrice(barrelCount) {
  const extraBarrels = Math.max(0, barrelCount - MONTHLY_INCLUDED_BARRELS);
  return MONTHLY_BASE + (extraBarrels * EXTRA_BARREL_MONTHLY);
}

function calculateMonthlyPriceBoth(barrelCount) {
  const extraBarrels = Math.max(0, barrelCount - MONTHLY_INCLUDED_BARRELS);
  return MONTHLY_BASE_BOTH + (extraBarrels * EXTRA_BARREL_MONTHLY * 2);
}

function calculateMonthlyPriceWithDiscount(barrelCount) {
  return calculateMonthlyPrice(barrelCount) - calculateSubscriptionDiscount(barrelCount);
}

function calculateMonthlyPriceBothWithDiscount(barrelCount) {
  return calculateMonthlyPriceBoth(barrelCount) - calculateSubscriptionDiscount(barrelCount);
}

function calculateCurbItemPrice(itemCount) {
  return CURB_ITEM_PRICE * itemCount;
}

module.exports = {
  PRICE_PER_BARREL,
  CURB_ITEM_PRICE,
  MONTHLY_BASE,
  MONTHLY_BASE_BOTH,
  MONTHLY_INCLUDED_BARRELS,
  EXTRA_BARREL_MONTHLY,
  SUBSCRIPTION_DISCOUNT_STANDARD,
  SUBSCRIPTION_DISCOUNT_LARGE,
  SUBSCRIPTION_DISCOUNT_THRESHOLD,
  calculateOneTimePrice,
  calculateCurbItemPrice,
  calculateSubscriptionDiscount,
  calculateMonthlyPrice,
  calculateMonthlyPriceBoth,
  calculateMonthlyPriceWithDiscount,
  calculateMonthlyPriceBothWithDiscount,
};
