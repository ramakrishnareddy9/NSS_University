const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// @route POST /api/v1/fcm/register
// @desc  Register an FCM device token for the authenticated user
// @access Private
router.post('/register', [auth, body('token').trim().notEmpty().withMessage('token is required')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const token = req.body.token;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Ensure token uniqueness
    user.fcmTokens = (user.fcmTokens || []).filter(t => t.token !== token);
    user.fcmTokens.push({ token, createdAt: new Date() });
    await user.save();

    return res.status(201).json({ success: true, data: { token } });
  } catch (err) {
    console.error('FCM register error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route POST /api/v1/fcm/unregister
// @desc  Unregister an FCM device token
// @access Private
router.post('/unregister', [auth, body('token').trim().notEmpty().withMessage('token is required')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const token = req.body.token;
    await User.updateOne({ _id: req.user.id }, { $pull: { fcmTokens: { token } } });
    return res.json({ success: true, data: { token } });
  } catch (err) {
    console.error('FCM unregister error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
