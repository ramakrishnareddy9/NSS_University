const express = require('express');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const redis = require('../config/redis');

const router = express.Router();

// @route   GET /api/notifications-api
// @desc    Get user's notifications with filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { unreadOnly, limit = 50, page = 1, type } = req.query;
    const skip = (page - 1) * limit;
    
    const query = { user: req.user._id };
    if (unreadOnly === 'true') {
      query.read = false;
    }
    if (type) {
      query.type = type;
    }
    query.isDeleted = { $ne: true };

    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .populate('event', 'title startDate endDate location eventType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({ 
      user: req.user._id, 
      read: false,
      isDeleted: { $ne: true }
    });

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/notifications-api/counts
// @desc    Get unread notification counts by type
// @access  Private
router.get('/counts', auth, async (req, res) => {
  try {
    const counts = await Notification.aggregate([
      {
        $match: {
          user: req.user._id,
          read: false,
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const total = await Notification.countDocuments({
      user: req.user.id,
      read: false,
      isDeleted: { $ne: true }
    });
    
    const countMap = {};
    counts.forEach(c => {
      countMap[c._id] = c.count;
    });
    
    res.json({
      total,
      byType: countMap
    });
  } catch (error) {
    console.error('Get notification counts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/notifications-api/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: { $ne: true }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    try {
      await redis.del(`notifications:${req.user._id}:counts`);
    } catch (cacheErr) {
      console.warn('Cache invalidation failed after marking notification read:', cacheErr.message);
    }

    res.json(notification);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/notifications-api/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', auth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, read: false, isDeleted: { $ne: true } },
      { read: true, readAt: new Date() }
    );

    try {
      await redis.del(`notifications:${req.user._id}:counts`);
    } catch (cacheErr) {
      console.warn('Cache invalidation failed after mark-all-read:', cacheErr.message);
    }

    res.json({ 
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/notifications-api/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: { $ne: true }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    try {
      await redis.del(`notifications:${req.user._id}:counts`);
    } catch (cacheErr) {
      console.warn('Cache invalidation failed after notification delete:', cacheErr.message);
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/notifications-api/preferences
// @desc    Get user notification preferences
// @access  Private
router.get('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.notificationPreferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/notifications-api/preferences
// @desc    Update user notification preferences
// @access  Private
router.put('/preferences', auth, async (req, res) => {
  try {
    const { emailNotifications, pushNotifications, inAppNotifications } = req.body;
    
    const updates = {};
    if (emailNotifications !== undefined) {
      updates['notificationPreferences.emailNotifications'] = emailNotifications;
    }
    if (pushNotifications !== undefined) {
      updates['notificationPreferences.pushNotifications'] = pushNotifications;
    }
    if (inAppNotifications !== undefined) {
      updates['notificationPreferences.inAppNotifications'] = inAppNotifications;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    ).select('notificationPreferences');

    try {
      await redis.del(`notifications:${req.user._id}:preferences`);
    } catch (cacheErr) {
      console.warn('Cache invalidation failed after preference update:', cacheErr.message);
    }
    
    res.json({
      message: 'Notification preferences updated',
      preferences: user.notificationPreferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

