const router = require('express').Router();
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, bookingController.create);
router.get('/', authenticate, bookingController.list);
router.get('/:id', authenticate, bookingController.getById);
router.patch('/:id/cancel', authenticate, bookingController.cancel);
router.patch('/:id/reschedule', authenticate, bookingController.reschedule);

module.exports = router;
