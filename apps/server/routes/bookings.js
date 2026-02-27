const router = require('express').Router();
const bookingController = require('../controllers/bookingController');
const messageController = require('../controllers/messageController');
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, bookingController.create);
router.get('/', authenticate, bookingController.list);
router.get('/messages/unread', authenticate, messageController.unreadCount);
router.get('/my-reviews', authenticate, reviewController.getMyReviews);
router.get('/:id', authenticate, bookingController.getById);
router.get('/:id/queue', authenticate, bookingController.getQueuePosition);
router.post('/:id/confirm-payment', authenticate, bookingController.confirmPayment);
router.patch('/:id/cancel', authenticate, bookingController.cancel);
router.patch('/:id/reschedule', authenticate, bookingController.reschedule);

router.get('/:id/messages', authenticate, messageController.list);
router.post('/:id/messages', authenticate, messageController.send);
router.get('/:id/reviews', authenticate, reviewController.getByBooking);
router.post('/:id/review', authenticate, reviewController.create);

module.exports = router;
