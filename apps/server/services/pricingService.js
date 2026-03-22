const PRICE_PER_BARREL = 2.5;
/** Total per barrel for both put-out + bring-in (one-time); each linked booking uses half. */
const PRICE_PER_BARREL_BOTH_TOTAL = 4.0;
const PRICE_PER_BARREL_BOTH_LEG = PRICE_PER_BARREL_BOTH_TOTAL / 2;

const MONTHLY_BASE = 30;
const MONTHLY_BASE_BOTH = 30;
const MONTHLY_INCLUDED_BARRELS = 3;
const EXTRA_BARREL_MONTHLY = 3;

const CURB_ITEM_PRICE = 2.0;

function calculateOneTimePrice(barrelCount) {
  return PRICE_PER_BARREL * barrelCount;
}

/** Per linked booking amount when customer books "both" (put-out + bring-in). */
function calculateOneTimePriceBothLeg(barrelCount) {
  return PRICE_PER_BARREL_BOTH_LEG * barrelCount;
}

function calculateMonthlyPrice(barrelCount) {
  const extraBarrels = Math.max(0, barrelCount - MONTHLY_INCLUDED_BARRELS);
  return MONTHLY_BASE + (extraBarrels * EXTRA_BARREL_MONTHLY);
}

function calculateMonthlyPriceBoth(barrelCount) {
  const extraBarrels = Math.max(0, barrelCount - MONTHLY_INCLUDED_BARRELS);
  return MONTHLY_BASE_BOTH + (extraBarrels * EXTRA_BARREL_MONTHLY);
}

function calculateCurbItemPrice(itemCount) {
  return CURB_ITEM_PRICE * itemCount;
}

module.exports = {
  PRICE_PER_BARREL,
  PRICE_PER_BARREL_BOTH_TOTAL,
  PRICE_PER_BARREL_BOTH_LEG,
  CURB_ITEM_PRICE,
  MONTHLY_BASE,
  MONTHLY_BASE_BOTH,
  MONTHLY_INCLUDED_BARRELS,
  EXTRA_BARREL_MONTHLY,
  calculateOneTimePrice,
  calculateOneTimePriceBothLeg,
  calculateCurbItemPrice,
  calculateMonthlyPrice,
  calculateMonthlyPriceBoth,
};
