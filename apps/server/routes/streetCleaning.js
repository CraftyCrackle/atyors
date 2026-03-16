const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const validateUpload = require('../middleware/validateUpload');
const Address = require('../models/Address');
const signScanService = require('../services/signScanService');

const sanitizeExt = (name) => path.extname(path.basename(name)).replace(/[^a-zA-Z0-9.]/g, '');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../../uploads')),
  filename: (req, file, cb) => cb(null, `sign-${req.user._id}-${Date.now()}${sanitizeExt(file.originalname)}`),
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

router.post('/scan', authenticate, upload.single('photo'), validateUpload, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No photo uploaded' } });
    }
    if (!signScanService.isConfigured()) {
      return res.status(503).json({ success: false, error: { code: 'NOT_CONFIGURED', message: 'Sign scanning is not available. Please enter details manually.' } });
    }

    const filePath = req.file.path;
    const photoUrl = `/uploads/${req.file.filename}`;

    const schedules = await signScanService.scanSign(filePath);
    schedules.forEach((s) => { s.signPhotoUrl = photoUrl; });

    res.json({ success: true, data: { schedules, photoUrl } });
  } catch (err) {
    next(err);
  }
});

router.post('/:addressId', authenticate, async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.addressId, userId: req.user._id });
    if (!address) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Address not found' } });

    const entry = req.body;
    const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const VALID_PATTERNS = ['every', '1st', '2nd', '3rd', '4th', '1st_and_3rd', '2nd_and_4th'];

    if (!entry.dayOfWeek || !VALID_DAYS.includes(entry.dayOfWeek)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_DAY', message: 'A valid day of week is required' } });
    }
    if (entry.weekPattern && !VALID_PATTERNS.includes(entry.weekPattern)) {
      entry.weekPattern = 'every';
    }

    if (!address.streetCleaning) address.streetCleaning = [];
    address.streetCleaning.push({
      side: entry.side || null,
      dayOfWeek: entry.dayOfWeek,
      weekPattern: entry.weekPattern || 'every',
      startTime: entry.startTime || null,
      endTime: entry.endTime || null,
      seasonStart: entry.seasonStart || null,
      seasonEnd: entry.seasonEnd || null,
      signPhotoUrl: entry.signPhotoUrl || null,
      rawSignText: entry.rawSignText || null,
    });
    await address.save();

    res.json({ success: true, data: { address } });
  } catch (err) {
    next(err);
  }
});

router.get('/:addressId', authenticate, async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.addressId, userId: req.user._id }).select('streetCleaning street');
    if (!address) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Address not found' } });
    res.json({ success: true, data: { schedules: address.streetCleaning || [] } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:addressId/:index', authenticate, async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.addressId, userId: req.user._id });
    if (!address) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Address not found' } });

    const idx = parseInt(req.params.index, 10);
    if (isNaN(idx) || idx < 0 || idx >= (address.streetCleaning?.length || 0)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Schedule entry not found' } });
    }

    const updates = req.body;
    const entry = address.streetCleaning[idx];
    const ALLOWED = ['side', 'dayOfWeek', 'weekPattern', 'startTime', 'endTime', 'seasonStart', 'seasonEnd'];
    for (const key of ALLOWED) {
      if (updates[key] !== undefined) entry[key] = updates[key];
    }
    await address.save();

    res.json({ success: true, data: { address } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:addressId/:index', authenticate, async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.addressId, userId: req.user._id });
    if (!address) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Address not found' } });

    const idx = parseInt(req.params.index, 10);
    if (isNaN(idx) || idx < 0 || idx >= (address.streetCleaning?.length || 0)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Schedule entry not found' } });
    }

    address.streetCleaning.splice(idx, 1);
    await address.save();

    res.json({ success: true, data: { address } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
