const User = require('../models/User');

async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user._id).populate('addresses').select('-__v -passwordHash');
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const allowed = ['firstName', 'lastName', 'phone', 'defaultAddressId', 'notificationPreferences'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-__v -passwordHash');
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

async function uploadPhoto(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No photo uploaded' } });
    }
    const photoUrl = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePhotoUrl: photoUrl },
      { new: true }
    ).select('-__v -passwordHash');
    res.json({ success: true, data: { user, photoUrl } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, uploadPhoto };
