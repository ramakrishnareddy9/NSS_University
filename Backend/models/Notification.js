const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['new-event', 'participation-approved', 'participation-rejected', 'contribution-verified', 'certificate'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  // Add event reference for auto-cleanup
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  // Auto-cleanup timestamp
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

// TTL index for automatic cleanup of expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to clean up expired event notifications
notificationSchema.statics.cleanupExpiredEventNotifications = async function() {
  try {
    const now = new Date();
    
    // Find events that have ended
    const endedEvents = await mongoose.model('Event').find({
      endDate: { $lt: now },
      status: 'published'
    }).select('_id');
    
    if (endedEvents.length > 0) {
      const eventIds = endedEvents.map(event => event._id);
      
      // Mark notifications for ended events as expired
      await this.updateMany(
        {
          type: 'new-event',
          event: { $in: eventIds },
          expiresAt: null
        },
        {
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours after event ends
        }
      );
      
      console.log(`🧹 Marked ${eventIds.length} event notifications for cleanup`);
    }
  } catch (error) {
    console.error('Error cleaning up expired event notifications:', error);
  }
};

module.exports = mongoose.model('Notification', notificationSchema);

