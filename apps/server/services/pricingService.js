const PRICE_PER_BARREL = 1.50;
const MONTHLY_BASE = 24;
const MONTHLY_BASE_BOTH = 24;
const MONTHLY_INCLUDED_BARRELS = 3;
const EXTRA_BARREL_MONTHLY = 2;

const CURB_ITEM_PRICE = 0.80;

function calculateOneTimePrice(barrelCount) {
  return PRICE_PER_BARREL * barrelCount;
}

function calculateMonthlyPrice(barrelCount) {
  const extraBarrels = Math.max(0, barrelCount - MONTHLY_INCLUDED_BARRELS);
  return MONTHLY_BASE + (extraBarrels * EXTRA_BARREL_MONTHLY);
}

function calculateMonthlyPriceBoth(barrelCount) {
  const extraBarrels = Math.max(0, barrelCount - MONTHLY_INCLUDED_BARRELS);
  return MONTHLY_BASE_BOTH + (extraBarrels * EXTRA_BARREL_MONTHLY * 2);
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
  calculateOneTimePrice,
  calculateCurbItemPrice,
  calculateMonthlyPrice,
  calculateMonthlyPriceBoth,
};
