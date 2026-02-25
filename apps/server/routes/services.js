const router = require('express').Router();
const serviceController = require('../controllers/serviceController');

router.get('/categories', serviceController.getCategories);
router.get('/types/:categorySlug', serviceController.getTypes);
router.post('/seed', serviceController.seed);

module.exports = router;
