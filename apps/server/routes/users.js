const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const userController = require('../controllers/userController');
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');
const validateUpload = require('../middleware/validateUpload');

const sanitizeExt = (name) => path.extname(path.basename(name)).replace(/[^a-zA-Z0-9.]/g, '');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../../uploads')),
  filename: (req, file, cb) => cb(null, `profile-${req.user._id}-${Date.now()}${sanitizeExt(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|heic/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.replace('image/', ''));
    cb(null, ext || mime);
  },
});

router.get('/me', authenticate, userController.getProfile);
router.patch('/me', authenticate, userController.updateProfile);
router.post('/me/photo', authenticate, upload.single('photo'), validateUpload, userController.uploadPhoto);
router.get('/:id/reviews', authenticate, reviewController.getByUser);

module.exports = router;
