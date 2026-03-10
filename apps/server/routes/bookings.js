const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const bookingController = require('../controllers/bookingController');
const messageController = require('../controllers/messageController');
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');
const validateUpload = require('../middleware/validateUpload');

const sanitizeExt = (name) => path.extname(path.basename(name)).replace(/[^a-zA-Z0-9.]/g, '');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../../uploads')),
  filename: (req, file, cb) => cb(null, `curb-item-${req.user._id}-${Date.now()}${sanitizeExt(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|heic/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.replace('image/', ''));
    cb(null, ext || mime);
  },
});

router.post('/', authenticate, bookingController.create);
router.get('/', authenticate, bookingController.list);
router.get('/capacity', authenticate, bookingController.checkCapacity);
router.get('/messages/unread', authenticate, messageController.unreadCount);
router.get('/my-reviews', authenticate, reviewController.getMyReviews);
router.get('/:id', authenticate, bookingController.getById);
router.get('/:id/queue', authenticate, bookingController.getQueuePosition);
router.post('/:id/confirm-payment', authenticate, bookingController.confirmPayment);
router.post('/upload-curb-photos', authenticate, upload.array('photos', 5), validateUpload, bookingController.uploadCurbItemPhotos);
router.patch('/:id/cancel', authenticate, bookingController.cancel);
router.patch('/:id/reschedule', authenticate, bookingController.reschedule);

router.get('/:id/messages', authenticate, messageController.list);
router.post('/:id/messages', authenticate, messageController.send);
router.get('/:id/reviews', authenticate, reviewController.getByBooking);
router.post('/:id/review', authenticate, reviewController.create);

module.exports = router;
