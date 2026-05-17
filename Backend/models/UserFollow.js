const mongoose = require('mongoose');

const userFollowSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index to prevent duplicate follows
userFollowSchema.index({ follower: 1, following: 1 }, { unique: true });

// Index to quickly find all followers of a user
userFollowSchema.index({ following: 1 });

// Index to quickly find all users someone is following
userFollowSchema.index({ follower: 1 });

module.exports = mongoose.model('UserFollow', userFollowSchema);
