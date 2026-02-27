const router = require('express').Router();
const serviceController = require('../controllers/serviceController');
const pricingService = require('../services/pricingService');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/categories', serviceController.getCategories);
router.get('/types/:categorySlug', serviceController.getTypes);
router.post('/seed', authenticate, requireRole('admin', 'superadmin'), serviceController.seed);

router.get('/pricing', (req, res) => {
  res.json({
    success: true,
    data: {
      perBarrel: pricingService.PRICE_PER_BARREL,
      monthlyBase: pricingService.MONTHLY_BASE,
      monthlyBaseBoth: pricingService.MONTHLY_BASE_BOTH,
      monthlyIncludedBarrels: pricingService.MONTHLY_INCLUDED_BARRELS,
      extraBarrelMonthly: pricingService.EXTRA_BARREL_MONTHLY,
    },
  });
});

module.exports = router;
