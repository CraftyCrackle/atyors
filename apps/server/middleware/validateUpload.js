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

async function validateSingleFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    fs.unlink(file.path, () => {});
    return 'File must be under 10MB';
  }

  const buffer = fs.readFileSync(file.path);
  const type = await fromBuffer(buffer);

  if (!type || !ALLOWED_MIME.has(type.mime)) {
    fs.unlink(file.path, () => {});
    return 'Only JPEG, PNG, WebP, and HEIC images are allowed';
  }

  return null;
}

async function validateUpload(req, res, next) {
  const files = req.files || (req.file ? [req.file] : []);
  if (files.length === 0) return next();

  try {
    for (const file of files) {
      const error = await validateSingleFile(file);
      if (error) {
        for (const f of files) {
          if (f !== file && f.path) fs.unlink(f.path, () => {});
        }
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_FILE', message: error },
        });
      }
    }
    next();
  } catch (err) {
    for (const f of files) {
      if (f.path) fs.unlink(f.path, () => {});
    }
    next(err);
  }
}

module.exports = validateUpload;
