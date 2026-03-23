const router = require('express').Router();
const serviceController = require('../controllers/serviceController');
const pricingService = require('../services/pricingService');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/categories', serviceController.getCategories);
router.get('/all-types', serviceController.getAllTypes);
router.get('/types/:categorySlug', serviceController.getTypes);
router.post('/seed', authenticate, requireRole('admin', 'superadmin'), serviceController.seed);

router.get('/check-zipcode', async (req, res, next) => {
  try {
    const { zip } = req.query;
    if (!zip || !/^\d{5}$/.test(zip.trim())) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ZIPCODE', message: 'A valid 5-digit zipcode is required' } });
    }
    const AppSettings = require('../models/AppSettings');
    const settings = await AppSettings.get();
    const served = settings.servedZipcodes.includes(zip.trim());
    res.json({ success: true, data: { zipcode: zip.trim(), served } });
  } catch (err) { next(err); }
});

router.get('/pricing', (req, res) => {
  res.json({
    success: true,
    data: {
      perBarrel: pricingService.PRICE_PER_BARREL,
      perBarrelBoth: pricingService.PRICE_PER_BARREL_BOTH_TOTAL,
      perBarrelBothLeg: pricingService.PRICE_PER_BARREL_BOTH_LEG,
      monthlyBase: pricingService.MONTHLY_BASE,
      monthlyBaseBoth: pricingService.MONTHLY_BASE_BOTH,
      monthlyIncludedBarrels: pricingService.MONTHLY_INCLUDED_BARRELS,
      extraBarrelMonthly: pricingService.EXTRA_BARREL_MONTHLY,
      curbItemPrice: pricingService.CURB_ITEM_PRICE,
      entranceCleaningPerFloor: pricingService.ENTRANCE_CLEANING_PER_FLOOR,
      entranceCleaningPerStaircase: pricingService.ENTRANCE_CLEANING_PER_STAIRCASE,
      entranceCleaningEntranceFee: pricingService.ENTRANCE_CLEANING_ENTRANCE_FEE,
    },
  });
});

module.exports = router;
