const { fromBuffer } = require('file-type');
const fs = require('fs');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function validateUpload(req, res, next) {
  if (!req.file) return next();

  if (req.file.size > MAX_FILE_SIZE) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: 'File must be under 10MB' },
    });
  }

  try {
    const buffer = fs.readFileSync(req.file.path);
    const type = await fromBuffer(buffer);

    if (!type || !ALLOWED_MIME.has(type.mime)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_FILE_TYPE', message: 'Only JPEG, PNG, WebP, and HEIC images are allowed' },
      });
    }

    next();
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    next(err);
  }
}

module.exports = validateUpload;
