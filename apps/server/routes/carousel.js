const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, requireRole } = require('../middleware/auth');
const validateUpload = require('../middleware/validateUpload');
const CarouselImage = require('../models/CarouselImage');

const sanitizeExt = (name) => path.extname(path.basename(name)).replace(/[^a-zA-Z0-9.]/g, '');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../../uploads')),
  filename: (req, file, cb) => cb(null, `carousel-${Date.now()}-${Math.random().toString(36).slice(2)}${sanitizeExt(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.replace('image/', ''));
    cb(null, ext || mime);
  },
});

// Public: list active images
router.get('/', async (req, res, next) => {
  try {
    const images = await CarouselImage.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 });
    res.json({ success: true, data: { images } });
  } catch (err) { next(err); }
});

// Admin: list all images (including inactive)
router.get('/all', authenticate, requireRole('admin', 'superadmin'), async (req, res, next) => {
  try {
    const images = await CarouselImage.find().sort({ sortOrder: 1, createdAt: 1 }).populate('uploadedBy', 'firstName lastName email');
    res.json({ success: true, data: { images } });
  } catch (err) { next(err); }
});

// Admin: upload image
router.post('/', authenticate, requireRole('admin', 'superadmin'), upload.single('image'), validateUpload, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'Image file is required' } });
    }
    const count = await CarouselImage.countDocuments();
    const image = await CarouselImage.create({
      url: `/uploads/${req.file.filename}`,
      caption: req.body.caption?.trim() || '',
      sortOrder: count,
      uploadedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: { image } });
  } catch (err) { next(err); }
});

// Admin: reorder — accepts array of { id, sortOrder }
router.patch('/reorder', authenticate, requireRole('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_BODY', message: 'order must be an array' } });
    }
    await Promise.all(order.map(({ id, sortOrder }) =>
      CarouselImage.findByIdAndUpdate(id, { sortOrder: Number(sortOrder) })
    ));
    const images = await CarouselImage.find().sort({ sortOrder: 1, createdAt: 1 });
    res.json({ success: true, data: { images } });
  } catch (err) { next(err); }
});

// Admin: update caption / active state
router.patch('/:id', authenticate, requireRole('admin', 'superadmin'), async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.caption !== undefined) updates.caption = req.body.caption.trim();
    if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);
    const image = await CarouselImage.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!image) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Image not found' } });
    res.json({ success: true, data: { image } });
  } catch (err) { next(err); }
});

// Admin: delete image (removes file from disk too)
router.delete('/:id', authenticate, requireRole('admin', 'superadmin'), async (req, res, next) => {
  try {
    const image = await CarouselImage.findByIdAndDelete(req.params.id);
    if (!image) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Image not found' } });
    const filePath = path.join(__dirname, '../../../', image.url);
    fs.unlink(filePath, () => {});
    res.json({ success: true, data: { message: 'Image deleted' } });
  } catch (err) { next(err); }
});

module.exports = router;
