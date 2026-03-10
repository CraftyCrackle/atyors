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
    const allowed = ['firstName', 'lastName', 'phone', 'defaultAddressId', 'notificationPreferences', 'trashDayReminder'];
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

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Current and new password are required' } });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: 'New password must be at least 8 characters' } });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, error: { code: 'SAME_PASSWORD', message: 'New password must be different from current password' } });
    }

    const bcrypt = require('bcryptjs');
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ success: true, data: { message: 'Password updated successfully' } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, uploadPhoto, changePassword };
