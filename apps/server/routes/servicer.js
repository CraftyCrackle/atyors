const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const servicerController = require('../controllers/servicerController');
const routeController = require('../controllers/routeController');
const { authenticate, requireRole } = require('../middleware/auth');
const validateUpload = require('../middleware/validateUpload');

const sanitizeExt = (name) => path.extname(path.basename(name)).replace(/[^a-zA-Z0-9.]/g, '');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../../uploads')),
  filename: (req, file, cb) => cb(null, `completion-${req.user._id}-${Date.now()}${sanitizeExt(file.originalname)}`),
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

router.use(authenticate, requireRole('servicer', 'admin', 'superadmin'));

router.get('/jobs/available', servicerController.getAvailableJobs);
router.get('/jobs/mine', servicerController.getMyJobs);
router.get('/jobs/:id', servicerController.getJobDetail);
router.post('/jobs/:id/accept', servicerController.acceptJob);
router.patch('/jobs/:id/status', servicerController.updateJobStatus);
router.post('/jobs/:id/complete', upload.single('photo'), validateUpload, servicerController.completeWithPhoto);

router.get('/earnings', servicerController.getEarnings);

router.post('/routes', routeController.createRoute);
router.get('/routes/active', routeController.getActiveRoute);
router.get('/routes/planned', routeController.getPlannedRoute);
router.patch('/routes/:id/start', routeController.startRoute);
router.patch('/routes/:id/mark-arrived', routeController.markArrived);
router.patch('/routes/:id/complete-stop', routeController.completeStop);
router.patch('/routes/:id/skip-stop', routeController.skipStop);

module.exports = router;
